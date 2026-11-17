const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-source.cjs');
const { validateProfile, validatePasswordChange } = load('src/models/profile.js');
const { parseMeasure, normalizeMeal, localizeSelection } = load(
  'supabase/functions/_shared/mealdb.js',
);
const { validateRecipe, planRecipe } = load('src/models/recipes.js');
test('profile validates contact data, birthday and password confirmation', () => {
  assert.deepEqual(
    validateProfile({
      display_name: ' Thái ',
      phone: '+84 123456789',
      bio: 'Hello',
      date_of_birth: '2005-08-20',
    }),
    { display_name: 'Thái', phone: '+84 123456789', bio: 'Hello', date_of_birth: '2005-08-20' },
  );
  for (const input of [
    { display_name: '' },
    { display_name: 'A', phone: 'abc' },
    { display_name: 'A', date_of_birth: '2005-02-30' },
    { display_name: 'A', date_of_birth: '2099-01-01' },
  ])
    assert.throws(() => validateProfile(input));
  assert.throws(() => validatePasswordChange('', 'abcdefgh', 'abcdefgh'));
  assert.throws(() => validatePasswordChange('abcdefgh', 'abcdefgh', 'abcdefgh'));
  assert.throws(() => validatePasswordChange('oldpassword', 'newpassword', 'different'));
  assert.doesNotThrow(() => validatePasswordChange('oldpassword', 'newpassword', 'newpassword'));
});
test('source measures keep unknown amounts unknown instead of inventing numbers', () => {
  assert.deepEqual(parseMeasure('1 1/2 kg'), { quantity: 1.5, unit: 'kg', measure: '1 1/2 kg' });
  for (const value of ['to taste', 'a pinch', '2', '1-2 cups'])
    assert.equal(parseMeasure(value).quantity, null);
});
test('source provenance and unknown servings survive validation without unsafe stock deduction', () => {
  const raw = {
    idMeal: '52772',
    strMeal: 'Chicken',
    strInstructions: 'Cook thoroughly.',
    strIngredient1: 'Chicken',
    strMeasure1: 'to taste',
  };
  const normalized = normalizeMeal(raw);
  const recipe = validateRecipe(normalized);
  assert.equal(recipe.servings, null);
  assert.equal(recipe.minutes, null);
  assert.equal(recipe.source.url, 'https://www.themealdb.com/meal/52772');
  const plan = planRecipe(
    recipe,
    [{ id: '1', name: 'Chicken', quantity: 500, unit: 'g', expiresAt: '2099-01-01' }],
    4,
  );
  assert.equal(plan.entries.length, 0);
  assert.equal(plan.ingredients[0].missing, null);
  assert.equal(plan.presentCount, 1);
  const translated = localizeSelection(recipe, {
    id: recipe.id,
    reason: 'Có thịt gà',
    titleVi: 'Gà',
    ingredientsVi: ['Thịt gà'],
    stepsVi: ['Nấu chín hoàn toàn.'],
  });
  assert.deepEqual(translated.source, recipe.source);
  assert.equal(translated.ingredients[0].quantity, null);
  assert.throws(() =>
    localizeSelection(recipe, {
      id: 'fake',
      reason: 'A',
      titleVi: 'A',
      ingredientsVi: ['A'],
      stepsVi: ['A'],
    }),
  );
});
