const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const load = require('./load-source.cjs');
const { initializeDatabase, SCHEMA_V1 } = load('src/database/schema.js');
const { createFridgeRepository } = load('src/repositories/fridgeRepository.js');

// Real SQLite engine exposed through Expo's async method signatures.
function open(filename = ':memory:') {
  const native = new DatabaseSync(filename);
  const db = {
    native,
    execAsync: async sql => native.exec(sql),
    runAsync: async (sql, ...params) => {
      const result = native.prepare(sql).run(...params);
      return { changes: result.changes, lastInsertRowId: result.lastInsertRowid };
    },
    getAllAsync: async (sql, ...params) => native.prepare(sql).all(...params),
    getFirstAsync: async (sql, ...params) => native.prepare(sql).get(...params),
    async withTransactionAsync(action) {
      native.exec('BEGIN');
      try { await action(); native.exec('COMMIT'); }
      catch (error) { native.exec('ROLLBACK'); throw error; }
    },
  };
  return db;
}
const food = changes => ({ name: 'Sữa tươi', quantity: '2', unit: 'hộp', storageAreaId: 'cool', buyDate: '12/11/2026', expDate: '15/11/2026', ...changes });

test('CRUD survives closing and reopening a database; deleted food stays deleted', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'fridgechef-test-'));
  const filename = join(directory, 'fridge.db');
  let db = open(filename);
  try {
    await initializeDatabase(db);
    let repo = createFridgeRepository(db);
    assert.equal((await repo.getSnapshot()).foods.length, 0);
    const id = await repo.saveFood(food());
    await repo.saveFood(food({ quantity: '3', storageAreaId: 'frozen', category: 'dairy', notes: 'Đã mở hộp, để kệ trên.' }), id);
    db.native.close();
    db = open(filename);
    await initializeDatabase(db);
    repo = createFridgeRepository(db);
    const result = (await repo.getSnapshot()).foods;
    assert.equal(result.length, 1);
    assert.equal(result[0].quantity, 3);
    assert.equal(result[0].storageAreaId, 'frozen');
    assert.equal(result[0].category, 'dairy');
    assert.equal(result[0].notes, 'Đã mở hộp, để kệ trên.');
    assert.equal(result[0].expiresAt, '2026-11-15');
    assert.ok(result[0].createdAt);
    await repo.deleteFood(id);
    db.native.close();
    db = open(filename);
    await initializeDatabase(db);
    assert.equal((await createFridgeRepository(db).getSnapshot()).foods.length, 0);
  } finally { db.native.close(); rmSync(directory, { recursive: true }); }
});

test('database foreign keys and quantity constraints are enforced', async () => {
  const db = open();
  try {
    await initializeDatabase(db);
    assert.equal((await db.getFirstAsync('PRAGMA foreign_keys')).foreign_keys, 1);
    await assert.rejects(db.runAsync('INSERT INTO food_items(name,quantity,unit,storageAreaId,purchasedAt,expiresAt) VALUES (?,?,?,?,?,?)', 'a', 1, 'g', 'missing', '2026-01-01', '2026-01-02'), /FOREIGN KEY/);
    await assert.rejects(db.runAsync('INSERT INTO shopping_items(name,quantity,unit) VALUES (?,?,?)', 'a', 0, 'g'), /CHECK/);
  } finally { db.native.close(); }
});

test('bound SQL parameters preserve names containing quotes and SQL text', async () => {
  const db = open();
  try {
    await initializeDatabase(db);
    const repo = createFridgeRepository(db);
    const name = "Chef's milk'); DROP TABLE food_items; --";
    await repo.saveFood(food({ name }));
    assert.equal((await repo.getSnapshot()).foods[0].name, name);
    await repo.saveFood(food());
    assert.equal((await repo.getSnapshot()).foods.length, 2);
  } finally { db.native.close(); }
});

test('shopping CRUD, checked state and atomic transfer use real persisted data', async () => {
  const db = open();
  try {
    await initializeDatabase(db);
    const repo = createFridgeRepository(db);
    const id = await repo.saveShopping({ name: 'Sữa', quantity: '1', unit: 'hộp' });
    await repo.saveShopping({ name: 'Sữa tươi', quantity: '2', unit: 'hộp' }, id);
    await repo.setBought(id, true);
    assert.equal((await repo.getSnapshot()).shopping[0].bought, true);
    const count = await repo.moveBoughtToFridge({ storageAreaId: 'cool', buyDate: '12/11/2026', expDate: '15/11/2026' });
    assert.equal(count, 1);
    const snapshot = await repo.getSnapshot();
    assert.equal(snapshot.foods[0].quantity, 2);
    assert.equal(snapshot.shopping.length, 0);
    await assert.rejects(repo.moveBoughtToFridge({ storageAreaId: 'cool', buyDate: '12/11/2026', expDate: '15/11/2026' }), /ít nhất/);
    const remaining = await repo.saveShopping({ name: 'Gạo', quantity: '2', unit: 'kg' });
    await repo.deleteShopping(remaining);
    assert.equal((await repo.getSnapshot()).shopping.length, 0);
  } finally { db.native.close(); }
});

test('a failure halfway through transfer rolls back inserts AND shopping deletions', async () => {
  const db = open();
  try {
    await initializeDatabase(db);
    const repo = createFridgeRepository(db);
    for (const name of ['Món tốt', 'Món lỗi']) {
      const id = await repo.saveShopping({ name, quantity: '1', unit: 'hộp' });
      await repo.setBought(id, true);
    }
    await db.execAsync("CREATE TRIGGER reject_test_food BEFORE INSERT ON food_items WHEN NEW.name='Món lỗi' BEGIN SELECT RAISE(ABORT,'test disk failure'); END;");
    await assert.rejects(repo.moveBoughtToFridge({ storageAreaId: 'cool', buyDate: '12/11/2026', expDate: '15/11/2026' }), /test disk failure/);
    const snapshot = await repo.getSnapshot();
    assert.equal(snapshot.foods.length, 0);
    assert.equal(snapshot.shopping.length, 2);
    assert.ok(snapshot.shopping.every(item => item.bought));
  } finally { db.native.close(); }
});

test('concurrent transfer requests do not duplicate purchased items', async () => {
  const db = open();
  try {
    await initializeDatabase(db);
    const repo = createFridgeRepository(db);
    const id = await repo.saveShopping({ name: 'Gạo', quantity: 1, unit: 'kg' });
    await repo.setBought(id, true);
    const input = { storageAreaId: 'dry', buyDate: '12/11/2026', expDate: '15/11/2026' };
    const outcomes = await Promise.allSettled([repo.moveBoughtToFridge(input), repo.moveBoughtToFridge(input)]);
    assert.equal(outcomes.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal((await repo.getSnapshot()).foods.length, 1);
  } finally { db.native.close(); }
});

test('missing records give errors and the write queue recovers from failure', async () => {
  const db = open();
  try {
    await initializeDatabase(db);
    const repo = createFridgeRepository(db);
    await assert.rejects(repo.saveFood(food(), 999), /không còn tồn tại/);
    await assert.rejects(repo.deleteFood(999), /không còn tồn tại/);
    await assert.rejects(repo.saveFood(food({ quantity: '-1' })), /Số lượng/);
    await repo.saveFood(food());
    assert.equal((await repo.getSnapshot()).foods.length, 1);
  } finally { db.native.close(); }
});

test('migrations are repeatable and do not downgrade newer databases', async () => {
  const db = open();
  try {
    await initializeDatabase(db);
    await initializeDatabase(db);
    assert.equal((await db.getAllAsync('SELECT * FROM storage_areas')).length, 3);
    await db.execAsync('PRAGMA user_version=3');
    await assert.rejects(initializeDatabase(db), /mới hơn/);
  } finally { db.native.close(); }
});

test('upgrading a version 1 database preserves existing food and shopping records', async () => {
  const db = open();
  try {
    await db.execAsync(SCHEMA_V1);
    await db.runAsync('INSERT INTO food_items(name,quantity,unit,storageAreaId,purchasedAt,expiresAt) VALUES (?,?,?,?,?,?)', 'Sữa cũ', 2, 'hộp', 'cool', '2026-11-12', '2026-11-15');
    await db.runAsync('INSERT INTO shopping_items(name,quantity,unit,bought) VALUES (?,?,?,?)', 'Gạo', 1, 'kg', 1);
    await initializeDatabase(db);
    await initializeDatabase(db);
    const data = await createFridgeRepository(db).getSnapshot();
    assert.equal(data.foods.length, 1);
    assert.equal(data.foods[0].name, 'Sữa cũ');
    assert.equal(data.foods[0].quantity, 2);
    assert.equal(data.foods[0].category, 'other');
    assert.equal(data.foods[0].notes, '');
    assert.equal(data.shopping[0].bought, true);
    assert.equal((await db.getFirstAsync('PRAGMA user_version')).user_version, 2);
  } finally { db.native.close(); }
});

test('invalid optional metadata is rejected without modifying the saved food', async () => {
  const db = open();
  try {
    await initializeDatabase(db);
    const repo = createFridgeRepository(db);
    const id = await repo.saveFood(food({ notes: 'Giữ nguyên', category: 'dairy' }));
    await assert.rejects(repo.saveFood(food({ notes: 'x'.repeat(501) }), id), /500/);
    await assert.rejects(repo.saveFood(food({ category: 'missing' }), id), /Nhóm/);
    const saved = (await repo.getSnapshot()).foods[0];
    assert.equal(saved.notes, 'Giữ nguyên');
    assert.equal(saved.category, 'dairy');
  } finally { db.native.close(); }
});

test('each purchased item keeps its own actual quantity, storage area and expiry', async () => {
  const db = open();
  try {
    await initializeDatabase(db);
    const repo = createFridgeRepository(db);
    const eggs = await repo.saveShopping({ name: 'Trứng gà', quantity: 6, unit: 'quả' });
    const chicken = await repo.saveShopping({ name: 'Thịt gà', quantity: 500, unit: 'g' });
    const rice = await repo.saveShopping({ name: 'Gạo', quantity: 2, unit: 'kg' });
    await repo.setBought(eggs, true);
    await repo.setBought(chicken, true);
    const count = await repo.moveBoughtToFridge({ entries: [
      { shoppingId: eggs, quantity: '10', storageAreaId: 'cool', buyDate: '12/11/2026', expDate: '20/11/2026' },
      { shoppingId: chicken, quantity: '450', storageAreaId: 'frozen', buyDate: '12/11/2026', expDate: '30/11/2026' },
    ] });
    assert.equal(count, 2);
    const data = await repo.getSnapshot();
    assert.equal(data.foods.find(item => item.name === 'Trứng gà').quantity, 10);
    assert.equal(data.foods.find(item => item.name === 'Trứng gà').expiresAt, '2026-11-20');
    assert.equal(data.foods.find(item => item.name === 'Thịt gà').quantity, 450);
    assert.equal(data.foods.find(item => item.name === 'Thịt gà').storageAreaId, 'frozen');
    assert.equal(data.foods.find(item => item.name === 'Thịt gà').expiresAt, '2026-11-30');
    assert.equal(data.shopping.length, 1);
    assert.equal(data.shopping[0].id, rice);
  } finally { db.native.close(); }
});

test('transferring one item leaves other checked items in the shopping list', async () => {
  const db = open();
  try {
    await initializeDatabase(db);
    const repo = createFridgeRepository(db);
    const first = await repo.saveShopping({ name: 'A', quantity: 1, unit: 'hộp' });
    const second = await repo.saveShopping({ name: 'B', quantity: 1, unit: 'hộp' });
    await repo.setBought(first, true);
    await repo.setBought(second, true);
    await repo.moveBoughtToFridge({ entries: [{ shoppingId: first, storageAreaId: 'cool', buyDate: '12/11/2026', expDate: '15/11/2026' }] });
    const data = await repo.getSnapshot();
    assert.equal(data.foods.length, 1);
    assert.equal(data.shopping.length, 1);
    assert.equal(data.shopping[0].id, second);
    assert.equal(data.shopping[0].bought, true);
  } finally { db.native.close(); }
});

test('invalid per-item expiry leaves all shopping items intact', async () => {
  const db = open();
  try {
    await initializeDatabase(db);
    const repo = createFridgeRepository(db);
    const ids = [];
    for (const name of ['Trứng', 'Sữa']) {
      const id = await repo.saveShopping({ name, quantity: 1, unit: 'hộp' });
      await repo.setBought(id, true); ids.push(id);
    }
    await assert.rejects(repo.moveBoughtToFridge({ entries: ids.map((id, index) => ({ shoppingId: id, storageAreaId: 'cool', buyDate: '12/11/2026', expDate: index ? '' : '15/11/2026' })) }), /Sữa/);
    const data = await repo.getSnapshot();
    assert.equal(data.foods.length, 0);
    assert.equal(data.shopping.length, 2);
  } finally { db.native.close(); }
});

test('duplicate and stale transfer IDs cannot duplicate food or delete shopping rows', async () => {
  const db = open();
  try {
    await initializeDatabase(db);
    const repo = createFridgeRepository(db);
    const id = await repo.saveShopping({ name: 'Sữa', quantity: 1, unit: 'hộp' });
    await repo.setBought(id, true);
    const entry = { shoppingId: id, storageAreaId: 'cool', buyDate: '12/11/2026', expDate: '15/11/2026' };
    await assert.rejects(repo.moveBoughtToFridge({ entries: [entry, entry] }), /lặp/);
    await assert.rejects(repo.moveBoughtToFridge({ entries: [{ ...entry, shoppingId: 999 }] }), /không còn/);
    const data = await repo.getSnapshot();
    assert.equal(data.foods.length, 0);
    assert.equal(data.shopping.length, 1);
  } finally { db.native.close(); }
});
