const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { act, create } = require('react-test-renderer');
const makeLoader = require('./load-ui.cjs');
const { LOCAL_RECIPES } = require('./recipe-fixtures.cjs');
function fixture({ failOnce = false, chatReply, guideReply } = {}) {
  const calls = [],
    navigationCalls = [];
  const hosts = Object.fromEntries(
    [
      'View',
      'Text',
      'TextInput',
      'Pressable',
      'Image',
      'ScrollView',
      'Switch',
      'ActivityIndicator',
      'KeyboardAvoidingView',
    ].map((n) => [n, n]),
  );
  const FlatList = ({ data, renderItem, ListHeaderComponent, ListEmptyComponent }) =>
    React.createElement(
      'List',
      {},
      ListHeaderComponent,
      data.length
        ? data.map((item, index) =>
            React.createElement(React.Fragment, { key: item.id }, renderItem({ item, index })),
          )
        : ListEmptyComponent,
    );
  const q = {
    select() {
      return q;
    },
    eq() {
      return q;
    },
    order() {
      return q;
    },
    limit: async () => ({ data: [], error: null }),
  };
  const load = makeLoader({
    'react-native': {
      ...hosts,
      FlatList,
      Platform: { OS: 'android' },
      StyleSheet: { create: (x) => x },
      Alert: { alert() {} },
    },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@expo/vector-icons': { Ionicons: 'Ionicons' },
    'expo-crypto': { randomUUID: require('node:crypto').randomUUID },
    'src/viewmodels/FridgeProvider': {
      useFridgeViewModel: () => ({
        foods: [
          { id: 'one', status: 'soon' },
          { id: 'two', status: 'expired' },
        ],
        ready: true,
      }),
    },
    'src/viewmodels/AuthProvider': { useAuth: () => ({ user: { id: 'owner' } }) },
    'src/viewmodels/RecipeProvider': {
      useRecipes: () => ({
        recipes: LOCAL_RECIPES,
        favorites: [],
        ready: true,
        reload: async () => {},
        toggleFavorite: async () => {},
      }),
    },
    'src/services/supabase': { supabase: { from: () => q } },
    'src/services/recipeService': {
      generateRecipes: async (args) => {
        calls.push(args);
        if (failOnce && calls.length === 1) throw new Error('Network failed');
        if (args.action === 'catalog') return { recipes: [LOCAL_RECIPES[0]], imported: 1 };
        if (args.action === 'cook-guide') return guideReply;
        if (args.action === 'chat') return chatReply || 'Xin chào, cùng nấu nhé!';
        return { recipes: [LOCAL_RECIPES[0]], message: 'Mình đã tìm được món phù hợp.' };
      },
    },
  });
  const navigation = {
    canGoBack: () => false,
    goBack() {},
    navigate: (...x) => navigationCalls.push(x),
  };
  return { load, navigation, calls, navigationCalls };
}
test('world discovery searches independently from inventory and opens source recipe details', async () => {
  const f = fixture();
  const Screen = f.load('src/screens/recipe/AIChefScreen').default;
  let tree;
  await act(async () => {
    tree = create(React.createElement(Screen, { navigation: f.navigation }));
  });
  await act(async () => tree.root.findByType('TextInput').props.onChangeText('pasta'));
  await act(async () =>
    tree.root
      .findAll(
        (n) => n.type === 'Pressable' && n.props.accessibilityLabel === 'Tìm trên thế giới',
      )[0]
      .props.onPress(),
  );
  assert.equal(f.calls[0].action, 'catalog');
  assert.equal(f.calls[0].query, 'pasta');
  assert.equal(f.calls[0].useInventory, undefined);
  const open = tree.root.findAll(
    (n) =>
      n.type === 'Pressable' &&
      n.props.accessibilityLabel === `Xem công thức ${LOCAL_RECIPES[0].title}`,
  )[0];
  await act(async () => open.props.onPress());
  assert.equal(f.navigationCalls[0][0], 'RecipeDetail');
  await act(async () => tree.unmount());
});
test('chat retains a failed question and retries the same operation instead of duplicating history', async () => {
  const f = fixture({ failOnce: true });
  const Screen = f.load('src/screens/recipe/AIChatScreen').default;
  let tree;
  await act(async () => {
    tree = create(React.createElement(Screen, { navigation: f.navigation }));
  });
  await act(async () => tree.root.findByType('TextInput').props.onChangeText('Nấu pasta thế nào?'));
  await act(async () =>
    tree.root
      .findAll((n) => n.type === 'Pressable' && n.props.accessibilityLabel === 'Gửi tin nhắn')[0]
      .props.onPress(),
  );
  assert.match(JSON.stringify(tree.toJSON()), /Network failed/);
  await act(async () =>
    tree.root
      .findAll((n) => typeof n.type === 'function' && n.props.title === 'Gửi lại tin nhắn')[0]
      .props.onPress(),
  );
  assert.equal(f.calls[0].requestId, f.calls[1].requestId);
  assert.equal(f.calls[1].useInventory, false);
  assert.match(JSON.stringify(tree.toJSON()), /Xin chào, cùng nấu nhé!/);
  assert.equal(tree.root.findByType('TextInput').props.value, '');
  await act(async () => tree.unmount());
});

test('catalog retry repeats the failed search term', async () => {
  const f = fixture({ failOnce: true });
  const Screen = f.load('src/screens/recipe/AIChefScreen').default;
  let tree;
  await act(async () => {
    tree = create(React.createElement(Screen, { navigation: f.navigation }));
  });
  await act(async () => tree.root.findByType('TextInput').props.onChangeText('pasta'));
  const search = tree.root.findByType('TextInput').props.onSubmitEditing;
  await act(async () => search());
  assert.match(JSON.stringify(tree.toJSON()), /Network failed/);
  const retry = tree.root.findAll(
    (node) => typeof node.type === 'function' && node.props.title === 'Thử tìm lại',
  )[0];
  await act(async () => retry.props.onPress());
  assert.deepEqual(f.calls, [
    { action: 'catalog', query: 'pasta' },
    { action: 'catalog', query: 'pasta' },
  ]);
  assert.match(JSON.stringify(tree.toJSON()), /Kết quả cho/);
  await act(async () => tree.unmount());
});

test('suggestions from the fridge show usable stock and send the selected portions', async () => {
  const f = fixture();
  const Screen = f.load('src/screens/recipe/FridgeSuggestionsScreen').default;
  let tree;
  await act(async () => {
    tree = create(
      React.createElement(Screen, {
        navigation: f.navigation,
        route: { params: { preference: 'không cay' } },
      }),
    );
  });
  assert.match(JSON.stringify(tree.toJSON()), /1 thực phẩm còn hạn/);
  const plus = tree.root.findAll(
    (node) => node.type === 'Pressable' && node.props.accessibilityLabel === 'Tăng số người',
  )[0];
  await act(async () => plus.props.onPress());
  const request = tree.root.findAll(
    (node) => typeof node.type === 'function' && node.props.title === 'Gợi ý món',
  )[0];
  await act(async () => request.props.onPress());
  assert.deepEqual(f.calls, [{ servings: 3, preference: 'không cay', includeMessage: true }]);
  const open = tree.root.findAll(
    (node) =>
      node.type === 'Pressable' &&
      node.props.accessibilityLabel === 'Xem công thức ' + LOCAL_RECIPES[0].title,
  )[0];
  await act(async () => open.props.onPress());
  assert.equal(f.navigationCalls[0][0], 'RecipeDetail');
  assert.equal(f.navigationCalls[0][1].servings, 3);
  await act(async () => tree.unmount());
});

test('chat displays the explanation first and the sourced guide advances a step', async () => {
  const sources = [{ title: 'TheMealDB', url: 'https://www.themealdb.com/meal/123' }];
  const f = fixture({
    chatReply: {
      message: 'Mình chọn món mì.\n\n- **Nguồn**: TheMealDB',
      proposal: { title: 'Mì sốt', origin: 'Ý', recipeId: 'themealdb-123', sources },
    },
    guideReply: {
      title: 'Mì sốt',
      origin: 'Ý',
      recipeId: 'themealdb-123',
      sources,
      ingredients: ['Mì · 200 g'],
      steps: ['Luộc mì.', 'Trộn sốt.'],
    },
  });
  const Screen = f.load('src/screens/recipe/AIChatScreen').default;
  let tree;
  await act(async () => {
    tree = create(React.createElement(Screen, { navigation: f.navigation }));
  });
  await act(async () => tree.root.findByType('TextInput').props.onChangeText('Cách làm mì?'));
  const findButton = (title) =>
    tree.root.findAll((n) => typeof n.type === 'function' && n.props.title === title)[0];
  const send = tree.root
    .findAllByType('Pressable')
    .find((n) => n.props.accessibilityLabel === 'Gửi tin nhắn');
  await act(async () => send.props.onPress());
  assert.match(JSON.stringify(tree.toJSON()), /Mình chọn món mì/);
  assert.doesNotMatch(JSON.stringify(tree.toJSON()), /Luộc mì/);
  assert.equal(f.calls.length, 1);
  assert.match(JSON.stringify(tree.toJSON()), /• /);
  assert.doesNotMatch(JSON.stringify(tree.toJSON()), /\*\*Nguồn\*\*/);
  await act(async () => findButton('Hướng dẫn nấu món này').props.onPress());
  assert.equal(f.calls[1].action, 'cook-guide');
  assert.equal(f.calls[1].recipeId, 'themealdb-123');
  assert.match(JSON.stringify(tree.toJSON()), /Luộc mì/);
  await act(async () => findButton('Bước tiếp theo').props.onPress());
  assert.match(JSON.stringify(tree.toJSON()), /Trộn sốt/);
  await act(async () => tree.unmount());
});
