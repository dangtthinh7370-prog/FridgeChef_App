// src/screens/fridge/FridgeScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants/theme';
import FreshnessBadge from '../../components/FreshnessBadge';
import { useFridgeViewModel } from '../../viewmodels/FridgeProvider';
import { STORAGE_AREAS } from '../../models/food';

const TABS = STORAGE_AREAS.map(area => area.name);

export default function FridgeScreen({ navigation }) {
  const [selectedTab, setSelectedTab] = useState(TABS[0]);
  const [search, setSearch] = useState('');

  const { foods, mutate, busy } = useFridgeViewModel();
  const [statusFilter, setStatusFilter] = useState(null);
  const showFilter = () => Alert.alert('Lọc theo hạn dùng', 'Chọn trạng thái', [
    { text: 'Tất cả', onPress: () => setStatusFilter(null) },
    { text: 'Sắp hết hạn', onPress: () => setStatusFilter('soon') },
    { text: 'Quá hạn', onPress: () => setStatusFilter('expired') },
    { text: 'Hủy', style: 'cancel' },
  ]);
  const filteredFoods = foods.filter(
    item => (!statusFilter || item.status === statusFilter) && item.area === selectedTab && item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tủ lạnh ảo</Text>
        <Text style={styles.headerSubtitle}>Quản lý thực phẩm theo khu vực lưu trữ</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={COLORS.muted} style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Tìm thực phẩm..."
          placeholderTextColor={COLORS.muted}
          value={search}
          onChangeText={setSearch}
          style={styles.searchInput}
        />
      </View>

      {/* Tabs Filter */}
      <View style={styles.tabsRow}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabItem, selectedTab === tab && styles.tabItemActive]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Section List Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Thực phẩm ({filteredFoods.length})</Text>
        <TouchableOpacity onPress={showFilter}>
          <Text style={styles.filterLink}>Lọc</Text>
        </TouchableOpacity>
      </View>

      {/* Food List */}
      <FlatList
        data={filteredFoods}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ paddingBottom: 90 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.foodCard}
            onPress={() => navigation.navigate('FoodDetail', { foodId: item.id })}
          >
            <View style={styles.avatarBox}>
              <Text style={styles.avatarText}>{item.code}</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.foodName}>{item.name}</Text>
              <Text style={styles.foodSubtitle}>{item.quantityText} • {item.daysLeft}</Text>
            </View>
            <FreshnessBadge
              status={item.status}
              text={item.daysLeft}
            />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Chưa có thực phẩm phù hợp trong {selectedTab}</Text>
            {!foods.length && <TouchableOpacity disabled={busy} style={{ marginTop: 12 }} onPress={async () => {
              try { await mutate('addDemoFoods'); } catch (error) { Alert.alert('Không thêm được', error.message); }
            }}><Text style={styles.filterLink}>Thêm 4 thực phẩm mẫu để thử</Text></TouchableOpacity>}
          </View>
        }
      />

      {/* Nút thêm thực phẩm cố định bên dưới */}
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => navigation.navigate('AddFood')}
      >
        <Text style={styles.addBtnText}>+ Thêm thực phẩm</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingHorizontal: 16 },
  header: { marginTop: 12, marginBottom: 16 },
  headerTitle: { fontSize: SIZES.h1, fontWeight: '700', color: COLORS.text },
  headerSubtitle: { fontSize: SIZES.body, color: COLORS.muted, marginTop: 4 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  searchInput: { flex: 1, fontSize: SIZES.body, color: COLORS.text },
  tabsRow: { flexDirection: 'row', marginVertical: 14, gap: 10 },
  tabItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  tabItemActive: { backgroundColor: '#E8F5E9', borderColor: COLORS.primary },
  tabText: { fontSize: SIZES.body, color: COLORS.muted },
  tabTextActive: { color: COLORS.primary, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  filterLink: { fontSize: SIZES.body, color: COLORS.primary, fontWeight: '500' },
  foodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  cardContent: { flex: 1 },
  foodName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  foodSubtitle: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  addBtn: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    height: SIZES.btnHeight,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  addBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  emptyBox: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: COLORS.muted, fontSize: 14 },
});
