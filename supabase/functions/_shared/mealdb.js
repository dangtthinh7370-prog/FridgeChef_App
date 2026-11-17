export function parseMeasure(value) {
  const measure = String(value || '').trim();
  const normalized = measure
    .replace(/½/g, ' 1/2')
    .replace(/¼/g, ' 1/4')
    .replace(/¾/g, ' 3/4')
    .trim();
  const match = /^(\d+(?:\.\d+)?)(?:\s+(\d+)\/(\d+)|\/(\d+))?\s*([a-zA-Z]+)?$/.exec(normalized);
  if (!match) return { quantity: null, unit: '', measure };
  let quantity = Number(match[1]);
  if (match[2]) quantity += Number(match[2]) / Number(match[3]);
  else if (match[4]) quantity /= Number(match[4]);
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1000000)
    return { quantity: null, unit: '', measure };
  const units = {
    grams: 'g',
    gram: 'g',
    g: 'g',
    kilograms: 'kg',
    kg: 'kg',
    ml: 'ml',
    millilitres: 'ml',
    litres: 'l',
    liter: 'l',
    l: 'l',
  };
  const rawUnit = (match[5] || '').toLowerCase();
  // A number without a unit does not tell us grams, pieces or packet size.
  if (!rawUnit) return { quantity: null, unit: '', measure };
  return { quantity, unit: units[rawUnit] || rawUnit, measure };
}
export function normalizeMeal(meal) {
  if (
    !meal ||
    !/^\d{1,12}$/.test(String(meal.idMeal)) ||
    typeof meal.strMeal !== 'string' ||
    !meal.strMeal.trim() ||
    meal.strMeal.length > 120 ||
    typeof meal.strInstructions !== 'string' ||
    !meal.strInstructions.trim()
  )
    throw new Error('Invalid source recipe');
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const name = String(meal[`strIngredient${i}`] || '').trim();
    if (!name) continue;
    if (name.length > 100) throw new Error('Invalid source ingredient');
    ingredients.push({ name, ...parseMeasure(meal[`strMeasure${i}`]) });
  }
  if (!ingredients.length) throw new Error('No source ingredients');
  let blocks = meal.strInstructions
    .trim()
    .split(/\r?\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (blocks.length > 20) blocks = [...blocks.slice(0, 19), blocks.slice(19).join('\n')];
  if (blocks.some((s) => s.length > 10000)) throw new Error('Source instructions too long');
  const id = String(meal.idMeal);
  return {
    id: `themealdb-${id}`,
    title: meal.strMeal.trim(),
    minutes: null,
    servings: null,
    ingredients,
    steps: blocks.map((desc, i) => ({ title: `Bước ${i + 1}`, desc, seconds: 0 })),
    source: {
      provider: 'TheMealDB',
      id,
      url: `https://www.themealdb.com/meal/${id}`,
      originalUrl:
        typeof meal.strSource === 'string' && meal.strSource.startsWith('https://')
          ? meal.strSource
          : null,
    },
    image:
      typeof meal.strMealThumb === 'string' &&
      /^https:\/\/(www\.)?themealdb\.com\//.test(meal.strMealThumb)
        ? meal.strMealThumb
        : null,
    area: String(meal.strArea || ''),
    category: String(meal.strCategory || ''),
  };
}
export function localizeSelection(recipe, selection) {
  const text = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
  if (
    selection.id !== recipe.id ||
    !text(selection.reason, 1000) ||
    !text(selection.titleVi, 120) ||
    !Array.isArray(selection.ingredientsVi) ||
    selection.ingredientsVi.length !== recipe.ingredients.length ||
    selection.ingredientsVi.some((n) => !text(n, 100)) ||
    !Array.isArray(selection.stepsVi) ||
    selection.stepsVi.length !== recipe.steps.length ||
    selection.stepsVi.some((n) => !text(n, 10000))
  )
    throw new Error('Invalid grounded selection');
  return {
    ...recipe,
    title: selection.titleVi.trim(),
    reason: selection.reason.trim(),
    ingredients: recipe.ingredients.map((i, n) => ({
      ...i,
      name: selection.ingredientsVi[n].trim(),
    })),
    steps: recipe.steps.map((s, n) => ({ ...s, desc: selection.stepsVi[n].trim() })),
  };
}
