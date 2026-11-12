// src/screens/profile/ProfileScreen.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants/theme';
import { MOCK_AUTH_USER } from '../../data/mockData';

export default function ProfileScreen({ navigation }) {
  const MENU = [
    { id: '1', title: 'Tủ lạnh chung', sub: `Mã phòng: ${MOCK_AUTH_USER.householdId}`, icon: 'people-outline' },
    { id: '2', title: 'Thông báo', sub: 'Nhắc hạn sử dụng mỗi sáng', icon: 'notifications-outline' },
    { id: '3', title: 'Chủ đề', sub: 'Sáng / tối (Light / Dark)', icon: 'moon-outline' },
    { id: '4', title: 'Đồng bộ', sub: 'Firebase Cloud (Realtime DB)', icon: 'cloud-outline' },
    { id: '5', title: 'Trợ giúp', sub: 'Hướng dẫn sử dụng & Liên hệ', icon: 'help-circle-outline' },
  ];

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất tài khoản?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => navigation.replace('Login') }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Tài khoản</Text>
          <Text style={styles.subtitle}>Cá nhân hóa tủ lạnh của bạn</Text>
        </View>

        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{MOCK_AUTH_USER.avatarCode}</Text>
          </View>
          <View>
            <Text style={styles.userName}>{MOCK_AUTH_USER.name}</Text>
            <Text style={styles.userEmail}>{MOCK_AUTH_USER.email}</Text>
          </View>
        </View>

        <Text style={styles.menuHeader}>Cài đặt</Text>

        {/* Menu items */}
        {MENU.map(item => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            onPress={() => Alert.alert(item.title, `${item.sub} (sẽ hoàn thiện ở Tuần 3-4)`)}
          >
            <Ionicons name={item.icon} size={20} color={COLORS.primary} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemSub}>{item.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
          </TouchableOpacity>
        ))}

        {/* Đăng xuất */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
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
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: SIZES.radiusLarge,
    marginBottom: 20,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  userName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  userEmail: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  menuHeader: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 14,
    borderRadius: SIZES.radius,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  itemTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  itemSub: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  logoutBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingVertical: 14,
  },
  logoutText: { color: COLORS.expired, fontSize: 15, fontWeight: '700' },
});
