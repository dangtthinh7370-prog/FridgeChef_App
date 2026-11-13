// src/screens/fridge/FoodDetailScreen.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants/theme';
import FreshnessBadge from '../../components/FreshnessBadge';
import { useFridgeViewModel } from '../../viewmodels/FridgeProvider';
import { FOOD_CATEGORIES } from '../../models/food';

export default function FoodDetailScreen({ navigation, route }) {
  const { foods, mutate, busy } = useFridgeViewModel();
  const id = route.params?.foodId ?? route.params?.food?.id;
  const food = foods.find(item => String(item.id) === String(id));
  const handleDelete = () => {
    Alert.alert('Xác nhận', 'Bạn có chắc muốn xóa "' + food.name + '" khỏi tủ lạnh?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
        try { await mutate('deleteFood', food.id); navigation.goBack(); }
        catch (error) { Alert.alert('Không xóa được', error.message); }
      } },
    ]);
  };
  if (!food) return <SafeAreaView style={styles.container}>
    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color={COLORS.text} /></TouchableOpacity>
    <Text style={styles.subtitle}>Thực phẩm không còn tồn tại. Hãy quay lại tủ lạnh.</Text>
  </SafeAreaView>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 12 }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.title}>Chi tiết thực phẩm</Text>
          <Text style={styles.subtitle}>Theo dõi và chỉnh sửa thực phẩm</Text>
        </View>
      </View>

      {/* Main Card */}
      <View style={styles.cardHeader}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarLargeText}>{food.code || 'CT'}</Text>
        </View>
        <Text style={styles.foodName}>{food.name}</Text>
        <View style={{ marginTop: 8 }}>
          <FreshnessBadge
            status={food.status || 'soon'}
            text={food.status === 'valid' ? 'CÒN HẠN' : food.status === 'soon' ? 'SẮP HẾT HẠN' : 'ĐÃ QUÁ HẠN'}
          />
        </View>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Thông tin thực phẩm</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Số lượng</Text>
          <Text style={styles.infoValue}>{food.quantityText}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Khu vực</Text>
          <Text style={styles.infoValue}>{food.area || 'Ngăn mát'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Ngày mua</Text>
          <Text style={styles.infoValue}>{food.buyDate || '05/11/2026'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Hạn sử dụng</Text>
          <Text style={styles.infoValue}>{food.expDate || '06/11/2026'}</Text>
        </View>
        {food.category && food.category !== 'other' && <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Nhóm thực phẩm</Text>
          <Text style={styles.infoValue}>{FOOD_CATEGORIES.find(item => item.id === food.category)?.name}</Text>
        </View>}
        {!!food.notes && <View style={{ paddingTop: 12 }}>
          <Text style={styles.infoLabel}>Ghi chú</Text>
          <Text style={[styles.infoValue, { marginTop: 6, lineHeight: 22 }]}>{food.notes}</Text>
        </View>}
      </View>

      {/* Action Buttons */}
      <View style={styles.btnGroup}>
        <TouchableOpacity
          style={styles.editBtn}
          disabled={busy}
          onPress={() => navigation.navigate('AddFood', { foodId: food.id })}
        >
          <Text style={styles.editBtnText}>Chỉnh sửa</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} disabled={busy} onPress={handleDelete}>
          <Text style={styles.deleteBtnText}>Xóa thực phẩm</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: { padding: 4 },
  title: { fontSize: SIZES.h1, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: SIZES.body, color: COLORS.muted, marginTop: 2 },
  cardHeader: {
    backgroundColor: '#FFF9E6',
    borderRadius: SIZES.radiusLarge,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarLarge: {
    width: 68,
    height: 68,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarLargeText: { fontSize: 24, fontWeight: '800', color: COLORS.primary },
  foodName: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  infoTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 14 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  infoLabel: { fontSize: 14, color: COLORS.muted },
  infoValue: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  btnGroup: { marginTop: 'auto', marginBottom: 12 },
  editBtn: {
    height: SIZES.btnHeight,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  editBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  deleteBtn: { alignItems: 'center', paddingVertical: 12 },
  deleteBtnText: { color: COLORS.expired, fontSize: 14, fontWeight: '600' },
});
