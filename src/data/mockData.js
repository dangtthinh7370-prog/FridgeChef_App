// src/data/mockData.js
// Dữ liệu mẫu dùng cho Tuần 2 (UI Demo) trước khi tích hợp Firebase ở Tuần 3-4

export const MOCK_AUTH_USER = {
  email: 'fridgechef@example.com',
  password: '123456',
  name: 'Người dùng FridgeChef',
  avatarCode: 'FC',
  householdId: 'HOUSE_FC_888',
};

export const MOCK_FOODS = [
  { id: '1', name: 'Rau cải', quantity: '500 g', daysLeft: 'Còn 5 ngày', status: 'valid', area: 'Ngăn mát', code: 'RC', buyDate: '05/11/2026', expDate: '10/11/2026' },
  { id: '2', name: 'Cà chua', quantity: '3 quả', daysLeft: 'Còn 1 ngày', status: 'soon', area: 'Ngăn mát', code: 'CT', buyDate: '05/11/2026', expDate: '06/11/2026' },
  { id: '3', name: 'Sữa tươi', quantity: '1 hộp', daysLeft: 'Đã hết hạn', status: 'expired', area: 'Ngăn mát', code: 'ST', buyDate: '28/10/2026', expDate: '04/11/2026' },
  { id: '4', name: 'Trứng gà', quantity: '6 quả', daysLeft: 'Còn 8 ngày', status: 'valid', area: 'Ngăn mát', code: 'TR', buyDate: '05/11/2026', expDate: '13/11/2026' },
  { id: '5', name: 'Thịt gà', quantity: '500 g', daysLeft: 'Còn 2 ngày', status: 'soon', area: 'Ngăn đông', code: 'TG', buyDate: '04/11/2026', expDate: '06/11/2026' },
  { id: '6', name: 'Thịt bò phi lê', quantity: '400 g', daysLeft: 'Còn 15 ngày', status: 'valid', area: 'Ngăn đông', code: 'TB', buyDate: '01/11/2026', expDate: '20/11/2026' },
  { id: '7', name: 'Mì gói Hảo Hảo', quantity: '5 gói', daysLeft: 'Còn 60 ngày', status: 'valid', area: 'Đồ khô', code: 'HH', buyDate: '01/11/2026', expDate: '01/01/2027' },
  { id: '8', name: 'Gạo ST25', quantity: '5 kg', daysLeft: 'Còn 90 ngày', status: 'valid', area: 'Đồ khô', code: 'GA', buyDate: '01/11/2026', expDate: '01/02/2027' },
];

export const MOCK_RECIPES = [
  {
    id: '1',
    title: 'Gà sốt cà chua',
    time: '30 phút',
    level: 'Dễ nấu',
    servings: '2 người',
    code: 'GÀ',
    ingredients: [
      { name: 'Thịt gà', quantity: '500 g', available: true },
      { name: 'Cà chua', quantity: '3 quả', available: true },
      { name: 'Hành tím', quantity: '2 củ', available: false },
    ],
    steps: [
      { step: 1, title: 'Sơ chế nguyên liệu', desc: 'Rửa sạch thịt gà, chặt miếng vừa ăn. Cà chua rửa sạch, bổ múi cau.' },
      { step: 2, title: 'Xào thịt gà', desc: 'Cho một ít dầu vào chảo, phi thơm hành tím. Thêm thịt gà và đảo đều.', timer: '05:00' },
      { step: 3, title: 'Om cùng sốt cà chua', desc: 'Cho cà chua vào xào nhừ tạo sốt, nêm gia vị vừa ăn rồi om nhỏ lửa trong 15 phút.', timer: '15:00' },
    ],
  },
  {
    id: '2',
    title: 'Canh rau cải thịt băm',
    time: '20 phút',
    level: 'Dễ nấu',
    servings: '2-3 người',
    code: 'RAU',
    ingredients: [
      { name: 'Rau cải', quantity: '500 g', available: true },
      { name: 'Thịt băm', quantity: '200 g', available: false },
      { name: 'Gừng', quantity: '1 nhánh', available: true },
    ],
    steps: [
      { step: 1, title: 'Sơ chế', desc: 'Rau cải cắt khúc, rửa sạch để ráo nước.' },
      { step: 2, title: 'Nấu nước dùng', desc: 'Đun sôi nước, cho thịt băm vào khuấy đều cho thịt tơi ra.' },
      { step: 3, title: 'Cho rau vào', desc: 'Nước sôi lại cho rau cải vào nấu sôi 3 phút rồi tắt bếp.', timer: '03:00' },
    ],
  },
  {
    id: '3',
    title: 'Trứng chiên cà chua',
    time: '15 phút',
    level: 'Dễ nấu',
    servings: '2 người',
    code: 'TR',
    ingredients: [
      { name: 'Trứng gà', quantity: '3 quả', available: true },
      { name: 'Cà chua', quantity: '2 quả', available: true },
      { name: 'Hành lá', quantity: '2 nhánh', available: false },
    ],
    steps: [
      { step: 1, title: 'Đánh trứng', desc: 'Đập trứng ra bát, thêm một thìa nước mắm và tiêu rồi đánh tan.' },
      { step: 2, title: 'Xào cà chua', desc: 'Phi thơm hành, xào cà chua đến khi mềm.' },
      { step: 3, title: 'Chiên trứng', desc: 'Đổ trứng vào đảo đều tay cho chín bông xốp.', timer: '04:00' },
    ],
  },
];

export const MOCK_SHOPPING = [
  { id: '1', name: 'Hành tím', quantity: '2 củ', bought: false },
  { id: '2', name: 'Cà rốt', quantity: '500 g', bought: false },
  { id: '3', name: 'Sữa tươi', quantity: '1 hộp', bought: false },
  { id: '4', name: 'Trứng gà', quantity: '6 quả', bought: true },
  { id: '5', name: 'Rau cải', quantity: '1 bó', bought: true },
];
