const LOCAL_RECIPES = [
  {
    id: 'egg-tomato',
    title: 'Trứng xào cà chua',
    minutes: 15,
    servings: 2,
    ingredients: [
      { name: 'Trứng gà', quantity: 3, unit: 'quả' },
      { name: 'Cà chua', quantity: 2, unit: 'quả' },
    ],
    steps: [
      {
        title: 'Sơ chế',
        desc: 'Rửa cà chua, cắt miếng. Đập trứng vào bát riêng, đánh đều với gia vị vừa ăn.',
        seconds: 0,
      },
      {
        title: 'Xào cà chua',
        desc: 'Làm nóng ít dầu, cho cà chua vào đảo đến khi mềm.',
        seconds: 180,
      },
      {
        title: 'Làm chín trứng',
        desc: 'Cho trứng vào chảo, đảo nhẹ đến khi trứng chín hoàn toàn rồi tắt bếp.',
        seconds: 240,
      },
    ],
  },
  {
    id: 'chicken-tomato',
    title: 'Gà sốt cà chua',
    minutes: 30,
    servings: 2,
    ingredients: [
      { name: 'Thịt gà', quantity: 500, unit: 'g' },
      { name: 'Cà chua', quantity: 3, unit: 'quả' },
    ],
    steps: [
      {
        title: 'Chuẩn bị',
        desc: 'Cắt thịt gà thành miếng vừa ăn trên thớt riêng. Rửa và cắt cà chua. Rửa sạch tay, dụng cụ sau khi tiếp xúc thịt sống.',
        seconds: 0,
      },
      {
        title: 'Xào gà',
        desc: 'Làm nóng dầu, thêm thịt gà và đảo đều cho săn mặt ngoài.',
        seconds: 300,
      },
      {
        title: 'Om sốt',
        desc: 'Thêm cà chua, chút nước và gia vị. Om đến khi thịt gà chín hoàn toàn; kiểm tra phần dày nhất đạt 74°C, kéo dài thời gian nếu cần.',
        seconds: 900,
      },
    ],
  },
  {
    id: 'vegetable-soup',
    title: 'Canh rau cải thịt băm',
    minutes: 20,
    servings: 2,
    ingredients: [
      { name: 'Rau cải', quantity: 500, unit: 'g' },
      { name: 'Thịt băm', quantity: 200, unit: 'g' },
    ],
    steps: [
      {
        title: 'Sơ chế',
        desc: 'Nhặt, rửa sạch rau và cắt khúc. Để riêng với thịt sống.',
        seconds: 0,
      },
      {
        title: 'Nấu thịt',
        desc: 'Đun nước sôi, cho thịt băm vào khuấy tơi và nấu chín hoàn toàn.',
        seconds: 420,
      },
      { title: 'Thêm rau', desc: 'Cho rau vào, nêm vừa ăn và nấu đến khi rau chín.', seconds: 180 },
    ],
  },
  {
    id: 'boiled-egg',
    title: 'Trứng luộc',
    minutes: 15,
    servings: 2,
    ingredients: [{ name: 'Trứng gà', quantity: 4, unit: 'quả' }],
    steps: [
      { title: 'Chuẩn bị', desc: 'Đặt trứng trong nồi, thêm nước ngập mặt trứng.', seconds: 0 },
      {
        title: 'Luộc',
        desc: 'Đun sôi rồi giảm lửa, nấu cho lòng trắng và lòng đỏ chín chắc.',
        seconds: 600,
      },
      {
        title: 'Hoàn thành',
        desc: 'Vớt trứng vào nước mát rồi bóc vỏ. Dùng ngay hoặc bảo quản lạnh.',
        seconds: 0,
      },
    ],
  },
];

module.exports = { LOCAL_RECIPES };
