const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { act, create } = require('react-test-renderer');
const makeLoader = require('./load-ui.cjs');
const loadModel = require('./load-source.cjs');
const { LOCAL_RECIPES } = require('./recipe-fixtures.cjs');
function fixture(overrides = {}) {
  const alerts = [],
    mutations = [],
    navigationCalls = [];
  const foods = [
    {
      id: 'egg',
      name: 'Trứng gà',
      quantity: 6,
      unit: 'quả',
      expiresAt: '2099-12-31',
      updatedAt: '2026-11-16T00:00:00Z',
      status: 'valid',
      days: 20,
      quantityText: '6 quả',
      area: 'Ngăn mát',
    },
  ];
  const vm = {
    foods,
    shopping: [],
    busy: false,
    offline: false,
    reminderEnabled: false,
    toggleReminder: async () => {},
    reload: async () => {},
    refreshing: false,
    mutate: async (...args) => {
      mutations.push(args);
      return { count: 1 };
    },
    ...overrides,
  };
  const navigation = {
    goBack() {
      navigationCalls.push('back');
    },
    navigate(...args) {
      navigationCalls.push(args);
    },
    popToTop() {
      navigationCalls.push('top');
    },
    addListener() {
      return () => {};
    },
  };
  const host = {};
  for (const name of [
    'View',
    'Text',
    'Pressable',
    'TouchableOpacity',
    'ScrollView',
    'TextInput',
    'ActivityIndicator',
    'Switch',
    'FlatList',
    'RefreshControl',
  ])
    host[name] = name;
  const load = makeLoader({
    'react-native': {
      ...host,
      Platform: { OS: 'android' },
      StyleSheet: { create: (x) => x },
      Alert: { alert: (...a) => alerts.push(a) },
      AppState: { addEventListener: () => ({ remove() {} }) },
    },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@expo/vector-icons': { Ionicons: 'Ionicons' },
    'expo-keep-awake': { useKeepAwake() {} },
    'expo-crypto': { randomUUID: require('node:crypto').randomUUID },
    'src/services/notifications': { scheduleTimer: async () => null, cancelTimer() {} },
    'src/viewmodels/FridgeProvider': { useFridgeViewModel: () => vm },
    'src/viewmodels/RecipeProvider': {
      useRecipes: () => ({
        recipes: LOCAL_RECIPES,
        favorites: [],
        addRecipes() {},
        toggleFavorite() {},
      }),
    },
  });
  return { load, vm, navigation, alerts, mutations, navigationCalls };
}
const button = (tree, title) =>
  tree.root.findAll((n) => typeof n.type === 'function' && n.props.title === title)[0];
test('cooking follows the chosen recipe and deducts only after final confirmation', async () => {
  const f = fixture();
  const Screen = f.load('src/screens/recipe/CookingModeScreen').default;
  let tree;
  await act(async () => {
    tree = create(
      React.createElement(Screen, {
        navigation: f.navigation,
        route: { params: { recipe: LOCAL_RECIPES[3], servings: 2 } },
      }),
    );
  });
  assert.match(JSON.stringify(tree.toJSON()), /Chuẩn bị/);
  assert.equal(f.mutations.length, 0);
  await act(async () => button(tree, 'Bước tiếp theo').props.onPress());
  assert.match(JSON.stringify(tree.toJSON()), /Luộc/);
  await act(async () => button(tree, 'Bước tiếp theo').props.onPress());
  await act(async () => button(tree, 'Hoàn thành · Kiểm tra lượng dùng').props.onPress());
  assert.equal(f.mutations.length, 0);
  await act(async () => button(tree, 'Xác nhận và hoàn thành').props.onPress());
  assert.equal(f.mutations[0][0], 'consumeFood');
  assert.equal(f.mutations[0][1].entries[0].quantity, 4);
  assert.equal(f.mutations[0][1].reason, 'cooked');
  assert.match(JSON.stringify(tree.toJSON()), /Hoàn thành món ăn/);
  await act(async () => tree.unmount());
});
test('recipe detail subtracts existing shopping quantities from missing ingredients', async () => {
  const f = fixture({ shopping: [{ name: 'Cà chua', quantity: 1, unit: 'quả', bought: false }] });
  const Screen = f.load('src/screens/recipe/RecipeDetailScreen').default;
  let tree;
  await act(async () => {
    tree = create(
      React.createElement(Screen, {
        navigation: f.navigation,
        route: { params: { recipe: LOCAL_RECIPES[0], servings: 2 } },
      }),
    );
  });
  await act(async () => button(tree, 'Thêm 1 nguyên liệu thiếu vào đi chợ').props.onPress());
  assert.equal(f.mutations[0][0], 'addRecipeShopping');
  assert.deepEqual(f.mutations[0][1].entries, [{ name: 'Cà chua', unit: 'quả', quantity: 1 }]);
  await act(async () => tree.unmount());
});
test('expiry reminder toggle calls the real viewmodel action and shows errors', async () => {
  const f = fixture({
    toggleReminder: async () => {
      throw new Error('Quyền thông báo bị từ chối');
    },
  });
  const Screen = f.load('src/screens/home/ExpiryAlertScreen').default;
  let tree;
  await act(async () => {
    tree = create(React.createElement(Screen, { navigation: f.navigation, route: { params: {} } }));
  });
  await act(async () => tree.root.findByType('Switch').props.onValueChange(true));
  assert.match(f.alerts[0][1], /bị từ chối/);
  await act(async () => tree.unmount());
});
test('use-food form rejects quantities over stock before writing', async () => {
  const f = fixture();
  const Screen = f.load('src/screens/fridge/UseFoodScreen').default;
  let tree;
  await act(async () => {
    tree = create(
      React.createElement(Screen, {
        navigation: f.navigation,
        route: { params: { foodId: 'egg' } },
      }),
    );
  });
  await act(async () => tree.root.findByType('TextInput').props.onChangeText('99'));
  await act(async () => button(tree, 'Xác nhận cập nhật').props.onPress());
  assert.equal(f.mutations.length, 0);
  assert.match(JSON.stringify(tree.toJSON()), /vượt quá/);
  await act(async () => tree.unmount());
});

test('use-food form requires review when another device updated the stock', async () => {
  const f = fixture();
  const Screen = f.load('src/screens/fridge/UseFoodScreen').default;
  const createScreen = () =>
    React.createElement(Screen, {
      navigation: f.navigation,
      route: { params: { foodId: 'egg' } },
    });
  let tree;
  await act(async () => {
    tree = create(createScreen());
  });
  await act(async () => tree.root.findByType('TextInput').props.onChangeText('1'));
  f.vm.foods = f.vm.foods.map((food) =>
    food.id === 'egg' ? { ...food, updatedAt: 'new-version' } : food,
  );
  await act(async () => tree.update(createScreen()));
  assert.equal(button(tree, 'Xác nhận cập nhật').props.disabled, true);
  await act(async () => button(tree, 'Xác nhận cập nhật').props.onPress());
  assert.equal(f.mutations.length, 0);
  await act(async () => button(tree, 'Dùng số lượng mới').props.onPress());
  assert.equal(tree.root.findByType('TextInput').props.value, '');
  await act(async () => tree.root.findByType('TextInput').props.onChangeText('1'));
  await act(async () => button(tree, 'Xác nhận cập nhật').props.onPress());
  assert.equal(f.mutations[0][1].entries[0].expectedUpdatedAt, 'new-version');
  await act(async () => button(tree, 'Về tủ lạnh').props.onPress());
  assert.deepEqual(f.navigationCalls.at(-1), ['MainTabs', { screen: 'Tủ lạnh' }]);
  await act(async () => tree.unmount());
});

test('food preferences screen saves the three groups and returns to profile', async () => {
  const saved = [];
  let wentBack = false;
  const hostNames = [
    'View',
    'Text',
    'TextInput',
    'Pressable',
    'ScrollView',
    'KeyboardAvoidingView',
    'ActivityIndicator',
  ];
  const Screen = makeLoader({
    'react-native': {
      ...Object.fromEntries(hostNames.map((name) => [name, name])),
      StyleSheet: { create: (styles) => styles },
      Platform: { OS: 'android' },
    },
    '@expo/vector-icons': { Ionicons: 'Ionicons' },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'src/viewmodels/ProfileProvider': {
      useProfile: () => ({
        profile: {},
        saveFoodPreferences: async (...args) => {
          saved.push(args);
        },
      }),
    },
  })('src/screens/profile/FoodPreferencesScreen').default;
  const navigation = {
    addListener: () => () => {},
    goBack: () => {
      wentBack = true;
    },
  };
  let tree;
  await act(async () => {
    tree = create(React.createElement(Screen, { navigation }));
  });
  assert.equal(button(tree, 'Lưu sở thích').props.disabled, true);
  for (const [label, value] of [
    ['Yêu thích', 'Thích vị cay'],
    ['Hạn chế', 'Giảm ngọt'],
    ['Ghét', 'Không ăn cá'],
  ]) {
    const input = tree.root
      .findAllByType('TextInput')
      .find((field) => field.props.accessibilityLabel === label);
    await act(async () => input.props.onChangeText(value));
  }
  await act(async () => button(tree, 'Lưu sở thích').props.onPress());
  assert.deepEqual(saved, [
    [
      { food_likes: 'Thích vị cay', food_limits: 'Giảm ngọt', food_dislikes: 'Không ăn cá' },
      { food_likes: '', food_limits: '', food_dislikes: '' },
    ],
  ]);
  assert.equal(wentBack, true);
  await act(async () => tree.unmount());
});
