const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const babel = require('@babel/core');
const load = require('./load-source.cjs');
const { normalizeMeal } = load('supabase/functions/_shared/mealdb.js');
const meal = {
  idMeal: '52772',
  strMeal: 'Chicken with rice',
  strInstructions: 'Cook chicken completely.\nServe with rice.',
  strIngredient1: 'Chicken',
  strMeasure1: '500 g',
  strIngredient2: 'Rice',
  strMeasure2: 'to taste',
  strArea: 'Japanese',
  strCategory: 'Chicken',
  strSource: 'https://example.com/chicken',
};
const recipe = normalizeMeal(meal);
const source = fs.readFileSync('supabase/functions/ai-chef/index.ts', 'utf8');
const { code } = babel.transformSync(source, {
  filename: 'index.ts',
  configFile: false,
  babelrc: false,
  plugins: ['@babel/plugin-transform-typescript', '@babel/plugin-transform-modules-commonjs'],
});
function fixture(options = {}) {
  let handler,
    fetches = 0,
    claims = 0;
  const writes = [];
  const makeQuery = (table) => {
    const q = {
      maybeSingle: async () => ({ data: { display_name: 'Thái' }, error: null }),
      select() {
        return q;
      },
      eq() {
        return q;
      },
      gte() {
        return q;
      },
      order() {
        return q;
      },
      limit: async () => ({
        data:
          table === 'recipe_catalog'
            ? options.noCatalog
              ? []
              : [{ id: recipe.id, recipe }]
            : options.empty
              ? []
              : [{ name: 'Thịt gà', quantity: 500, unit: 'g', expiresAt: '2099-01-01' }],
        error: null,
      }),
    };
    return q;
  };
  const client = {
    auth: {
      getUser: async () => ({
        data: { user: options.unauthorized ? null : { id: 'user-a' } },
        error: options.unauthorized ? new Error('bad token') : null,
      }),
    },
    rpc: async () => {
      claims++;
      return { data: options.allowed !== false, error: null };
    },
    from: makeQuery,
  };
  const admin = {
    from: (table) => ({
      upsert: async (value) => {
        writes.push({ table, value });
        return { error: options.saveError ? new Error('database unavailable') : null };
      },
    }),
  };
  const env = {
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_ANON_KEY: 'public',
    SUPABASE_SERVICE_ROLE_KEY: 'service',
    GEMINI_API_KEY: options.noKey ? '' : 'gemini-server-secret',
    THEMEALDB_API_KEY: 'education-key',
  };
  const mockFetch = async (url, request) => {
    fetches++;
    if (url.startsWith('https://www.themealdb.com/api/'))
      return new Response(JSON.stringify({ meals: options.noSource ? null : [meal] }), {
        status: 200,
      });
    assert.match(
      url,
      /^https:\/\/generativelanguage.googleapis.com\/v1beta\/models\/gemini-3.1-flash-lite:generateContent$/,
    );
    assert.equal(request.headers['x-goog-api-key'], 'gemini-server-secret');
    const body = JSON.parse(request.body);
    const prompt = JSON.parse(body.contents[0].parts[0].text);
    assert.equal(prompt.displayName, 'Thái');
    assert.equal(prompt.user_id, undefined);
    assert.equal(prompt.email, undefined);
    assert.match(body.contents[0].parts[0].text, /themealdb-52772/);
    assert.doesNotMatch(url, /gemini-server-secret/);
    const selection = {
      id: options.invented ? 'themealdb-999999' : recipe.id,
      reason: 'Có thịt gà, cần chuẩn bị thêm gạo.',
      titleVi: 'Gà cùng cơm',
      ingredientsVi: options.badTranslation ? ['Một nguyên liệu khác'] : ['Thịt gà', 'Gạo'],
      stepsVi: ['Nấu gà chín hoàn toàn.', 'Ăn cùng cơm.'],
    };
    return new Response(
      JSON.stringify(
        options.providerError
          ? { error: { message: 'secret provider detail' } }
          : {
              candidates: [
                {
                  finishReason: 'STOP',
                  content: {
                    parts: [
                      { text: JSON.stringify({ selections: options.noMatch ? [] : [selection] }) },
                    ],
                  },
                },
              ],
            },
      ),
      { status: options.providerError ? 429 : 200 },
    );
  };
  const deno = {
    env: { get: (key) => env[key] },
    serve: (fn) => {
      handler = fn;
    },
  };
  new Function('require', 'exports', 'Deno', 'fetch', code)(
    (request) =>
      request.includes('mealdb.js')
        ? load('supabase/functions/_shared/mealdb.js')
        : { createClient: (_url, key) => (key === 'service' ? admin : client) },
    {},
    deno,
    mockFetch,
  );
  const request = (body = { servings: 2, preference: '' }) =>
    handler(
      new Request('https://example.supabase.co/functions/v1/ai-chef', {
        method: 'POST',
        headers: { Authorization: 'Bearer user-token', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    );
  return { request, writes, stats: () => ({ fetches, claims }) };
}
test('Gemini endpoint authenticates before source, quota or provider', async () => {
  const f = fixture({ unauthorized: true });
  assert.equal((await f.request()).status, 401);
  assert.deepEqual(f.stats(), { fetches: 0, claims: 0 });
});
test('Gemini endpoint requires server key and validates payload before quota', async () => {
  const missing = fixture({ noKey: true });
  assert.equal((await missing.request()).status, 503);
  const invalid = fixture();
  assert.equal((await invalid.request({ servings: 99 })).status, 400);
  assert.equal(invalid.stats().claims, 0);
});
test('Gemini endpoint enforces quota and requires non-expired inventory', async () => {
  const limited = fixture({ allowed: false });
  assert.equal((await limited.request()).status, 429);
  assert.equal(limited.stats().fetches, 0);
  const empty = fixture({ empty: true });
  assert.equal((await empty.request()).status, 400);
  assert.equal(empty.stats().fetches, 0);
});
test('Gemini selects real source IDs, preserves measurements and saves to Supabase', async () => {
  const f = fixture();
  const r = await f.request();
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.equal(data.recipes[0].source.url, 'https://www.themealdb.com/meal/52772');
  assert.equal(data.recipes[0].ingredients[0].quantity, 500);
  assert.equal(data.recipes[0].ingredients[1].quantity, null);
  assert.equal(data.recipes[0].servings, null);
  assert.equal(f.writes[0].table, 'recipe_suggestions');
  assert.equal(f.writes[0].value[0].user_id, 'user-a');
});
test('Gemini cannot introduce an unknown source ID or change ingredient count', async () => {
  for (const options of [{ invented: true }, { badTranslation: true }]) {
    const f = fixture(options);
    assert.equal((await f.request()).status, 503);
    assert.equal(f.writes.length, 0);
  }
});
test('catalog action fetches official API and stores canonical source before responding', async () => {
  const f = fixture({ noKey: true });
  const r = await f.request({ action: 'catalog', query: 'chicken' });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).imported, 1);
  assert.equal(f.writes[0].table, 'recipe_catalog');
  assert.equal(f.writes[0].value[0].source_payload.idMeal, '52772');
  assert.equal(f.stats().fetches, 1);
});
test('no-match and provider failures do not fake successful recommendations', async () => {
  const empty = fixture({ noMatch: true });
  assert.deepEqual((await (await empty.request()).json()).recipes, []);
  assert.equal(empty.writes.length, 0);
  const failed = fixture({ providerError: true });
  const r = await failed.request();
  assert.equal(r.status, 502);
  assert.doesNotMatch(await r.text(), /secret provider/);
});
