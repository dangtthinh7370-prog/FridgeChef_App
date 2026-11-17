const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const babel = require('@babel/core');
const { code } = babel.transformSync(
  fs.readFileSync('supabase/functions/_shared/chat.js', 'utf8'),
  {
    configFile: false,
    babelrc: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  },
);
function fixture(options = {}) {
  const reads = [],
    writes = [];
  let claims = 0,
    calls = 0,
    body;
  const client = {
    from(table) {
      reads.push(table);
      const q = {
        select() {
          return q;
        },
        eq() {
          return q;
        },
        order() {
          return q;
        },
        maybeSingle: async () => ({
          data:
            table === 'profiles'
              ? { display_name: 'Thái' }
              : table === 'recipe_catalog'
                ? { recipe: { title: 'Pasta' } }
                : options.cached
                  ? { reply: 'Saved response' }
                  : null,
          error: null,
        }),
        limit: async () => ({
          data:
            table === 'ai_conversations'
              ? [{ message: 'Previous question', reply: 'Previous answer' }]
              : [{ name: 'Rice', quantity: 1, unit: 'kg' }],
          error: null,
        }),
      };
      return q;
    },
    rpc: async () => {
      claims++;
      return { data: options.allowed !== false, error: null };
    },
  };
  const admin = {
    from: () => ({
      upsert: async (row) => {
        writes.push(row);
        return { error: options.saveError ? new Error('write') : null };
      },
    }),
  };
  const exports = {};
  new Function('exports', 'fetch', code)(exports, async (_url, request) => {
    calls++;
    body = JSON.parse(request.body);
    return new Response(
      JSON.stringify({
        candidates: [
          {
            finishReason: options.truncated ? 'MAX_TOKENS' : 'STOP',
            content: { parts: [{ text: 'Hướng dẫn nấu ăn.' }] },
          },
        ],
      }),
      { status: 200 },
    );
  });
  const invoke = (extra = {}) =>
    exports.chat({
      client,
      admin,
      user: { id: 'owner-a' },
      input: {
        message: 'Hướng dẫn món này',
        requestId: 'a0000000-0000-4000-8000-000000000001',
        ...extra,
      },
      geminiKey: 'server-only',
      model: 'gemini-3.1-flash-lite',
      reply: (data, status = 200) => ({ data, status }),
    });
  return { invoke, reads, writes, stats: () => ({ claims, calls, body }) };
}
test('chat omits inventory by default, sends display name and preserves conversation order', async () => {
  const f = fixture();
  assert.equal((await f.invoke()).status, 200);
  assert.ok(!f.reads.includes('food_items'));
  const content = f.stats().body.contents;
  assert.deepEqual(
    content.map((x) => x.role),
    ['user', 'model', 'user'],
  );
  const context = JSON.parse(content[2].parts[0].text);
  assert.equal(context.displayName, 'Thái');
  assert.deepEqual(context.inventory, []);
  assert.equal(context.email, undefined);
  assert.equal(context.user_id, undefined);
  assert.equal(f.writes[0].user_id, 'owner-a');
});
test('chat includes inventory and canonical recipe only when requested', async () => {
  const f = fixture();
  await f.invoke({ useInventory: true, recipeId: 'themealdb-52772' });
  assert.ok(f.reads.includes('food_items'));
  assert.ok(f.reads.includes('recipe_catalog'));
  const context = JSON.parse(f.stats().body.contents.at(-1).parts[0].text);
  assert.equal(context.inventory[0].name, 'Rice');
  assert.equal(context.recipe.title, 'Pasta');
});
test('retry of a saved exchange returns persisted answer without quota or provider call', async () => {
  const f = fixture({ cached: true });
  assert.equal((await f.invoke()).data.message, 'Saved response');
  assert.equal(f.stats().calls, 0);
  assert.equal(f.stats().claims, 0);
  assert.equal(f.writes.length, 0);
});
test('invalid chat, exhausted quota, truncated response and failed save cannot appear successful', async () => {
  const bad = fixture();
  assert.equal((await bad.invoke({ message: ' ' })).status, 400);
  assert.equal(bad.stats().calls, 0);
  const limited = fixture({ allowed: false });
  assert.equal((await limited.invoke()).status, 429);
  assert.equal(limited.stats().calls, 0);
  const incomplete = fixture({ truncated: true });
  assert.equal((await incomplete.invoke()).status, 502);
  assert.equal(incomplete.writes.length, 0);
  assert.equal((await fixture({ saveError: true }).invoke()).status, 503);
});
