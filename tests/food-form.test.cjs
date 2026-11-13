const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load-source.cjs');
const { createFoodForm, getFoodFormErrors, stepQuantity, monthCells } = load('src/models/foodForm.js');

test('new food defaults purchase to today, never invents an expiry date', () => {
  const form = createFoodForm(null, null, new Date(2026, 10, 12));
  assert.equal(form.buyDate, '12/11/2026');
  assert.equal(form.expDate, '');
  assert.equal(form.quantity, '1');
  assert.equal(form.notes, '');
  assert.ok(getFoodFormErrors(form).name);
  assert.ok(getFoodFormErrors(form).expDate);
});

test('save-and-add-next retains storage and unit but clears product-specific details', () => {
  const previous = { name: 'Sữa', quantity: '3', unit: 'hộp', storageAreaId: 'frozen', expDate: '20/11/2026', category: 'dairy', notes: 'Đã mở hộp' };
  const next = createFoodForm(null, previous, new Date(2026, 10, 12));
  assert.equal(next.storageAreaId, 'frozen');
  assert.equal(next.unit, 'hộp');
  assert.equal(next.name, '');
  assert.equal(next.expDate, '');
  assert.equal(next.quantity, '1');
  assert.equal(next.notes, '');
  assert.equal(next.category, 'other');
});

test('edit form retains saved dates, quantity, custom units and metadata', () => {
  const existing = { name: 'Đậu hũ', quantity: 0.5, unit: 'khay', storageAreaId: 'cool', buyDate: '10/11/2026', expDate: '15/11/2026', category: 'other', notes: 'Kệ trên' };
  const form = createFoodForm(existing);
  assert.equal(form.quantity, '0.5');
  assert.equal(form.unit, 'khay');
  assert.equal(form.buyDate, existing.buyDate);
  assert.equal(form.expDate, existing.expDate);
  assert.equal(form.notes, existing.notes);
  assert.deepEqual(getFoodFormErrors(form), {});
});

test('form validation associates invalid quantity and expiry with the correct fields', () => {
  const form = { ...createFoodForm(), name: 'Gạo', quantity: '0', expDate: '01/01/2020' };
  const errors = getFoodFormErrors(form);
  assert.ok(errors.quantity);
  assert.ok(errors.expDate);
  assert.equal(errors.name, undefined);
});

test('quantity controls handle decimal values and keep values inside database bounds', () => {
  assert.equal(stepQuantity('2', 1), '3');
  assert.equal(stepQuantity('2', -1), '1');
  assert.equal(stepQuantity('1', -1), '1');
  assert.equal(stepQuantity('0,5', 1), '0.6');
  assert.equal(stepQuantity('0.1', -1), '0.1');
  assert.equal(stepQuantity('1000000', 1), '1000000');
  assert.equal(stepQuantity('', 1), '1');
});

test('calendar starts weeks on Monday and includes leap day without date rollover', () => {
  const feb = monthCells(2024, 1);
  assert.equal(feb.length % 7, 0);
  assert.deepEqual(feb.slice(0, 4), [null, null, null, '2024-02-01']);
  assert.ok(feb.includes('2024-02-29'));
  assert.equal(feb.filter(Boolean).length, 29);
  assert.equal(monthCells(2025, 1).filter(Boolean).length, 28);
  assert.equal(monthCells(2026, 10).filter(Boolean).length, 30);
});
