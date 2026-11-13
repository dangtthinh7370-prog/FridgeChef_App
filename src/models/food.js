// Dates are calendar dates (YYYY-MM-DD), not UTC instants.
export const STORAGE_AREAS = [
  { id: 'cool', name: 'Ngăn mát' },
  { id: 'frozen', name: 'Ngăn đông' },
  { id: 'dry', name: 'Đồ khô' },
];

export const FOOD_CATEGORIES = [
  { id: 'vegetables', name: 'Rau củ', icon: 'leaf-outline' },
  { id: 'fruit', name: 'Trái cây', icon: 'nutrition-outline' },
  { id: 'protein', name: 'Thịt, cá', icon: 'fish-outline' },
  { id: 'dairy', name: 'Trứng, sữa', icon: 'egg-outline' },
  { id: 'pantry', name: 'Đồ khô', icon: 'basket-outline' },
  { id: 'other', name: 'Khác', icon: 'grid-outline' },
];

export function todayISO(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function parseDate(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(value).trim());
  if (!match) throw new Error('Ngày phải có định dạng dd/MM/yyyy.');
  const [, day, month, year] = match.map(Number);
  const date = new Date(year, month - 1, day);
  if (year < 1900 || year > 9999 || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error('Ngày không hợp lệ. Vui lòng kiểm tra lại.');
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function formatDate(iso) {
  return iso.split('-').reverse().join('/');
}

export function validateQuantity(value) {
  const text = String(value).trim().replace(',', '.');
  const quantity = /^\d+(\.\d+)?$/.test(text) ? Number(text) : NaN;
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1000000) {
    throw new Error('Số lượng phải lớn hơn 0 và không quá 1.000.000.');
  }
  return quantity;
}

// Keep the team's original single input ("3 quả" / "500 g") while storing
// quantity and unit separately in the database.
export function parseQuantityText(value) {
  const match = /^(\d+(?:[.,]\d+)?)\s+(.+)$/.exec(String(value).trim());
  if (!match) throw new Error('Nhập số lượng kèm đơn vị, ví dụ: 3 quả hoặc 500 g.');
  const unit = match[2].trim();
  if (!unit || unit.length > 20) throw new Error('Đơn vị phải có từ 1 đến 20 ký tự.');
  return { quantity: validateQuantity(match[1]), unit };
}

export function validateShopping(input) {
  const name = String(input.name || '').trim();
  const unit = String(input.unit || '').trim();
  if (!name || name.length > 100) throw new Error('Tên phải có từ 1 đến 100 ký tự.');
  if (!unit || unit.length > 20) throw new Error('Đơn vị phải có từ 1 đến 20 ký tự.');
  return { name, quantity: validateQuantity(input.quantity), unit };
}

export function validateFood(input) {
  const base = validateShopping(input);
  if (!STORAGE_AREAS.some(area => area.id === input.storageAreaId)) throw new Error('Vui lòng chọn ngăn lưu trữ.');
  const purchasedAt = parseDate(input.buyDate);
  const expiresAt = parseDate(input.expDate);
  if (expiresAt < purchasedAt) throw new Error('Hạn dùng không được trước ngày mua.');
  const category = input.category || 'other';
  const notes = String(input.notes || '').trim();
  if (!FOOD_CATEGORIES.some(item => item.id === category)) throw new Error('Nhóm thực phẩm không hợp lệ.');
  if (notes.length > 500) throw new Error('Ghi chú không được quá 500 ký tự.');
  return { ...base, storageAreaId: input.storageAreaId, purchasedAt, expiresAt, category, notes };
}

export function decorateFood(food, now = new Date()) {
  // UTC arithmetic on calendar components avoids 23/25-hour DST days.
  const calendarDay = value => {
    const [y, m, d] = value.split('-').map(Number);
    return Date.UTC(y, m - 1, d) / 86400000;
  };
  const days = calendarDay(food.expiresAt) - calendarDay(todayISO(now));
  return {
    ...food,
    area: STORAGE_AREAS.find(area => area.id === food.storageAreaId)?.name || '',
    quantityText: `${food.quantity} ${food.unit}`,
    buyDate: formatDate(food.purchasedAt),
    expDate: formatDate(food.expiresAt),
    status: days < 0 ? 'expired' : days <= 3 ? 'soon' : 'valid',
    daysLeft: days < 0 ? `Quá hạn ${-days} ngày` : days === 0 ? 'Hết hạn hôm nay' : `Còn ${days} ngày`,
    days,
    code: food.name.split(/\s+/).map(word => word[0]).slice(0, 2).join('').toUpperCase(),
  };
}
