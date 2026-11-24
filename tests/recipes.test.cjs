const { LOCAL_RECIPES } = require('./recipe-fixtures.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-source.cjs');
const { normalizeName, convertQuantity, validateRecipe, planRecipe, planShopping } =
  load('src/models/recipes.js');
const now = new Date(2026, 10, 16);
test('missing shopping combines compatible units and never counts the same purchase twice', () => {
  const result = planShopping(
    [
      { name: 'Gạo', unit: 'g', missing: 1000 },
      { name: 'Gạo', unit: 'kg', missing: 1 },
    ],
    [{ name: 'Gạo', quantity: 1, unit: 'kg' }],
  );
  assert.deepEqual(result, [{ name: 'Gạo', quantity: 1000, unit: 'g' }]);
});
const food = (id, name, quantity, unit, expiresAt = '2026-11-20') => ({
  id,
  name,
  quantity,
  unit,
  expiresAt,
  updatedAt: '2026-11-16T00:00:00Z',
  days: 2,
});
test('all bundled recipes have valid numeric quantities and real steps', () => {
  for (const r of LOCAL_RECIPES) assert.ok(validateRecipe(r));
});
test('normalizes Vietnamese names and only converts compatible units', () => {
  assert.equal(normalizeName('  ĐẬU   phụ '), 'dau phu');
  assert.equal(convertQuantity(0.5, 'kg', 'g'), 500);
  assert.equal(convertQuantity(250, 'ml', 'l'), 0.25);
  assert.equal(convertQuantity(1, 'quả', 'g'), null);
  assert.equal(convertQuantity(1, 'g', 'ml'), null);
});
test('recipe allocation uses earliest expiry, never expired lots and never duplicates stock', () => {
  const recipe = validateRecipe({
    ...LOCAL_RECIPES[0],
    ingredients: [
      { name: 'Trứng gà', quantity: 3, unit: 'quả' },
      { name: 'Trứng gà', quantity: 3, unit: 'quả' },
    ],
  });
  const plan = planRecipe(
    recipe,
    [
      food('expired', 'Trứng gà', 10, 'quả', '2026-11-15'),
      food('late', 'Trứng gà', 2, 'quả', '2026-12-01'),
      food('soon', 'Trứng gà', 3, 'quả', '2026-11-17'),
    ],
    2,
    now,
  );
  assert.deepEqual(
    plan.entries.map((e) => [e.foodId, e.quantity]),
    [
      ['soon', 3],
      ['late', 2],
    ],
  );
  assert.equal(plan.ingredients[1].missing, 1);
  assert.equal(plan.readyCount, 1);
});
test('scales portions and allocates across mass units without guessing pack size', () => {
  const recipe = LOCAL_RECIPES[1];
  const plan = planRecipe(
    recipe,
    [food('chicken', 'THỊT GÀ', 0.75, 'kg'), food('tomato', 'Cà chua', 1, 'hộp')],
    4,
    now,
  );
  assert.equal(plan.ingredients[0].quantity, 1000);
  assert.equal(plan.ingredients[0].missing, 250);
  assert.equal(plan.entries[0].quantity, 0.75);
  assert.equal(plan.ingredients[1].missing, 6);
});
test('AI payload validation rejects malformed, oversized and impossible recipes', () => {
  for (const raw of [
    null,
    {},
    { ...LOCAL_RECIPES[0], servings: 0 },
    { ...LOCAL_RECIPES[0], ingredients: [{ name: 'A', quantity: -1, unit: 'g' }] },
    { ...LOCAL_RECIPES[0], steps: [{ title: 'A', desc: 'B', seconds: NaN }] },
  ])
    assert.throws(() => validateRecipe(raw));
  assert.throws(() => planRecipe(LOCAL_RECIPES[0], [], 0));
});

test('verified ingredient aliases share inventory and shopping without changing unit or cut', () => {
  const recipe = {
    ...LOCAL_RECIPES[0],
    ingredients: [
      { name: 'Garlic', quantity: 32, unit: 'g' },
      { name: 'Chicken breast', quantity: 100, unit: 'g' },
    ],
  };
  const plan = planRecipe(
    recipe,
    [food('garlic', 'Tỏi', 20, 'g'), food('thigh', 'Đùi gà', 200, 'g')],
    2,
    now,
  );
  assert.deepEqual(
    plan.ingredients.map((item) => item.missing),
    [12, 100],
  );
  assert.deepEqual(
    plan.entries.map((entry) => entry.foodId),
    ['garlic'],
  );
  assert.deepEqual(planShopping(plan.ingredients, [{ name: 'Tỏi', quantity: 0.012, unit: 'kg' }]), [
    { name: 'Chicken breast', unit: 'g', quantity: 100 },
  ]);
});

test('catalog recipe headings do not turn into empty cooking steps', () => {
  const recipe = validateRecipe({
    ...LOCAL_RECIPES[0],
    source: { provider: 'TheMealDB', id: '123', url: 'https://www.themealdb.com/meal/123' },
    steps: [
      { title: 'Bước 1', desc: 'STEP 1', seconds: 0 },
      { title: 'Bước 2', desc: 'Prepare the ingredients.', seconds: 0 },
      { title: 'Bước 3', desc: 'Bước 2:', seconds: 0 },
      { title: 'Bước 4', desc: 'Serve warm.', seconds: 0 },
    ],
  });
  assert.deepEqual(
    recipe.steps.map((step) => [step.title, step.desc]),
    [
      ['Bước 1', 'Prepare the ingredients.'],
      ['Bước 2', 'Serve warm.'],
    ],
  );
});
