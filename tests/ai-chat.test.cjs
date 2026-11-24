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
    body,
    lastUrl;
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
              ? {
                  display_name: 'Thái',
                  food_likes: 'Nấm',
                  food_limits: 'Giảm ngọt',
                  food_dislikes: 'Cá',
                }
              : table === 'recipe_catalog'
                ? { recipe: options.catalog?.[0]?.recipe || { title: 'Pasta' } }
                : options.cached
                  ? { reply: 'Saved response' }
                  : null,
          error: null,
        }),
        limit: async () => ({
          data:
            table === 'ai_conversations'
              ? [{ message: 'Previous question', reply: 'Previous answer' }]
              : table === 'recipe_catalog'
                ? options.catalog || []
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
    lastUrl = _url;
    body = JSON.parse(request.body);
    if (body.tools && options.webResponse) return Response.json(options.webResponse);
    if (body.tools && options.webUnavailable) return Response.json({}, { status: 429 });
    return new Response(
      JSON.stringify({
        candidates: [
          {
            finishReason: options.truncated ? 'MAX_TOKENS' : 'STOP',
            content: { parts: [{ text: options.answer || 'Hướng dẫn nấu ăn.' }] },
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
      searchModel: 'gemini-2.5-flash-lite',
      reply: (data, status = 200) => ({ data, status }),
    });
  const cook = (input) =>
    exports.cookGuide({
      client,
      input,
      geminiKey: 'server-only',
      model: 'gemini-3.1-flash-lite',
      searchModel: 'gemini-2.5-flash-lite',
      reply: (data, status = 200) => ({ data, status }),
    });
  return { invoke, cook, reads, writes, stats: () => ({ claims, calls, body, lastUrl }) };
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
  assert.deepEqual(context.foodPreferences, { likes: 'Nấm', limits: 'Giảm ngọt', dislikes: 'Cá' });
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
test('retry of a saved exchange returns persisted answer without a provider call', async () => {
  const f = fixture({ cached: true });
  assert.equal((await f.invoke()).data.message, 'Saved response');
  assert.equal(f.stats().calls, 0);
  assert.equal(f.stats().claims, 0);
  assert.equal(f.writes.length, 0);
});
test('invalid chat and failed saves are rejected while interrupted AI gets a labeled response', async () => {
  const bad = fixture();
  assert.equal((await bad.invoke({ message: ' ' })).status, 400);
  assert.equal(bad.stats().calls, 0);
  const incomplete = fixture({ truncated: true });
  const response = await incomplete.invoke();
  assert.equal(response.status, 200);
  assert.match(response.data.message, /Gemini chưa trả lời/);
  assert.equal(incomplete.writes.length, 1);
  assert.equal((await fixture({ saveError: true }).invoke()).status, 503);
});

test('chat is not blocked by the previous application quota', async () => {
  const f = fixture({ allowed: false });
  assert.equal((await f.invoke()).status, 200);
  assert.equal(f.stats().claims, 0);
  assert.equal(f.stats().calls, 1);
});

test('chat proposes a catalog recipe and fetches the guide only on request', async () => {
  const recipe = {
    id: 'themealdb-52772',
    title: 'Pasta',
    area: 'Italian',
    source: { provider: 'TheMealDB', id: '52772', url: 'https://www.themealdb.com/meal/52772' },
    ingredients: [{ name: 'Pasta', measure: '200 g' }],
    steps: [{ desc: 'Luộc mì.' }],
  };
  const f = fixture({
    catalog: [{ id: recipe.id, recipe }],
    answer: JSON.stringify({ message: 'Mình chọn Pasta.', recipeId: recipe.id }),
  });
  const { data } = await f.invoke({ message: 'Cách làm pasta' });
  assert.equal(data.message, 'Mình chọn Pasta.');
  assert.equal(data.proposal.recipeId, recipe.id);
  assert.equal(data.guide, undefined);
  assert.equal(data.proposal.steps, undefined);
  const { data: cooking } = await f.cook({ recipeId: recipe.id });
  assert.equal(cooking.guide.recipeId, recipe.id);
  assert.deepEqual(cooking.guide.ingredients, ['Pasta · 200 g']);
  assert.deepEqual(cooking.guide.steps, ['Luộc mì.']);
  assert.match(f.writes[0].reply, /^FC_CHAT_V1:/);
});

test('web chat uses Google metadata and only shows a guide with actual cited sources', async () => {
  const content = {
    parts: [
      {
        text:
          String.fromCharCode(96).repeat(3) +
          'json\n' +
          JSON.stringify([
            {
              message: 'Mình tìm được bánh căn.',
              title: 'Bánh căn',
              origin: 'Phan Rang',
              ingredients: ['Bột gạo'],
              steps: ['Đổ bột vào khuôn.'],
            },
          ]) +
          '\n' +
          String.fromCharCode(96).repeat(3),
      },
      { text: 'Bánh căn có xuất xứ ở Phan Rang.' },
    ],
  };
  const f = fixture({
    webResponse: {
      candidates: [
        {
          finishReason: 'STOP',
          content,
          groundingMetadata: {
            groundingChunks: [
              { web: { uri: 'https://example.com/banh-can', title: 'Công thức bánh căn' } },
            ],
            groundingSupports: [{ groundingChunkIndices: [0] }],
            searchEntryPoint: {
              renderedContent:
                '<a href="https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc123">bánh căn</a>',
            },
          },
        },
      ],
    },
  });
  const { data } = await f.invoke({
    searchWeb: true,
    useInventory: true,
    message: 'Bánh căn Phan Rang',
  });
  assert.equal(data.proposal.sources[0].url, 'https://example.com/banh-can');
  assert.equal(data.proposal.suggestions[0].title, 'bánh căn');
  assert.equal(data.guide, undefined);
  assert.match(f.stats().lastUrl, /gemini-2\.5-flash-lite:generateContent$/);
  assert.equal(data.proposal.ingredients, undefined);
  assert.match(JSON.stringify(f.stats().body), /Chưa liệt kê nguyên liệu/);
  const { data: cooking } = await f.cook({ webQuery: data.proposal.webQuery });
  assert.deepEqual(cooking.guide.steps, ['Đổ bột vào khuôn.']);
  assert.match(f.stats().lastUrl, /gemini-2\.5-flash-lite:generateContent$/);
  assert.doesNotMatch(JSON.stringify(f.stats().body), /Rice|displayName/);
  assert.doesNotMatch(f.writes[0].reply, /example.com|Đổ bột/);
  const empty = fixture({ webResponse: { candidates: [{ finishReason: 'STOP', content }] } });
  const noSource = (await empty.invoke({ searchWeb: true, message: 'Bánh căn Phan Rang' })).data;
  assert.equal(noSource.guide, undefined);
  assert.equal(noSource.webQuery, 'Bánh căn Phan Rang');
  const limited = fixture({ webUnavailable: true });
  assert.equal((await limited.invoke({ searchWeb: true })).data.guide, undefined);
});

test('malformed provider JSON is not returned as visible chat text', async () => {
  const f = fixture({ answer: '{"message": "Dở dang' });
  const { data } = await f.invoke();
  assert.match(data.message, /Gemini chưa trả lời/);
  assert.doesNotMatch(data.message, /"message"/);
});

test('Google Search plain text headings form a usable recipe guide when cited', async () => {
  const content = {
    parts: [
      {
        text: [
          '**Tên món:** Bánh căn',
          '**Xuất xứ:** Phan Rang',
          '**Mô tả:** Đây là bánh nướng trong khuôn.',
          '## Nguyên liệu:',
          '- Bột gạo 200 g',
          '## Các bước:',
          '1. Trộn bột.',
          '2. Đổ vào khuôn.',
        ].join('\n'),
      },
    ],
  };
  const f = fixture({
    webResponse: {
      candidates: [
        {
          finishReason: 'STOP',
          content,
          groundingMetadata: {
            groundingChunks: [
              { web: { uri: 'https://example.com/banh-can', title: 'Nguồn bánh căn' } },
            ],
            groundingSupports: [{ groundingChunkIndices: [0] }],
          },
        },
      ],
    },
  });
  const result = await f.cook({ webQuery: 'Bánh căn' });
  assert.equal(result.status, 200);
  assert.deepEqual(result.data.guide.ingredients, ['Bột gạo 200 g']);
  assert.deepEqual(result.data.guide.steps, ['Trộn bột.', 'Đổ vào khuôn.']);
});
