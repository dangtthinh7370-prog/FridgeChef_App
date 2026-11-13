import { todayISO, formatDate, parseDate, validateQuantity, FOOD_CATEGORIES } from './food.js';

export const QUICK_UNITS = ['quả', 'g', 'kg', 'hộp', 'chai', 'gói', 'bó', 'cái', 'lít', 'ml'];
export const QUICK_FOODS = [
  { name: 'Trứng gà', unit: 'quả', category: 'dairy' },
  { name: 'Sữa tươi', unit: 'hộp', category: 'dairy' },
  { name: 'Cà chua', unit: 'quả', category: 'vegetables' },
  { name: 'Thịt gà', unit: 'g', category: 'protein' },
];

export function createFoodForm(existing, previous, now = new Date()) {
  return {
    name: existing?.name || '',
    quantity: existing ? String(existing.quantity) : '1',
    unit: existing?.unit || previous?.unit || 'quả',
    storageAreaId: existing?.storageAreaId || previous?.storageAreaId || 'cool',
    buyDate: existing?.buyDate || formatDate(todayISO(now)),
    // An expiry is a product fact; never invent one based on food type.
    expDate: existing?.expDate || '',
    category: existing?.category || 'other',
    notes: existing?.notes || '',
  };
}

export function getShoppingFormErrors(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Bạn chưa nhập tên thực phẩm.';
  else if (form.name.trim().length > 100) errors.name = 'Tên không được quá 100 ký tự.';
  try { validateQuantity(form.quantity); } catch (error) { errors.quantity = error.message; }
  if (!form.unit.trim() || form.unit.trim().length > 20) errors.unit = 'Chọn hoặc nhập đơn vị (tối đa 20 ký tự).';
  return errors;
}

export function getFoodFormErrors(form) {
  const errors = getShoppingFormErrors(form);
  let purchasedAt;
  let expiresAt;
  try { purchasedAt = parseDate(form.buyDate); } catch { errors.buyDate = 'Chọn ngày mua hợp lệ.'; }
  try { expiresAt = parseDate(form.expDate); } catch { errors.expDate = 'Chọn hạn sử dụng ghi trên sản phẩm.'; }
  if (purchasedAt && expiresAt && expiresAt < purchasedAt) errors.expDate = 'Hạn sử dụng phải bằng hoặc sau ngày mua.';
  if (!FOOD_CATEGORIES.some(item => item.id === form.category)) errors.category = 'Chọn nhóm thực phẩm hợp lệ.';
  if (form.notes.length > 500) errors.notes = 'Ghi chú không được quá 500 ký tự.';
  return errors;
}

export function quantityPresets(unit) {
  if (['g', 'ml'].includes(unit)) return ['100', '250', '500', '1000'];
  if (['kg', 'lít'].includes(unit)) return ['0.5', '1', '2', '5'];
  return ['1', '2', '3', '5'];
}

export function stepQuantity(value, direction) {
  let quantity;
  try { quantity = validateQuantity(value); } catch { return '1'; }
  const step = quantity < 1 ? 0.1 : 1;
  const minimum = quantity < 1 ? 0.1 : 1;
  return String(Math.min(1000000, Math.max(minimum, Math.round((quantity + direction * step) * 1000) / 1000)));
}

export function monthCells(year, month) {
  const start = (new Date(year, month, 1).getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: Math.ceil((start + count) / 7) * 7 }, (_, index) => {
    const day = index - start + 1;
    return day < 1 || day > count ? null : todayISO(new Date(year, month, day));
  });
}
