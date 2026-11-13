import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, SectionList, Alert, Modal, ScrollView, KeyboardAvoidingView, Keyboard, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants/theme';
import useShoppingViewModel from '../../viewmodels/useShoppingViewModel';
import { Header, Action, ui } from '../../components/Week3UI';
import { QuantityControl, StorageAndDates, inputCardStyle } from '../../components/FoodInputControls';
import { stepQuantity } from '../../models/foodForm';
import ShoppingItemEditor from '../../components/ShoppingItemEditor';

export default function ShoppingListScreen({ navigation }) {
  const vm = useShoppingViewModel();
  const list = vm.shopping;
  const sections = [
    { key: 'pending', title: 'Cần mua', data: vm.pending },
    { key: 'bought', title: 'Đã mua · chờ cất', data: vm.bought },
  ].filter(section => section.data.length);
  const run = async action => { try { await action(); } catch (error) { Alert.alert('Không thực hiện được', error.message); } };
  const openEditor = item => vm.openEditor(item);
  const showItemActions = item => Alert.alert(item.name, 'Chọn thao tác', [
    { text: 'Sửa tên / số lượng', onPress: () => openEditor(item) },
    ...(item.bought ? [{ text: 'Cất món này vào tủ lạnh', onPress: () => vm.openTransfer(item.id) }] : []),
    { text: 'Xóa', style: 'destructive', onPress: () => Alert.alert('Xóa món?', item.name, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => run(() => vm.remove(item.id)) },
    ]) },
    { text: 'Hủy', style: 'cancel' },
  ]);
  const transfer = async () => {
    Keyboard.dismiss();
    const count = await vm.move();
    if (count) {
      Alert.alert('Đã cất vào tủ lạnh', count + ' món đã được lưu với hạn dùng riêng.', [
        { text: 'Tiếp tục đi chợ' },
        { text: 'Xem tủ lạnh', onPress: () => navigation.navigate('Tủ lạnh') },
      ]);
    }
  };
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
    <View style={[styles.header, extra.topRow]}>
      <View style={{ flex: 1 }}><Text style={styles.title}>Danh sách đi chợ</Text><Text style={styles.subtitle}>Mua đủ món, cất đúng chỗ</Text></View>
      {!!list.length && <Pressable accessibilityRole="button" disabled={vm.busy} onPress={() => openEditor()} style={extra.addTop}><Ionicons name="add" size={19} color={COLORS.primary} /><Text style={styles.addText}>Thêm món</Text></Pressable>}
    </View>
    {!!list.length && <View style={styles.progressBox}>
      <Text style={styles.progressTitle}>{vm.boughtCount === list.length ? 'Đã mua đủ món trong danh sách' : vm.pending.length + ' món còn cần mua'}</Text>
      <Text style={styles.progressCount}>{vm.boughtCount} / {list.length} món đã mua · chờ cất vào tủ lạnh</Text>
      <View style={styles.progressBar} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: list.length, now: vm.boughtCount }}>
        <View style={[styles.progressActive, { width: (vm.boughtCount / list.length) * 100 + '%' }]} />
      </View>
    </View>}
    <SectionList style={{ flex: 1 }} sections={sections} stickySectionHeadersEnabled={false} keyExtractor={item => String(item.id)}
      contentContainerStyle={[{ paddingBottom: 16 }, !list.length && { flexGrow: 1 }]}
      ListEmptyComponent={<View style={extra.empty}>
        <View style={extra.emptyIcon}><Ionicons name="cart-outline" size={38} color={COLORS.primary} /></View>
        <Text style={extra.emptyTitle}>Hôm nay bạn cần mua gì?</Text>
        <Text style={extra.emptyText}>Thêm những món cần mua vào đây. Khi mua xong, tích chọn để cất vào tủ lạnh.</Text>
      </View>}
      renderSectionHeader={({ section }) => <View style={extra.sectionHeader}><Text style={styles.sectionTitle}>{section.title}</Text><Text style={extra.count}>{section.data.length}</Text></View>}
      renderItem={({ item }) => <View style={[styles.itemRow, item.bought && { backgroundColor: '#F0F6ED' }]}>
        <Pressable disabled={vm.busy} accessibilityRole="checkbox" accessibilityState={{ checked: item.bought }} accessibilityLabel={(item.bought ? 'Bỏ đánh dấu đã mua ' : 'Đánh dấu đã mua ') + item.name} onPress={() => run(() => vm.toggle(item))} style={extra.checkbox}>
          <Ionicons name={item.bought ? 'checkbox' : 'square-outline'} size={25} color={item.bought ? COLORS.primary : COLORS.muted} />
        </Pressable>
        <Pressable disabled={vm.busy} accessibilityRole="button" accessibilityLabel={'Sửa ' + item.name} onPress={() => openEditor(item)} style={extra.itemBody}>
          <Text style={[styles.itemName, item.bought && styles.itemBoughtText]}>{item.name}</Text>
          <Text style={styles.itemQty}>{item.quantity} {item.unit}{item.bought ? ' · Đã mua' : ''}</Text>
        </Pressable>
        <Pressable accessibilityLabel={'Thao tác với ' + item.name} accessibilityRole="button" disabled={vm.busy} onPress={() => showItemActions(item)} style={extra.menu}><Ionicons name="ellipsis-horizontal" size={21} color={COLORS.muted} /></Pressable>
      </View>}
    />
    <View style={extra.footer}>
      {!!vm.boughtCount && <Text style={extra.footerHint}>Mỗi món sẽ được chọn ngăn và hạn dùng riêng.</Text>}
      <Action title={vm.busy ? 'Đang lưu…' : vm.boughtCount ? 'Cất ' + vm.boughtCount + ' món vào tủ lạnh' : '＋ Thêm món cần mua'} disabled={vm.busy} onPress={() => vm.boughtCount ? vm.openTransfer() : openEditor()} />
    </View>

    <ShoppingItemEditor vm={vm} />
    <Modal visible={vm.mode === 'transfer'} animationType="slide" onRequestClose={vm.close}>
      <SafeAreaView style={ui.screen}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={extra.modalHeader}><Header title="Cất vào tủ lạnh" subtitle="Kiểm tra từng món trước khi cất" onBack={vm.close} /></View>
          <ScrollView contentContainerStyle={[ui.content, { paddingTop: 0 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">

              <Text style={[ui.muted, { marginBottom: 16 }]}>Nhập số lượng thực mua và hạn dùng trên sản phẩm cho từng món. Chỉ những món này được chuyển vào tủ lạnh.</Text>
              {vm.transfer.map((item, index) => <View key={item.shoppingId} style={inputCardStyle}>
                <Text style={[ui.name, { marginBottom: 16 }]}>{index + 1}. {item.name}</Text>
                <QuantityControl label="Số lượng thực mua" value={item.quantity} unit={item.unit} onChange={value => vm.setTransferField(item.shoppingId, 'quantity', value)} onStep={direction => vm.setTransferField(item.shoppingId, 'quantity', stepQuantity(item.quantity, direction))} onUnitChange={unit => vm.setTransferField(item.shoppingId, 'unit', unit)} disabled={vm.busy} />
                <View style={{ marginTop: 20 }}>
                  <StorageAndDates form={item} onChange={(key, value) => vm.setTransferField(item.shoppingId, key, value)} disabled={vm.busy} />
                </View>
              </View>)}

          </ScrollView>
          <View style={extra.modalFooter}>
            {!!vm.error && <Text style={ui.error} accessibilityRole="alert">{vm.error}</Text>}
            <Action title={vm.busy ? 'Đang lưu…' : 'Xác nhận cất ' + vm.transfer.length + ' món'} disabled={vm.busy} onPress={transfer} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  </SafeAreaView>;
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


const extra = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addTop: { minHeight: 44, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 22, paddingBottom: 30 },
  emptyIcon: { width: 84, height: 84, borderRadius: 28, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 19, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  emptyText: { fontSize: 14, lineHeight: 22, color: COLORS.muted, textAlign: 'center', marginTop: 10, maxWidth: 290 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 12 },
  count: { color: COLORS.muted, fontSize: 13 },
  checkbox: { width: 44, minHeight: 48, alignItems: 'flex-start', justifyContent: 'center' },
  itemBody: { flex: 1, minHeight: 48, justifyContent: 'center' },
  menu: { width: 44, minHeight: 48, alignItems: 'flex-end', justifyContent: 'center' },
  footer: { paddingTop: 8, paddingBottom: 12 },
  footerHint: { color: COLORS.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  modalHeader: { paddingHorizontal: 16, paddingTop: 12 },
  modalFooter: { padding: 16, paddingTop: 4, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: COLORS.divider },
  units: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  dateRow: { flexDirection: 'row', alignItems: 'center', minHeight: 72, paddingVertical: 8, borderTopWidth: 1, borderTopColor: COLORS.divider, gap: 10 },
  success: { color: COLORS.primary, backgroundColor: '#E8F5E9', padding: 12, borderRadius: 10, marginBottom: 16, lineHeight: 20 },
});
