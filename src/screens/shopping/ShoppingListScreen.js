// src/screens/shopping/ShoppingListScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants/theme';
import { MOCK_SHOPPING } from '../../data/mockData';

export default function ShoppingListScreen({ navigation }) {
  const [list, setList] = useState(MOCK_SHOPPING);

  const toggleCheck = (id) => {
    setList(list.map(item => item.id === id ? { ...item, bought: !item.bought } : item));
  };

  const boughtCount = list.filter(i => i.bought).length;

  const handleSyncToFridge = () => {
    const boughtItems = list.filter(i => i.bought);
    if (boughtItems.length === 0) {
      Alert.alert('Thông báo', 'Bạn chưa tích chọn món nào đã mua!');
      return;
    }
    Alert.alert(
      'Thành công',
      `Đã chuyển ${boughtItems.length} món đã mua vào "Tủ lạnh ảo" thành công!`,
      [{ text: 'Đến Tủ lạnh xem', onPress: () => navigation.navigate('Tủ lạnh') }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Danh sách đi chợ</Text>
        <Text style={styles.subtitle}>Không còn bỏ quên nguyên liệu cần mua</Text>
      </View>

      {/* Progress Box */}
      <View style={styles.progressBox}>
        <Text style={styles.progressTitle}>Danh sách mua sắm</Text>
        <Text style={styles.progressCount}>{boughtCount} / {list.length} món đã mua</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressActive, { width: `${(boughtCount / list.length) * 100}%` }]} />
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Cần mua</Text>
        <TouchableOpacity onPress={() => Alert.alert('Thêm món', 'Tính năng thêm thủ công vào giỏ')}>
          <Text style={styles.addText}>+ Thêm</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={list}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 90 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.itemRow} onPress={() => toggleCheck(item.id)}>
            <Ionicons
              name={item.bought ? 'checkbox' : 'square-outline'}
              size={22}
              color={item.bought ? COLORS.primary : COLORS.muted}
              style={{ marginRight: 12 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemName, item.bought && styles.itemBoughtText]}>{item.name}</Text>
              <Text style={styles.itemQty}>{item.quantity}</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.syncBtn} onPress={handleSyncToFridge}>
        <Text style={styles.syncBtnText}>Đưa món đã mua vào tủ lạnh</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  header: { marginBottom: 16 },
  title: { fontSize: SIZES.h1, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: SIZES.body, color: COLORS.muted, marginTop: 4 },
  progressBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: SIZES.radiusLarge,
    padding: 16,
    marginBottom: 20,
  },
  progressTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  progressCount: { fontSize: 13, color: COLORS.muted, marginTop: 4, marginBottom: 8 },
  progressBar: { height: 6, backgroundColor: '#C8E6C9', borderRadius: 3 },
  progressActive: { height: 6, backgroundColor: COLORS.primary, borderRadius: 3 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  addText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: SIZES.radius,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  itemName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  itemBoughtText: { textDecorationLine: 'line-through', color: COLORS.muted },
  itemQty: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  syncBtn: {
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
  syncBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
});
