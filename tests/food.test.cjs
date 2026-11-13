const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-source.cjs');
const { parseDate, formatDate, todayISO, decorateFood, validateFood, validateQuantity, parseQuantityText } = load('src/models/food.js');

test('original quantity input is split into numeric quantity and unit for SQLite', () => {
  assert.deepEqual(parseQuantityText('3 quả'), { quantity: 3, unit: 'quả' });
  assert.deepEqual(parseQuantityText(' 0,5 kg '), { quantity: 0.5, unit: 'kg' });
  assert.deepEqual(parseQuantityText('500 g'), { quantity: 500, unit: 'g' });
  for (const input of ['3', 'hộp', '-2 quả', '0 hộp', '2 ' + 'g'.repeat(21)]) assert.throws(() => parseQuantityText(input));
});

test('calendar validation rejects impossible dates and accepts leap days', () => {
  assert.equal(parseDate('29/02/2024'), '2024-02-29');
  assert.equal(formatDate('2026-11-12'), '12/11/2026');
  for (const value of ['29/02/2025', '31/04/2026', '00/11/2026', '12/13/2026', '2026-11-12', '1/1/2026', '01/01/0099']) assert.throws(() => parseDate(value));
});

test('quantity validation accepts Vietnamese decimals and rejects nonnumeric input', () => {
  assert.equal(validateQuantity('0,5'), 0.5);
  for (const value of ['', '0', '-1', '2 hộp', 'Infinity', '1e3', '1000001']) assert.throws(() => validateQuantity(value));
});

test('food validation checks dates, area, required fields and limits', () => {
  const valid = { name: ' Cà chua ', quantity: '3', unit: 'quả', storageAreaId: 'cool', buyDate: '12/11/2026', expDate: '15/11/2026' };
  assert.equal(validateFood(valid).name, 'Cà chua');
  assert.throws(() => validateFood({ ...valid, expDate: '11/11/2026' }), /trước ngày mua/);
  assert.throws(() => validateFood({ ...valid, storageAreaId: 'bad' }), /ngăn/);
  assert.throws(() => validateFood({ ...valid, unit: '' }), /Đơn vị/);
  assert.throws(() => validateFood({ ...valid, name: ' '.repeat(4) }), /Tên/);
});

test('expiry boundaries are calculated from local calendar days (today, +3, +4)', () => {
  const now = new Date(2026, 10, 12, 23, 59);
  const food = expiresAt => decorateFood({ id: 1, name: 'Sữa tươi', quantity: 2, unit: 'hộp', storageAreaId: 'cool', purchasedAt: '2026-11-10', expiresAt }, now);
  assert.equal(todayISO(now), '2026-11-12');
  assert.equal(food('2026-11-11').status, 'expired');
  assert.equal(food('2026-11-12').daysLeft, 'Hết hạn hôm nay');
  assert.equal(food('2026-11-15').status, 'soon');
  assert.equal(food('2026-11-16').status, 'valid');
  assert.equal(food('2027-01-01').days, 50);
  assert.equal(food('2026-11-15').quantityText, '2 hộp');
});
