import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants/theme';
import { useAuth } from '../../viewmodels/AuthProvider';
import { useFridgeViewModel } from '../../viewmodels/FridgeProvider';
import { readLegacySnapshot } from '../../services/legacyImport';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { reload, importLegacy, busy } = useFridgeViewModel();
  const [working, setWorking] = useState(false);
  const running = useRef(false);
  const run = async action => {
    if (running.current || busy) return;
    running.current = true; setWorking(true);
    try { await action(); } catch (error) { Alert.alert('Không thực hiện được', error.message); }
    finally { running.current = false; setWorking(false); }
  };
  const showImport = () => run(async () => {
    const data = await readLegacySnapshot(user.id);
    if (!data.foods.length && !data.shopping.length) { Alert.alert('Không có dữ liệu cũ', 'Thiết bị này không có món nào trong SQLite.'); return; }
    Alert.alert('Nhập dữ liệu cũ lên tài khoản?', data.foods.length + ' thực phẩm và ' + data.shopping.length + ' món đi chợ sẽ được nhập vào ' + user.email + '. Bản SQLite được giữ nguyên. Nguồn này chỉ được nhập một lần.', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Nhập dữ liệu', onPress: () => run(async () => {
        const result = await importLegacy();
        Alert.alert(result.alreadyImported ? 'Đã nhập trước đó' : 'Nhập thành công', result.alreadyImported ? 'Không tạo bản sao trùng lặp.' : result.foods + ' thực phẩm và ' + result.shopping + ' món đi chợ đã được lưu trên Supabase.');
      }) },
    ]);
  });
  const menu = [
    { id: 'refresh', title: 'Tải lại dữ liệu', sub: 'Lấy thay đổi mới nhất từ Supabase', icon: 'cloud-download-outline', action: () => run(async () => { await reload(); Alert.alert('Đã cập nhật', 'Đã tải dữ liệu mới nhất của tài khoản.'); }) },
    { id: 'import', title: 'Nhập dữ liệu từ thiết bị', sub: 'Đưa dữ liệu SQLite cũ vào tài khoản hiện tại', icon: 'push-outline', action: showImport },
    { id: 'shared', title: 'Tủ lạnh chung', sub: 'Chưa hỗ trợ chia sẻ dữ liệu giữa các tài khoản', icon: 'people-outline', action: () => Alert.alert('Tủ lạnh chung', 'Dữ liệu hiện được tách riêng theo từng tài khoản. Chia sẻ gia đình sẽ triển khai sau.') },
  ];
  const logout = () => Alert.alert('Đăng xuất?', 'Dữ liệu đã lưu trên Supabase vẫn còn. Bạn có thể đăng nhập lại trên thiết bị khác.', [
    { text: 'Hủy', style: 'cancel' }, { text: 'Đăng xuất', onPress: () => run(signOut) },
  ]);
  const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'FridgeChef';
  const disabled = working || busy;
  return <SafeAreaView style={styles.container}>
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.header}><Text style={styles.title}>Tài khoản</Text><Text style={styles.subtitle}>Dữ liệu riêng của bạn trên Supabase</Text></View>
      <View style={styles.userCard}><View style={styles.avatar}><Text style={styles.avatarText}>{displayName.slice(0,2).toUpperCase()}</Text></View>
        <View style={{ flex: 1 }}><Text style={styles.userName}>{displayName}</Text><Text style={styles.userEmail}>{user.email}</Text></View></View>
      <Text style={styles.menuHeader}>Dữ liệu và tài khoản</Text>
      {menu.map(item => <TouchableOpacity key={item.id} accessibilityRole="button" disabled={disabled} style={[styles.menuItem, { minHeight: 68, opacity: disabled ? 0.5 : 1 }]} onPress={item.action}>
        <Ionicons name={item.icon} size={22} color={COLORS.primary} style={{ marginRight: 12 }} /><View style={{ flex: 1 }}><Text style={styles.itemTitle}>{item.title}</Text><Text style={styles.itemSub}>{item.sub}</Text></View><Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
      </TouchableOpacity>)}
      <Text style={[styles.itemSub, { lineHeight: 20, marginTop: 12 }]}>Cần Internet để lưu và tải dữ liệu. Sau khi thay đổi trên máy khác, chọn Tải lại dữ liệu hoặc mở lại ứng dụng.</Text>
      <TouchableOpacity disabled={disabled} style={styles.logoutBtn} onPress={logout}><Text style={styles.logoutText}>{working ? 'Đang xử lý…' : 'Đăng xuất'}</Text></TouchableOpacity>
    </ScrollView>
  </SafeAreaView>;
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
