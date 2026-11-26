import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, DataState, Empty, PageHeader, ui } from '../../components/AppUI';
import { COLORS } from '../../constants/theme';
import { FOOD_CATEGORIES, STORAGE_AREAS } from '../../models/food';
import { normalizeName } from '../../models/recipes';
import { useFridgeViewModel } from '../../viewmodels/FridgeProvider';

const areas = [
  { id: 'all', name: 'Tất cả', icon: 'grid-outline' },
  ...STORAGE_AREAS.map((area, index) => ({
    ...area,
    icon: ['thermometer-outline', 'snow-outline', 'basket-outline'][index],
  })),
];
const statuses = [
  { id: 'all', name: 'Mọi hạn dùng' },
  { id: 'valid', name: 'Còn hạn' },
  { id: 'soon', name: 'Sắp hết hạn' },
  { id: 'expired', name: 'Quá hạn' },
];

export default function FridgeScreen({ navigation }) {
  const { foods, reload, refreshing, ready, error, offline } = useFridgeViewModel();
  const [area, setArea] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const filtered = useMemo(() => {
    const term = normalizeName(search);
    return foods
      .filter(
        (food) =>
          (area === 'all' || food.storageAreaId === area) &&
          (status === 'all' || food.status === status) &&
          normalizeName(food.name).includes(term),
      )
      .sort((a, b) => a.days - b.days || a.name.localeCompare(b.name, 'vi'));
  }, [foods, area, status, search]);

  const refresh = () => reload().catch(() => {});
  const add = () => navigation.navigate('AddFood');
  const chip = (item, value, select) => (
    <Pressable
      key={item.id}
      accessibilityRole="button"
      accessibilityState={{ selected: value === item.id }}
      onPress={() => select(item.id)}
      style={[s.chip, value === item.id && s.chipActive]}
    >
      {!!item.icon && (
        <Ionicons
          name={item.icon}
          size={17}
          color={value === item.id ? COLORS.white : COLORS.darkGreen}
        />
      )}
      <Text style={[s.chipLabel, value === item.id && s.chipLabelActive]}>{item.name}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={ui.screen}>
      <PageHeader
        title="Tủ lạnh"
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quét mã sản phẩm"
            style={s.scan}
            onPress={() => navigation.navigate('BarcodeScanner')}
          >
            <Ionicons name="barcode-outline" size={24} color={COLORS.darkGreen} />
          </Pressable>
        }
      />
      <FlatList
        data={filtered}
        keyExtractor={(food) => food.id}
        refreshing={refreshing}
        onRefresh={refresh}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={ui.content}
        ListHeaderComponent={
          <View style={s.controls}>
            <View style={s.search}>
              <Ionicons name="search" size={20} color={COLORS.muted} />
              <TextInput
                accessibilityLabel="Tìm thực phẩm"
                placeholder="Tìm thực phẩm…"
                value={search}
                onChangeText={setSearch}
                placeholderTextColor={COLORS.muted}
                returnKeyType="search"
                style={s.input}
              />
              {!!search && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Xóa tìm kiếm"
                  style={ui.iconButton}
                  onPress={() => setSearch('')}
                >
                  <Ionicons name="close-circle-outline" size={20} color={COLORS.muted} />
                </Pressable>
              )}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.chips}
            >
              {areas.map((item) => chip(item, area, setArea))}
            </ScrollView>
            <View style={s.listTop}>
              <Text style={[ui.heading, s.flex]}>
                {ready ? `${filtered.length} thực phẩm` : 'Thực phẩm'}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: filterOpen }}
                style={[s.filter, status !== 'all' && s.filterActive]}
                onPress={() => setFilterOpen(!filterOpen)}
              >
                <Ionicons name="options-outline" size={18} color={COLORS.primary} />
                <Text style={s.chipLabel}>
                  {status === 'all' ? 'Hạn dùng' : statuses.find((item) => item.id === status).name}
                </Text>
              </Pressable>
              {status !== 'all' && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Bỏ lọc hạn dùng"
                  style={ui.iconButton}
                  onPress={() => setStatus('all')}
                >
                  <Ionicons name="close-outline" size={18} color={COLORS.primary} />
                </Pressable>
              )}
            </View>
            {filterOpen && (
              <View style={[s.chips, s.wrap]}>
                {statuses.map((item) =>
                  chip(item, status, (value) => {
                    setStatus(value);
                    setFilterOpen(false);
                  }),
                )}
              </View>
            )}
            <DataState ready={ready} error={error} onRetry={refresh} />
          </View>
        }
        ListEmptyComponent={
          ready && (
            <Empty
              title={foods.length ? 'Không tìm thấy thực phẩm' : 'Tủ lạnh chưa có gì'}
              detail={
                foods.length
                  ? 'Thử đổi từ khóa, ngăn hoặc hạn dùng.'
                  : 'Thêm thực phẩm để theo dõi hạn dùng.'
              }
            />
          )
        }
        renderItem={({ item }) => {
          const icon =
            FOOD_CATEGORIES.find((category) => category.id === item.category)?.icon ||
            'grid-outline';
          const color =
            item.status === 'expired'
              ? '#9F3B32'
              : item.status === 'soon'
                ? '#81500B'
                : COLORS.darkGreen;
          return (
            <Pressable
              accessibilityRole="button"
              style={s.item}
              onPress={() => navigation.navigate('FoodDetail', { foodId: item.id })}
            >
              <View style={s.itemIcon}>
                <Ionicons name={icon} size={22} color={COLORS.darkGreen} />
              </View>
              <View style={s.flex}>
                <Text style={s.itemTitle}>{item.name}</Text>
                <Text style={ui.muted}>
                  {item.quantityText} · {item.area}
                </Text>
                <Text style={[s.date, { color }]}>
                  {item.daysLeft} · {item.expDate}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
            </Pressable>
          );
        }}
      />
      <View style={ui.footer}>
<<<<<<< HEAD
        <Button
          title="+ Thêm thực phẩm"
          onPress={() =>
            navigation.navigate('AddFood', area !== 'all' ? { initialStorageAreaId: area } : {})
          }
        />
=======
        <Button title="+ Thêm thực phẩm" disabled={!ready || offline} onPress={add} />
>>>>>>> d307c8a81165d6b9cd935dff34bd477219120dba
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  scan: { ...ui.iconButton, borderRadius: 14, backgroundColor: '#E6EEDF' },
  controls: { gap: 9 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 13,
    paddingLeft: 12,
    gap: 8,
  },
  input: { flex: 1, minHeight: 48, color: COLORS.text, fontSize: 15, paddingRight: 10 },
  chips: { flexDirection: 'row', gap: 6 },
  wrap: { flexWrap: 'wrap' },
  chip: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#E7EFDF',
    borderRadius: 12,
  },
  chipActive: { backgroundColor: COLORS.darkGreen },
  chipLabel: { color: COLORS.darkGreen, fontSize: 13, fontWeight: '700', flexShrink: 1 },
  chipLabelActive: { color: COLORS.white },
  listTop: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  filter: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: 7,
    borderRadius: 11,
    flexShrink: 1,
  },
  filterActive: { backgroundColor: '#E7EFDF' },
  item: {
    minHeight: 69,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 14,
    backgroundColor: COLORS.white,
  },
  itemIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: '#E7EFDF',
  },
  itemTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  date: { fontSize: 13, fontWeight: '600', marginTop: 2 },
});
