// src/screens/home/HomeScreen.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES } from '../../constants/theme';
import FreshnessBadge from '../../components/FreshnessBadge';
import { useFridgeViewModel } from '../../viewmodels/FridgeProvider';

export default function HomeScreen({ navigation }) {
  const { foods } = useFridgeViewModel();
  const urgentFoods = foods.filter(item => item.status === 'soon').slice(0, 2);
  const soonCount = foods.filter(item => item.status === 'soon').length;
  const expiredCount = foods.filter(item => item.status === 'expired').length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Trang chủ</Text>
          <Text style={styles.subtitle}>Xin chào! Chúc bạn một ngày thật ngon.</Text>
        </View>

        {/* Card Tủ lạnh của bạn */}
        <View style={styles.bannerCard}>
          <Text style={styles.bannerLabel}>TỦ LẠNH CỦA BẠN</Text>
          <Text style={styles.bannerNumber}>{foods.length} thực phẩm</Text>
          <Text style={styles.bannerSub}>Hôm nay có gì ngon?</Text>
        </View>

        {/* 2 Card thống kê */}
        <View style={styles.statRow}>
          <TouchableOpacity
            style={[styles.statBox, { backgroundColor: COLORS.badgeSoonBg }]}
            onPress={() => navigation.navigate('ExpiryAlert')}
          >
            <Text style={[styles.statNumber, { color: COLORS.expirySoon }]}>{String(soonCount).padStart(2, '0')}</Text>
            <Text style={styles.statLabel}>Sắp hết hạn</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statBox, { backgroundColor: COLORS.badgeExpiredBg }]}
            onPress={() => navigation.navigate('ExpiryAlert')}
          >
            <Text style={[styles.statNumber, { color: COLORS.expired }]}>{String(expiredCount).padStart(2, '0')}</Text>
            <Text style={styles.statLabel}>Đã hết hạn</Text>
          </TouchableOpacity>
        </View>

        {/* Nguyên liệu cần chú ý */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nguyên liệu cần chú ý</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ExpiryAlert')}>
            <Text style={styles.viewAll}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>


        {!urgentFoods.length && (
          <View style={{ paddingVertical: 12 }}>
            <Text style={styles.foodSub}>{foods.length ? 'Không có thực phẩm sắp hết hạn.' : 'Tủ lạnh chưa có thực phẩm.'}</Text>
            {!foods.length && <TouchableOpacity onPress={() => navigation.navigate('AddFood')} style={{ marginTop: 8 }}>
              <Text style={styles.viewAll}>+ Thêm thực phẩm đầu tiên</Text>
            </TouchableOpacity>}
          </View>
        )}
        {urgentFoods.map(item => (
          <TouchableOpacity
            key={item.id}
            style={styles.foodItem}
            onPress={() => navigation.navigate('FoodDetail', { foodId: item.id })}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.code}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.foodName}>{item.name}</Text>
              <Text style={styles.foodSub}>{item.quantityText} • {item.daysLeft}</Text>
            </View>
            <FreshnessBadge status="soon" text={item.daysLeft.replace('Còn ', '')} />
          </TouchableOpacity>
        ))}

        {/* Card AI CHEF */}
        <View style={styles.aiCard}>
          <Text style={styles.aiTitle}>AI CHEF ✦</Text>
          <Text style={styles.aiDesc}>Nấu món ngon từ nguyên liệu đang có</Text>
          <TouchableOpacity
            style={styles.aiBtn}
            onPress={() => navigation.navigate('AIChef')}
          >
            <Text style={styles.aiBtnText}>Gợi ý món ăn</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 16 },
  header: { marginBottom: 16 },
  title: { fontSize: SIZES.h1, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: SIZES.body, color: COLORS.muted, marginTop: 4 },
  bannerCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: SIZES.radiusLarge,
    padding: 20,
    marginBottom: 14,
  },
  bannerLabel: { fontSize: 12, fontWeight: '700', color: COLORS.primary, letterSpacing: 0.5 },
  bannerNumber: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginVertical: 6 },
  bannerSub: { fontSize: 14, color: COLORS.muted },
  statRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statBox: { flex: 1, padding: 16, borderRadius: SIZES.radius, alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 13, color: COLORS.text, marginTop: 4, fontWeight: '500' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  viewAll: { fontSize: 13, color: COLORS.primary, fontWeight: '500' },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: SIZES.radius,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  foodName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  foodSub: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  aiCard: {
    backgroundColor: COLORS.darkGreen,
    borderRadius: SIZES.radiusLarge,
    padding: 20,
    marginTop: 10,
  },
  aiTitle: { fontSize: 16, fontWeight: '800', color: COLORS.white },
  aiDesc: { fontSize: 14, color: '#D1E7DD', marginVertical: 8 },
  aiBtn: {
    backgroundColor: COLORS.white,
    paddingVertical: 12,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    marginTop: 6,
  },
  aiBtnText: { color: COLORS.darkGreen, fontWeight: '700', fontSize: 14 },
});
