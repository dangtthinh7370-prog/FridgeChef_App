const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { act, create } = require('react-test-renderer');
const makeLoader = require('./load-ui.cjs');
const { LOCAL_RECIPES } = require('./recipe-fixtures.cjs');
function fixture({ failOnce = false } = {}) {
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
        return args.action === 'catalog'
          ? { recipes: [LOCAL_RECIPES[0]], imported: 1 }
          : 'Xin chào, cùng nấu nhé!';
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
      .findAll((n) => typeof n.type === 'function' && n.props.title === 'Tìm trên thế giới')[0]
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
