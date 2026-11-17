import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  Pressable,
  Image,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, Empty, PageHeader, ui } from '../../components/AppUI';
import { useRecipes } from '../../viewmodels/RecipeProvider';
import { generateRecipes } from '../../services/recipeService';
import { normalizeName, validateRecipe } from '../../models/recipes';
const topics = ['Chicken', 'Pasta', 'Beef', 'Fish', 'Soup', 'Cake'];
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
  const [query, setQuery] = useState(''),
    [filter, setFilter] = useState('Tất cả');
  const [area, setArea] = useState('Tất cả'),
    [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false),
    [error, setError] = useState('');
  const running = useRef(false);
  const areas = useMemo(
    () => ['Tất cả', ...new Set((results || recipes).map((r) => r.area).filter(Boolean))],
    [recipes, results],
  );
  const visible = useMemo(
    () =>
      (results || recipes).filter(
        (r) =>
          (filter !== 'Yêu thích' || favorites.includes(r.id)) &&
          (filter !== 'AI đã chọn' || r.suggestedAt || r.reason) &&
          (area === 'Tất cả' || r.area === area) &&
          (results !== null ||
            !query.trim() ||
            normalizeName(`${r.title} ${r.area} ${r.category || ''}`).includes(
              normalizeName(query),
            )),
      ),
    [recipes, results, filter, area, favorites, query],
  );
  const search = async (term = query) => {
    if (running.current || !term.trim()) return;
    running.current = true;
    setLoading(true);
    setError('');
    setArea('Tất cả');
    setFilter('Tất cả');
    try {
      const result = await generateRecipes({ action: 'catalog', query: term.trim() });
      setResults((result.recipes || []).map(validateRecipe));
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      running.current = false;
      setLoading(false);
    }
  };
  const chip = (label, selected, onPress) => (
    <Pressable
      key={label}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[s.chip, selected && s.chipActive]}
    >
      <Text style={[s.chipText, selected && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
  return (
    <SafeAreaView style={ui.screen}>
      <PageHeader
        title="Khám phá món ăn"
        subtitle="Một vòng thế giới, ngay trong căn bếp"
        onBack={route?.name === 'AIChef' ? () => navigation.goBack() : undefined}
      />
      <FlatList
        data={visible}
        keyExtractor={(r) => r.id}
        contentContainerStyle={ui.content}
        keyboardShouldPersistTaps="handled"
        refreshing={loading}
        onRefresh={() => reload().catch((e) => setError(e.message))}
        ListHeaderComponent={
          <View style={{ gap: 16 }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('AIChat')}
              style={s.hero}
            >
              <View style={s.heroIcon}>
                <Ionicons name="sparkles" size={29} color="#F4C773" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.heroTitle}>Có Bếp AI cùng nghĩ món</Text>
                <Text style={s.heroBody}>
                  Hỏi cách nấu, chọn món theo tủ lạnh hoặc thử điều mới.
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={24} color="white" />
            </Pressable>
            <View style={[ui.row, s.search]}>
              <Ionicons name="search" size={21} color="#657463" />
              <TextInput
                editable={!loading}
                accessibilityLabel="Tìm món ăn trên thế giới"
                style={{ flex: 1, fontSize: 16, paddingVertical: 12 }}
                placeholder="Tìm món: pasta, chicken, tacos…"
                value={query}
                maxLength={60}
                onChangeText={(v) => {
                  setQuery(v);
                  setResults(null);
                }}
                returnKeyType="search"
                onSubmitEditing={() => search()}
              />
              {!!query && (
                <Pressable
                  accessibilityLabel="Xóa tìm kiếm"
                  onPress={() => {
                    setQuery('');
                    setResults(null);
                  }}
                  style={ui.iconButton}
                >
                  <Ionicons name="close-circle" size={21} color="#657463" />
                </Pressable>
              )}
            </View>
            <Button
              title="Tìm trên thế giới"
              busy={loading}
              disabled={!query.trim()}
              onPress={() => search()}
            />
            <Text style={ui.muted}>
              Tìm theo tên tiếng Anh. Không cần có sẵn nguyên liệu trong tủ lạnh. Bạn có thể nhờ AI
              giải thích công thức bằng tiếng Việt.
            </Text>
            <View style={s.wrap}>
              {topics.map((t) =>
                chip(t, false, () => {
                  setQuery(t);
                  search(t);
                }),
              )}
            </View>
            <View style={s.wrap}>
              {['Tất cả', 'Yêu thích', 'AI đã chọn'].map((t) =>
                chip(t, filter === t, () => setFilter(t)),
              )}
            </View>
            <Text style={ui.heading}>Ẩm thực các nước</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {areas.map((t) => chip(t, area === t, () => setArea(t)))}
            </ScrollView>
            {!!(error || cloudError) && (
              <View style={ui.card}>
                <Text accessibilityRole="alert" style={ui.error}>
                  {error || cloudError}
                </Text>
                <Button
                  secondary
                  title="Tải lại"
                  onPress={() =>
                    reload()
                      .then(() => setError(''))
                      .catch((e) => setError(e.message))
                  }
                />
              </View>
            )}
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <Text style={ui.heading}>
                {results !== null ? 'Kết quả tìm kiếm' : 'Cảm hứng hôm nay'}
              </Text>
              <Text style={ui.muted}>{visible.length} món</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <Empty
            icon="restaurant-outline"
            title={loading || !ready ? 'Đang tải món ăn…' : 'Chưa tìm thấy món phù hợp'}
            detail="Thử tên món khác, đổi bộ lọc hoặc khám phá nhóm món ở trên."
          />
        }
        renderItem={({ item: r }) => (
          <View style={[ui.card, { padding: 0, overflow: 'hidden', marginBottom: 16 }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Xem công thức ${r.title}`}
              onPress={() => navigation.navigate('RecipeDetail', { recipe: r })}
            >
              {r.image ? (
                <Image source={{ uri: r.image }} style={{ height: 200, width: '100%' }} />
              ) : (
                <View style={s.placeholder}>
                  <Ionicons name="restaurant" size={40} color="#759475" />
                </View>
              )}
              <View style={{ padding: 16, gap: 6 }}>
                <Text style={s.region}>{r.area || 'Ẩm thực thế giới'} · TheMealDB</Text>
                <Text style={s.dish}>{r.title}</Text>
                {!!r.reason && (
                  <Text numberOfLines={3} style={ui.body}>
                    {r.reason}
                  </Text>
                )}
                <Text style={ui.muted}>
                  {r.ingredients.length} nguyên liệu · {r.steps.length} bước nấu
                </Text>
                <Text style={{ color: '#286343', fontWeight: '700', marginTop: 6 }}>
                  Xem nguyên liệu & cách làm →
                </Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={favorites.includes(r.id) ? 'Bỏ yêu thích' : 'Lưu món yêu thích'}
              accessibilityState={{ selected: favorites.includes(r.id) }}
              disabled={working}
              onPress={() =>
                toggleFavorite(r.id).catch((e) => Alert.alert('Chưa lưu được', e.message))
              }
              style={s.heart}
            >
              <Ionicons
                name={favorites.includes(r.id) ? 'heart' : 'heart-outline'}
                size={24}
                color="#286343"
              />
            </Pressable>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  hero: {
    backgroundColor: '#183F31',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#2B5746',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { color: '#fff', fontSize: 19, fontWeight: '800', marginBottom: 7 },
  heroBody: { color: '#D1E3D6', fontSize: 14, lineHeight: 21 },
  search: {
    borderWidth: 1,
    borderColor: '#DDE5D9',
    borderRadius: 18,
    backgroundColor: 'white',
    paddingLeft: 14,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#E8EFE4',
    minHeight: 44,
  },
  chipActive: { backgroundColor: '#286343' },
  chipText: { color: '#344E39', fontWeight: '600' },
  region: { color: '#61775F', fontSize: 12, fontWeight: '700' },
  dish: { fontSize: 22, fontWeight: '800', color: '#193729' },
  heart: {
    position: 'absolute',
    right: 14,
    top: 14,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E7EFE0',
  },
});
