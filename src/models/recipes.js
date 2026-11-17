import { todayISO } from './food.js';

export const normalizeName = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim()
    .replace(/\s+/g, ' ');
const units = {
  g: ['mass', 1],
  kg: ['mass', 1000],
  ml: ['volume', 1],
  l: ['volume', 1000],
  lit: ['volume', 1000],
};
export function convertQuantity(quantity, from, to) {
  const a = normalizeName(from),
    b = normalizeName(to);
  if (a === b) return Number(quantity);
  return units[a] && units[b] && units[a][0] === units[b][0]
    ? (Number(quantity) * units[a][1]) / units[b][1]
    : null;
}
export function validateRecipe(raw) {
  const text = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
  const sourced =
    raw?.source?.provider === 'TheMealDB' &&
    /^\d{1,12}$/.test(raw.source.id) &&
    raw.source.url === `https://www.themealdb.com/meal/${raw.source.id}`;
  if (
    !raw ||
    !text(raw.title, 120) ||
    !Array.isArray(raw.ingredients) ||
    !raw.ingredients.length ||
    raw.ingredients.length > 30 ||
    !Array.isArray(raw.steps) ||
    !raw.steps.length ||
    raw.steps.length > 20
  )
    throw new Error('Công thức không đúng định dạng.');
  const ingredients = raw.ingredients.map((i) => {
    if (
      !i ||
      !text(i.name, 100) ||
      !(
        (sourced && i.quantity == null && typeof i.measure === 'string') ||
        (text(i.unit, 20) && Number.isFinite(i.quantity) && i.quantity > 0 && i.quantity <= 1000000)
      )
    )
      throw new Error('Nguyên liệu không hợp lệ.');
    return {
      name: i.name.trim(),
      quantity: i.quantity ?? null,
      unit: String(i.unit || '').trim(),
      ...(typeof i.measure === 'string' ? { measure: i.measure.slice(0, 200) } : {}),
    };
  });
  const steps = raw.steps.map((s) => {
    if (
      !s ||
      !text(s.title, 120) ||
      !text(s.desc, 10000) ||
      !Number.isInteger(s.seconds) ||
      s.seconds < 0 ||
      s.seconds > 86400
    )
      throw new Error('Bước nấu không hợp lệ.');
    return { title: s.title.trim(), desc: s.desc.trim(), seconds: s.seconds };
  });
  if (
    !(
      (sourced && raw.servings == null) ||
      (Number.isInteger(raw.servings) && raw.servings >= 1 && raw.servings <= 20)
    ) ||
    !(
      (sourced && raw.minutes == null) ||
      (Number.isFinite(raw.minutes) && raw.minutes >= 1 && raw.minutes <= 1440)
    )
  )
    throw new Error('Khẩu phần hoặc thời gian không hợp lệ.');
  return {
    id: String(raw.id || normalizeName(raw.title)),
    title: raw.title.trim(),
    servings: raw.servings,
    minutes: raw.minutes,
    ingredients,
    steps,
    ...(sourced
      ? {
          source: {
            provider: 'TheMealDB',
            id: String(raw.source.id),
            url: raw.source.url,
            originalUrl: raw.source.originalUrl || null,
          },
          image: raw.image || null,
          area: raw.area || '',
          category: raw.category || '',
        }
      : {}),
    ...(typeof raw.reason === 'string' ? { reason: raw.reason.slice(0, 1000) } : {}),
  };
}

// Allocate a lot once, earliest expiry first. Never convert pieces to mass by guessing.
export function planRecipe(recipe, foods, servings = recipe.servings || 2, now = new Date()) {
  if (!Number.isInteger(servings) || servings < 1 || servings > 20)
    throw new Error('Khẩu phần cần từ 1 đến 20 người.');
  const factor = recipe.servings ? servings / recipe.servings : 1;
  const remaining = new Map(foods.map((f) => [f.id, Number(f.quantity)]));
  const available = foods
    .filter((f) => f.expiresAt >= todayISO(now))
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
  const allocations = new Map();
  let urgency = 0;
  const ingredients = recipe.ingredients.map((i) => {
    if (i.quantity == null)
      return {
        ...i,
        missing: null,
        available: false,
        hasStock: available.some((f) => normalizeName(f.name) === normalizeName(i.name)),
      };
    const required = Math.round(i.quantity * factor * 1000000) / 1000000;
    let need = required;
    for (const food of available) {
      if (normalizeName(food.name) !== normalizeName(i.name)) continue;
      const stock = convertQuantity(remaining.get(food.id), food.unit, i.unit);
      if (stock == null || stock <= 0 || need <= 0.000001) continue;
      const used = Math.min(need, stock);
      const nativeUsed = convertQuantity(used, i.unit, food.unit);
      remaining.set(food.id, Math.max(0, remaining.get(food.id) - nativeUsed));
      allocations.set(food.id, {
        foodId: food.id,
        name: food.name,
        unit: food.unit,
        quantity: (allocations.get(food.id)?.quantity || 0) + nativeUsed,
        expectedUpdatedAt: food.updatedAt,
      });
      if (food.days <= 3) urgency++;
      need -= used;
    }
    return {
      ...i,
      quantity: required,
      missing: Math.max(0, Math.round(need * 1000000) / 1000000),
      available: need <= 0.000001,
    };
  });
  const readyCount = ingredients.filter((i) => i.available).length;
  return {
    ingredients,
    entries: [...allocations.values()],
    readyCount,
    presentCount: ingredients.filter(
      (i) => i.hasStock || i.available || (i.quantity != null && i.missing < i.quantity),
    ).length,
    score: (readyCount / ingredients.length) * 100 + urgency * 5,
    servings,
  };
}

// Subtract each shopping row once, including when a recipe repeats an ingredient in g/kg.
export function planShopping(ingredients, shopping) {
  const groups = [];
  for (const ingredient of ingredients.filter((i) => i.missing > 0)) {
    const group = groups.find(
      (g) =>
        normalizeName(g.name) === normalizeName(ingredient.name) &&
        convertQuantity(ingredient.missing, ingredient.unit, g.unit) != null,
    );
    if (group) group.quantity += convertQuantity(ingredient.missing, ingredient.unit, group.unit);
    else
      groups.push({ name: ingredient.name, quantity: ingredient.missing, unit: ingredient.unit });
  }
  const remaining = shopping.map((s) => ({ ...s, quantity: Number(s.quantity) }));
  return groups
    .map((g) => {
      let need = g.quantity;
      for (const item of remaining) {
        if (normalizeName(item.name) !== normalizeName(g.name)) continue;
        const available = convertQuantity(item.quantity, item.unit, g.unit);
        if (available == null || available <= 0 || need <= 0) continue;
        const used = Math.min(need, available);
        item.quantity -= convertQuantity(used, g.unit, item.unit);
        need -= used;
      }
      return { ...g, quantity: Math.max(0, Math.round(need * 1000000) / 1000000) };
    })
    .filter((g) => g.quantity > 0.000001);
}
