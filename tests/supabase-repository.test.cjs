const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-source.cjs');
const { createSupabaseFridgeRepository } = load('src/repositories/supabaseFridgeRepository.js');
const { validateCredentials, authErrorMessage } = load('src/models/auth.js');
const userId = '11111111-1111-4111-8111-111111111111';
const itemId = '22222222-2222-4222-8222-222222222222';
const valid = { name: 'Trứng', quantity: '2', unit: 'quả', storageAreaId: 'cool', buyDate: '13/11/2026', expDate: '18/11/2026' };
function mock(responses = [], rpcResult = { data: 1, error: null }) {
  const calls = [];
  const client = {
    from(table) {
      const call = { table, operation: 'select', filters: [] }; calls.push(call);
      const query = {
        select(columns) { call.columns = columns; return query; },
        eq(key, value) { call.filters.push([key, value]); return query; },
        order(key) { call.order = key; return query; },
        range(from, to) { call.range = [from, to]; return query; },
        single() { call.single = true; return query; },
        insert(values) { call.operation = 'insert'; call.values = values; return query; },
        update(values) { call.operation = 'update'; call.values = values; return query; },
        delete() { call.operation = 'delete'; return query; },
        then(resolve, reject) { return Promise.resolve(responses.shift() ?? { data: [], error: null }).then(resolve, reject); },
      };
      return query;
    },
    async rpc(name, args) { calls.push({ rpc: name, args }); return rpcResult; },
  };
  return { client, calls };
}

test('cloud inserts attach current user, preserve UUID and strip forged ownership', async () => {
  const { client, calls } = mock([{ data: { id: itemId } }]);
  const repo = createSupabaseFridgeRepository(client, userId);
  assert.equal(await repo.saveFood({ ...valid, user_id: 'attacker', id: 'bad' }), itemId);
  assert.equal(calls[0].values.user_id, userId);
  assert.equal(calls[0].values.purchasedAt, '2026-11-13');
  assert.equal(calls[0].values.id, undefined);
});
test('cloud updates, checks and deletes always include account and UUID filters', async () => {
  const { client, calls } = mock(Array.from({ length: 5 }, () => ({ data: [{ id: itemId }] })));
  const repo = createSupabaseFridgeRepository(client, userId);
  await repo.saveFood(valid, itemId); await repo.saveShopping(valid, itemId);
  await repo.setBought(itemId, true); await repo.deleteFood(itemId); await repo.deleteShopping(itemId);
  for (const call of calls) assert.deepEqual(call.filters, [['id', itemId], ['user_id', userId]]);
  assert.equal(calls[2].values.bought, true);
});
test('missing cloud item fails visibly and a failed write does not poison later writes', async () => {
  const { client } = mock([{ data: [] }, { data: { id: itemId } }]);
  const repo = createSupabaseFridgeRepository(client, userId);
  await assert.rejects(repo.deleteFood(itemId), /không còn tồn tại/);
  assert.equal(await repo.saveFood(valid), itemId);
});
test('cloud snapshot fetches all pages and both tables are scoped to current user', async () => {
  const food = id => ({ id, name: 'A', expiresAt: '2026-11-18', createdAt: '2026-11-13T00:00:00Z' });
  const { client, calls } = mock([{ data: Array.from({ length: 1000 }, (_, i) => food(String(i))) }, { data: [] }, { data: [food(itemId)] }]);
  const result = await createSupabaseFridgeRepository(client, userId).getSnapshot();
  assert.equal(result.foods.length, 1001); assert.deepEqual(result.shopping, []);
  for (const call of calls) assert.deepEqual(call.filters, [['user_id', userId]]);
  assert.deepEqual(calls[2].range, [1000, 1999]);
});
test('transfer sends one RPC with per-item dates and refuses duplicates before any request', async () => {
  const { client, calls } = mock([], { data: 1 });
  const repo = createSupabaseFridgeRepository(client, userId);
  const entry = { ...valid, shoppingId: itemId };
  assert.equal(await repo.moveBoughtToFridge({ entries: [entry] }), 1);
  assert.equal(calls.length, 1); assert.equal(calls[0].rpc, 'move_bought_to_fridge');
  assert.equal(calls[0].args.entries[0].expiresAt, '2026-11-18');
  await assert.rejects(repo.moveBoughtToFridge({ entries: [entry, entry] }), /lặp/);
  await assert.rejects(repo.moveBoughtToFridge({ entries: [{ ...entry, expDate: '12/11/2026' }] }));
  assert.equal(calls.length, 1);
});
test('cloud permission/setup failure is not treated as empty data or success', async () => {
  const { client } = mock([{ data: null, error: { code: '42501', message: 'permission denied' } }]);
  await assert.rejects(createSupabaseFridgeRepository(client, userId).saveShopping(valid), /RLS/);
});
test('legacy import normalizes dates, strips ownership and sends stable source and legacy IDs', async () => {
  const { client, calls } = mock([], { data: { foods: 1, shopping: 1 } });
  const repo = createSupabaseFridgeRepository(client, userId);
  await repo.importLegacy({ sourceId: 'device-123', foods: [{ ...valid, id: 7, purchasedAt: '2026-11-13', expiresAt: '2026-11-18' }], shopping: [{ ...valid, id: 9, bought: false }] });
  assert.equal(calls[0].rpc, 'import_legacy_fridge');
  assert.equal(calls[0].args.source_id, 'device-123');
  assert.equal(calls[0].args.foods[0].legacyId, '7');
  assert.equal(calls[0].args.foods[0].purchasedAt, '2026-11-13');
  assert.equal(calls[0].args.shopping[0].bought, false);
});
test('registration validates email, password confirmation and maps common auth errors', () => {
  assert.deepEqual(validateCredentials(' A@Example.com ', 'abcdefgh', true, 'abcdefgh'), { email: 'a@example.com', password: 'abcdefgh' });
  assert.throws(() => validateCredentials('bad', 'abcdefgh'));
  assert.throws(() => validateCredentials('a@b.com', '123', true, '123'));
  assert.throws(() => validateCredentials('a@b.com', 'abcdefgh', true, 'different'));
  assert.match(authErrorMessage({ code: 'email_not_confirmed' }), /xác nhận email/);
});
