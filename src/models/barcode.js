const units = { g: 'g', kg: 'kg', ml: 'ml', cl: 'ml', l: 'lít' };
const productCategories = [
  ['dairy', ['en:milks', 'en:yogurts', 'en:cheeses', 'en:eggs']],
  ['protein', ['en:meats', 'en:fishes', 'en:seafoods']],
  ['vegetables', ['en:vegetables']],
  ['fruit', ['en:fruits']],
  ['pantry', ['en:pastas', 'en:rices', 'en:flours', 'en:cereals']],
];

export function readBarcodeProduct(raw, barcode) {
  const trimmed = (value, limit) => (typeof value === 'string' ? value.trim().slice(0, limit) : '');
  const name =
    trimmed(raw?.product_name_vi, 100) ||
    trimmed(raw?.product_name, 100) ||
    trimmed(raw?.product_name_en, 100);
  if (!name) return null;
  const brand = trimmed(raw.brands, 100);
  const packageLabel = trimmed(raw.quantity, 80);
  const tags = Array.isArray(raw.categories_tags) ? raw.categories_tags : [];
  const category = productCategories.find(([, values]) =>
    values.some((value) => tags.includes(value)),
  )?.[0];

  const measure = /^(\d+(?:[.,]\d+)?)\s*(kg|g|ml|cl|l)$/i.exec(packageLabel);
  const sourceUnit = String(raw.product_quantity_unit || '')
    .trim()
    .toLowerCase();
  const unitKey = measure ? measure[2].toLowerCase() : sourceUnit;
  const unit = units[unitKey];
  const quantity =
    (measure ? Number(measure[1].replace(',', '.')) : Number(raw.product_quantity)) *
    (unitKey === 'cl' ? 10 : 1);
  const image = /^https:\/\/images\.openfoodfacts\.org\//i.test(raw.image_front_url)
    ? raw.image_front_url
    : null;
  return {
    name,
    brand,
    packageLabel,
    image,
    barcode,
    category,
    ...(unit && Number.isFinite(quantity) && quantity > 0 && quantity <= 1000000
      ? { quantity: String(quantity), unit }
      : {}),
  };
}

export function applyBarcodeProduct(form, product) {
  const facts = [
    product.brand && 'Thương hiệu: ' + product.brand,
    product.packageLabel && 'Quy cách: ' + product.packageLabel,
    'Mã vạch: ' + product.barcode,
  ]
    .filter(Boolean)
    .join('\n');
  const notes = form.notes
    .split('\n')
    .filter((line) => !/^(Thương hiệu|Quy cách|Mã vạch): /.test(line))
    .join('\n');
  const available = 500 - notes.length - (notes ? 1 : 0);
  return {
    ...form,
    name: product.name,
    ...(product.category ? { category: product.category } : {}),
    ...(product.unit ? { quantity: product.quantity, unit: product.unit } : {}),
    notes: [notes, facts.length <= available ? facts : ''].filter(Boolean).join('\n'),
  };
}
