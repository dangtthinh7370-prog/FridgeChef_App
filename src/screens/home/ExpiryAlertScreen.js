// src/screens/home/ExpiryAlertScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants/theme';
import { useFridgeViewModel } from '../../viewmodels/FridgeProvider';

export default function ExpiryAlertScreen({ navigation }) {
  const [remind] = useState(false);
  const { foods } = useFridgeViewModel();
  const urgentFoods = foods.filter(item => item.status !== 'valid');
  const soonCount = foods.filter(item => item.status === 'soon').length;
  const expiredCount = foods.filter(item => item.status === 'expired').length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.title}>Cảnh báo hạn dùng</Text>
          <Text style={styles.subtitle}>Ưu tiên sử dụng thực phẩm đúng lúc</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Banner Cam */}
        <View style={styles.alertBanner}>
          <Text style={styles.alertBannerTitle}>{soonCount} sắp hết hạn · {expiredCount} đã quá hạn</Text>
          <Text style={styles.alertBannerSub}>Đề xuất nấu ngay để tránh lãng phí</Text>
        </View>

        <Text style={styles.sectionTitle}>Cần ưu tiên</Text>

        {/* List items: same row design, populated from SQLite */}
        {!urgentFoods.length && <Text style={styles.subtitle}>Không có thực phẩm cần cảnh báo.</Text>}
        {urgentFoods.map(food => (
          <TouchableOpacity key={food.id} style={styles.alertItem} onPress={() => navigation.navigate('FoodDetail', { foodId: food.id })}>
            <View style={[styles.iconBox, { backgroundColor: food.status === 'expired' ? COLORS.badgeExpiredBg : COLORS.badgeSoonBg }]}>
              <Ionicons name={food.status === 'expired' ? 'close-circle' : 'alert'} size={18} color={food.status === 'expired' ? COLORS.expired : COLORS.expirySoon} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{food.name} • {food.quantityText}</Text>
              <Text style={[styles.itemExp, food.status === 'expired' && { color: COLORS.expired }]}>{food.daysLeft}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
          </TouchableOpacity>
        ))}

        {/* Switch nhắc nhở */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Nhắc nhở của bạn</Text>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>Thông báo hàng ngày</Text>
            <Text style={styles.switchSub}>Nhắc kiểm tra tủ lạnh vào buổi sáng (07:00)</Text>
          </View>
          <Switch
            value={remind}
            onValueChange={() => Alert.alert('Thông báo hàng ngày', 'Chưa hỗ trợ thông báo nền. Cảnh báo trong ứng dụng vẫn cập nhật theo hạn dùng.')}
            trackColor={{ true: COLORS.primary }}
          />
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.chefBtn}
        onPress={() => navigation.navigate('AIChef')}
      >
        <Text style={styles.chefBtnText}>Đề xuất món với AI Chef</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { padding: 4 },
  title: { fontSize: SIZES.h1, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: SIZES.body, color: COLORS.muted, marginTop: 2 },
  alertBanner: {
    backgroundColor: '#FFF3E0',
    borderRadius: SIZES.radius,
    padding: 16,
    marginBottom: 20,
  },
  alertBannerTitle: { fontSize: 15, fontWeight: '700', color: '#B45309' },
  alertBannerSub: { fontSize: 13, color: '#B45309', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: SIZES.radius,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  iconBox: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  itemName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  itemExp: { fontSize: 12, color: COLORS.expirySoon, marginTop: 2 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  switchTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  switchSub: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  chefBtn: {
    height: SIZES.btnHeight,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    marginBottom: 10,
  },
  chefBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
});
