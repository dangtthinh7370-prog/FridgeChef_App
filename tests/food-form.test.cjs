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

test('barcode fills known package data, keeps lot dates and preserves existing notes', () => {
  const { readBarcodeProduct, applyBarcodeProduct } = require('./load-source.cjs')('src/models/barcode.js');
  const product = readBarcodeProduct({
    product_name_vi: 'Sữa tươi', brands: 'Nhãn mẫu', quantity: '6 x 250 ml',
    product_quantity: 1500, product_quantity_unit: 'ml', categories_tags: ['en:milks'],
  }, '12345678');
  const form = { quantity: '2', unit: 'chai', notes: 'Để ở kệ trên', expDate: '28/11/2026', buyDate: '24/11/2026' };
  const filled = applyBarcodeProduct(form, product);
  assert.equal(filled.quantity, '1500');
  assert.equal(filled.unit, 'ml');
  assert.equal(filled.category, 'dairy');
  assert.equal(filled.expDate, form.expDate);
  assert.match(filled.notes, /Để ở kệ trên.*Thương hiệu: Nhãn mẫu.*Mã vạch: 12345678/s);
  const limited = applyBarcodeProduct(form, readBarcodeProduct({ product_name: 'Unknown package', quantity: 'one pack' }, '12345678'));
  assert.equal(limited.quantity, '2');
  assert.equal(limited.unit, 'chai');
});

test('shopping transfer marks the first invalid item and keeps edits until a valid save', async () => {
  const React = require('react');
  const { act, create } = require('react-test-renderer');
  const makeLoader = require('./load-ui.cjs');
  const writes = [];
  const model = makeLoader({
    'src/viewmodels/FridgeProvider': {
      useFridgeViewModel: () => ({
        foods: [],
        shopping: [
          { id: 'one', name: 'Táo', quantity: 2, unit: 'quả', bought: true },
          { id: 'two', name: 'Gạo', quantity: 1, unit: 'kg', bought: true },
        ],
        mutate: async (...args) => { writes.push(args); return 2; },
      }),
    },
  })('src/viewmodels/useShoppingViewModel').default;
  let vm;
  function Probe() { vm = model(); return null; }
  let tree;
  await act(async () => { tree = create(React.createElement(Probe)); });
  await act(async () => vm.openTransfer());
  assert.equal(vm.transferDirty, false);
  let result;
  await act(async () => { result = await vm.move(); });
  assert.equal(result.invalidId, 'one');
  assert.ok(vm.transferErrors.one.expDate);
  assert.ok(vm.transferErrors.two.expDate);
  assert.equal(writes.length, 0);
  await act(async () => vm.setTransferField('one', 'expDate', vm.transfer[0].buyDate));
  assert.equal(vm.transferDirty, true);
  assert.equal(vm.transferErrors.one.expDate, undefined);
  assert.ok(vm.transferErrors.two.expDate);
  await act(async () => vm.setTransferField('two', 'expDate', vm.transfer[1].buyDate));
  await act(async () => { result = await vm.move(); });
  assert.equal(result.count, 2);
  assert.equal(vm.mode, null);
  assert.equal(writes.length, 1);
  await act(async () => tree.unmount());
});
