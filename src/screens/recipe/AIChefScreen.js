import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Empty, PageHeader, ui } from '../../components/AppUI';
import RecipeCard from '../../components/RecipeCard';
import { COLORS } from '../../constants/theme';
import { validateRecipe } from '../../models/recipes';
import { generateRecipes } from '../../services/recipeService';
import { useRecipes } from '../../viewmodels/RecipeProvider';

const filters = ['Tất cả', 'Yêu thích', 'AI đã chọn'];
const topics = ['Chicken', 'Pasta', 'Fish'];
const all = 'Tất cả';

export default function AIChefScreen({ navigation, route }) {
  const {
    recipes,
    favorites,
    toggleFavorite,
    reload,
    ready,
    error: cloudError,
    working,
  } = useRecipes();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [filter, setFilter] = useState(all);
  const [area, setArea] = useState(all);
  const [areasOpen, setAreasOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const searchingRef = useRef(false);
  const catalog = filter === all && result ? result.recipes : recipes;
  const areas = useMemo(
    () => Array.from(new Set(catalog.map((recipe) => recipe.area).filter(Boolean))).sort(),
    [catalog],
  );
  const visible = catalog.filter(
    (recipe) =>
      (filter !== 'Yêu thích' || favorites.includes(recipe.id)) &&
      (filter !== 'AI đã chọn' || recipe.suggestedAt || recipe.reason) &&
      (area === all || recipe.area === area),
  );

  const search = async (term = query) => {
    const submitted = term.trim();
    if (searchingRef.current || !submitted) return;
    searchingRef.current = true;
    setSearching(true);
    setSearchError(null);
    try {
      const response = await generateRecipes({ action: 'catalog', query: submitted });
      setResult({
        term: submitted,
        recipes: (response.recipes || []).map(validateRecipe),
        fromCatalog: response.mode === 'catalog',
      });
      setFilter(all);
      setArea(all);
      setAreasOpen(false);
      reload().catch(() => {});
    } catch (error) {
      setSearchError({ term: submitted, message: error.message });
    } finally {
      searchingRef.current = false;
      setSearching(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      await reload();
    } catch {
      // RecipeProvider exposes the catalog failure through cloudError.
    } finally {
      setRefreshing(false);
    }
  };

  const changeQuery = (value) => {
    setQuery(value);
    setSearchError(null);
  };

  const chip = (label, selected, onPress) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: searching }}
      disabled={searching}
      onPress={onPress}
      style={[s.chip, selected && s.chipActive]}
    >
      <Text style={[s.chipText, selected && s.chipTextActive]}>{label}</Text>
    </Pressable>
  );

  const title =
    filter !== all ? filter : result ? `Kết quả cho “${result.term}”` : 'Khám phá món ăn';

  return (
    <SafeAreaView
      edges={route?.name === 'AIChef' ? undefined : ['top', 'left', 'right']}
      style={ui.screen}
    >
      <PageHeader
        title="Món ăn"
        onBack={route?.name === 'AIChef' ? () => navigation.goBack() : undefined}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Trò chuyện với Bếp AI"
            onPress={() => navigation.navigate('AIChat')}
            style={s.aiButton}
          >
            <Ionicons name="chatbubble-ellipses-outline" color={COLORS.darkGreen} size={20} />
          </Pressable>
        }
      />
      <FlatList
        data={visible}
        keyExtractor={(recipe) => recipe.id}
        contentContainerStyle={ui.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshing={refreshing}
        onRefresh={refresh}
        ItemSeparatorComponent={() => <View style={s.separator} />}
        ListHeaderComponent={
          <View style={s.head}>
            <Pressable
              accessibilityRole="button"
              style={s.suggest}
              onPress={() =>
                navigation.navigate('AIChat', {
                  initialDraft: 'Gợi ý một món từ tủ lạnh và hướng dẫn mình nấu từng bước.',
                  initialUseInventory: true,
                })
              }
            >
              <View style={s.suggestIcon}>
                <Ionicons name="sparkles-outline" size={23} color="#FFEDBE" />
              </View>
              <View style={s.flex}>
                <Text style={s.suggestTitle}>Gợi ý từ tủ lạnh</Text>
                <Text style={s.suggestText}>Nấu với nguyên liệu bạn đang có</Text>
              </View>
              <Ionicons name="arrow-forward" size={19} color="#FFEDBE" />
            </Pressable>
            <View style={s.search}>
              <TextInput
                accessibilityLabel="Tên món ăn bằng tiếng Anh"
                placeholder="Tên món tiếng Anh, ví dụ pasta"
                placeholderTextColor={COLORS.muted}
                style={s.input}
                editable={!searching}
                value={query}
                maxLength={60}
                onChangeText={changeQuery}
                returnKeyType="search"
                onSubmitEditing={() => search()}
              />
              {!!query && !searching && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Xóa tìm kiếm"
                  style={ui.iconButton}
                  onPress={() => {
                    changeQuery('');
                    setResult(null);
                    setArea(all);
                  }}
                >
                  <Ionicons name="close-circle-outline" size={20} color={COLORS.muted} />
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tìm trên thế giới"
                accessibilityState={{ disabled: searching || !query.trim(), busy: searching }}
                disabled={searching || !query.trim()}
                onPress={() => search()}
                style={s.searchButton}
              >
                {searching ? (
                  <ActivityIndicator color={COLORS.primary} />
                ) : (
                  <Ionicons
                    name="search"
                    size={21}
                    color={query.trim() ? COLORS.primary : COLORS.muted}
                  />
                )}
              </Pressable>
            </View>
            <View style={s.chips}>
              {filters.map((name) =>
                chip(name, filter === name, () => {
                  setFilter(name);
                  setArea(all);
                  setAreasOpen(false);
                }),
              )}
              {areas.length > 0 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: areasOpen }}
                  onPress={() => setAreasOpen(!areasOpen)}
                  style={s.areaButton}
                >
                  <Ionicons name="options-outline" size={19} color={COLORS.primary} />
                  <Text style={s.chipText}>{area === all ? 'Ẩm thực' : area}</Text>
                </Pressable>
              )}
            </View>
            {areasOpen && (
              <View style={s.chips}>
                {[all, ...areas].map((name) =>
                  chip(name, area === name, () => {
                    setArea(name);
                    setAreasOpen(false);
                  }),
                )}
              </View>
            )}
            {filter === all && result?.fromCatalog && (
              <Text style={ui.muted}>
                Kết quả từ danh mục đã tải. Nguồn tra cứu trực tiếp đang gián đoạn.
              </Text>
            )}
            {!!searchError && (
              <View style={ui.card}>
                <Text accessibilityRole="alert" style={ui.error}>
                  {searchError.message}
                </Text>
                <Button secondary title="Thử tìm lại" onPress={() => search(searchError.term)} />
              </View>
            )}
            {!!cloudError && !result && (
              <View style={ui.card}>
                <Text accessibilityRole="alert" style={ui.error}>
                  {recipes.length
                    ? 'Danh mục có thể chưa cập nhật.'
                    : 'Chưa tải được danh mục món ăn.'}
                </Text>
                <Button secondary busy={refreshing} title="Thử tải danh mục" onPress={refresh} />
              </View>
            )}
            <View style={s.section}>
              <Text style={[ui.heading, s.flex]}>{title}</Text>
              <Text style={ui.muted}>{visible.length} món</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          searching || (!ready && !cloudError && !result) ? (
            <ActivityIndicator accessibilityLabel="Đang tải món ăn" color={COLORS.primary} />
          ) : cloudError && !result && !recipes.length ? null : (
            <View>
              <Empty
                icon={filter === 'Yêu thích' ? 'heart-outline' : 'restaurant-outline'}
                title={filter === 'Yêu thích' ? 'Chưa lưu món nào' : 'Chưa có món phù hợp'}
                detail={
                  filter === 'Yêu thích'
                    ? 'Chạm vào trái tim để lưu công thức.'
                    : 'Đổi bộ lọc hoặc thử tìm tên món tiếng Anh.'
                }
              />
              {filter === all && (
                <View style={[s.chips, s.center]}>
                  {topics.map((topic) =>
                    chip(topic, false, () => {
                      changeQuery(topic);
                      search(topic);
                    }),
                  )}
                </View>
              )}
            </View>
          )
        }
        renderItem={({ item }) => (
          <RecipeCard
            recipe={item}
            favorite={favorites.includes(item.id)}
            working={working}
            onOpen={() => navigation.navigate('RecipeDetail', { recipe: item })}
            onFavorite={() =>
              toggleFavorite(item.id).catch((error) => Alert.alert('Chưa lưu được', error.message))
            }
          />
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  head: { gap: 9, marginBottom: 10 },
  aiButton: { ...ui.iconButton, borderRadius: 14, backgroundColor: '#E6EEDF' },
  suggest: {
    backgroundColor: '#193E30',
    borderRadius: 16,
    padding: 10,
    gap: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestIcon: { backgroundColor: '#325746', borderRadius: 11, padding: 8 },
  suggestTitle: { fontSize: 16, fontWeight: '800', color: '#FFFDF5' },
  suggestText: { fontSize: 13, color: '#DDEDDC' },
  search: {
    alignItems: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 13,
    backgroundColor: COLORS.white,
  },
  input: {
    flex: 1,
    minHeight: 48,
    color: COLORS.text,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchButton: { ...ui.iconButton, borderLeftWidth: 1, borderLeftColor: COLORS.divider },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 22,
    paddingHorizontal: 11,
    paddingVertical: 6,
    backgroundColor: '#E7EFDF',
  },
  chipActive: { backgroundColor: COLORS.darkGreen },
  chipText: { color: COLORS.darkGreen, fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: COLORS.white },
  areaButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 },
  section: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 },
  separator: { height: 12 },
  center: { justifyContent: 'center' },
});
