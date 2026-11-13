import { validateFood, validateShopping, todayISO, formatDate } from '../models/food.js';

// The injected database keeps SQL out of Views and makes real SQLite tests possible.
export function createFridgeRepository(db) {
  // Serialize mutations so transaction statements cannot accidentally interleave.
  let queue = Promise.resolve();
  const write = action => {
    const result = queue.then(action);
    queue = result.catch(() => {});
    return result;
  };
  const insertFood = async data => db.runAsync(
    'INSERT INTO food_items(name,quantity,unit,storageAreaId,purchasedAt,expiresAt,category,notes) VALUES (?,?,?,?,?,?,?,?)',
    data.name, data.quantity, data.unit, data.storageAreaId, data.purchasedAt, data.expiresAt, data.category, data.notes,
  );
  const requireChange = result => {
    if (!result.changes) throw new Error('Mục này không còn tồn tại. Vui lòng tải lại danh sách.');
  };
  return {
    async getSnapshot() {
      await queue;
      const foods = await db.getAllAsync('SELECT * FROM food_items ORDER BY expiresAt, id DESC');
      const shopping = await db.getAllAsync('SELECT * FROM shopping_items ORDER BY bought, id DESC');
      return { foods, shopping: shopping.map(item => ({ ...item, bought: Boolean(item.bought) })) };
    },
    saveFood(input, id) {
      return write(async () => {
        const data = validateFood(input);
        if (id != null) {
          requireChange(await db.runAsync(
            "UPDATE food_items SET name=?,quantity=?,unit=?,storageAreaId=?,purchasedAt=?,expiresAt=?,category=?,notes=?,updatedAt=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?",
            data.name, data.quantity, data.unit, data.storageAreaId, data.purchasedAt, data.expiresAt, data.category, data.notes, id,
          ));
          return id;
        }
        return (await insertFood(data)).lastInsertRowId;
      });
    },
    deleteFood(id) {
      return write(async () => { requireChange(await db.runAsync('DELETE FROM food_items WHERE id=?', id)); });
    },
    saveShopping(input, id) {
      return write(async () => {
        const data = validateShopping(input);
        if (id != null) {
          requireChange(await db.runAsync(
            "UPDATE shopping_items SET name=?,quantity=?,unit=?,updatedAt=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?",
            data.name, data.quantity, data.unit, id,
          ));
          return id;
        }
        return (await db.runAsync('INSERT INTO shopping_items(name,quantity,unit) VALUES (?,?,?)', data.name, data.quantity, data.unit)).lastInsertRowId;
      });
    },
    setBought(id, bought) {
      return write(async () => {
        requireChange(await db.runAsync("UPDATE shopping_items SET bought=?,updatedAt=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?", bought ? 1 : 0, id));
      });
    },
    deleteShopping(id) {
      return write(async () => { requireChange(await db.runAsync('DELETE FROM shopping_items WHERE id=?', id)); });
    },
    moveBoughtToFridge({ entries, storageAreaId, buyDate, expDate }) {
      return write(async () => {
        let count = 0;
        await db.withTransactionAsync(async () => {
          const items = await db.getAllAsync('SELECT * FROM shopping_items WHERE bought=1');
          if (!items.length) throw new Error('Hãy tích chọn ít nhất một món đã mua.');
          const requests = entries ?? items.map(item => ({ shoppingId: item.id, storageAreaId, buyDate, expDate }));
          if (!Array.isArray(requests) || !requests.length) throw new Error('Chọn ít nhất một món để cất vào tủ lạnh.');
          const seen = new Set();
          const prepared = requests.map(entry => {
            if (seen.has(entry.shoppingId)) throw new Error('Danh sách chuyển có món bị lặp. Hãy mở lại danh sách.');
            seen.add(entry.shoppingId);
            const item = items.find(row => row.id === entry.shoppingId);
            if (!item) throw new Error('Có món không còn trong danh sách đã mua. Hãy mở lại danh sách.');
            try {
              return { id: item.id, data: validateFood({ ...item, ...entry, name: item.name, quantity: entry.quantity ?? item.quantity, unit: entry.unit ?? item.unit }) };
            } catch (error) { throw new Error(`${item.name}: ${error.message}`); }
          });
          for (const item of prepared) {
            await insertFood(item.data);
            await db.runAsync('DELETE FROM shopping_items WHERE id=?', item.id);
          }
          count = prepared.length;
        });
        return count;
      });
    },
    // Explicit action only; never silently reseed deleted data at startup.
    addDemoFoods() {
      return write(async () => {
        const today = new Date();
        const dateAt = offset => {
          const date = new Date(today);
          date.setDate(date.getDate() + offset);
          return formatDate(todayISO(date));
        };
        await db.withTransactionAsync(async () => {
          const examples = [
            ['Cà chua', 3, 'quả', 'cool', 1],
            ['Sữa tươi', 1, 'hộp', 'cool', -1],
            ['Thịt gà', 500, 'g', 'frozen', 10],
            ['Gạo', 2, 'kg', 'dry', 30],
          ];
          for (const [name, quantity, unit, storageAreaId, offset] of examples) {
            await insertFood(validateFood({ name, quantity, unit, storageAreaId, buyDate: dateAt(-2), expDate: dateAt(offset) }));
          }
        });
      });
    },
  };
}
