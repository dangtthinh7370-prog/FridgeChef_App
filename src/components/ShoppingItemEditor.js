import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Modal, StyleSheet, KeyboardAvoidingView, Keyboard, Platform, Alert, ToastAndroid, ActivityIndicator, AccessibilityInfo } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { getShoppingFormErrors } from '../models/foodForm';
import { QuantityControl } from './FoodInputControls';

export default function ShoppingItemEditor({ vm }) {
  const visible = vm.mode === 'edit';
  const editing = vm.editingId != null;
  const { form, errors } = vm;
  const insets = useSafeAreaInsets();
  const nameRef = useRef(null);
  const quantityRef = useRef(null);
  const scroll = useRef(null);
  const [success, setSuccess] = useState('');
  const [focus, setFocus] = useState(null);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    if (visible) { setSuccess(''); setFocus(null); }
  }, [visible, vm.editingId]);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const close = () => {
    if (vm.busy) return;
    Keyboard.dismiss();
    if (!vm.dirty) { vm.close(); return; }
    Alert.alert('Bỏ thay đổi chưa lưu?', 'Món này chưa được lưu vào danh sách.', [
      { text: 'Tiếp tục nhập', style: 'cancel' },
      { text: 'Bỏ thay đổi', style: 'destructive', onPress: vm.close },
    ]);
  };
  const save = async keepAdding => {
    const problems = getShoppingFormErrors(form);
    if (!keepAdding) Keyboard.dismiss();
    const savedName = await vm.save(keepAdding);
    if (!savedName) {
      if (problems.name) { scroll.current?.scrollTo({ y: 0, animated: true }); nameRef.current?.focus(); }
      else if (problems.quantity) quantityRef.current?.focus();
      return;
    }
    const message = (editing ? 'Đã cập nhật ' : 'Đã thêm ') + savedName;
    AccessibilityInfo.announceForAccessibility(message);
    if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.SHORT);
    if (keepAdding) {
      setSuccess(message);
      scroll.current?.scrollTo({ y: 0, animated: true });
      nameRef.current?.focus();
    }
  };
  return <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={close}>
    <SafeAreaView edges={['top', 'left', 'right']} style={s.screen}>
      <View style={s.header}>
        <Pressable onPress={close} style={s.back} accessibilityRole="button" accessibilityLabel="Quay lại danh sách"><Ionicons name="arrow-back" size={24} color={COLORS.text} /></Pressable>
        <View style={{ flex: 1 }}><Text style={s.eyebrow}>DANH SÁCH ĐI CHỢ</Text><Text style={s.title}>{editing ? 'Sửa món cần mua' : 'Thêm món cần mua'}</Text></View>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView ref={scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
          {!!success && <View style={s.success} accessibilityLiveRegion="polite"><Ionicons name="checkmark-circle" size={21} color={COLORS.primary} /><Text style={s.successText}>{success}. Nhập món tiếp theo nhé!</Text></View>}
          <View style={s.card}>
            <View style={s.cardHeading}><View style={s.smallIcon}><Ionicons name="basket-outline" size={20} color={COLORS.primary} /></View><Text style={s.cardTitle}>Thông tin món cần mua</Text></View>
            <Text style={s.label}>Tên thực phẩm <Text style={s.required}>*</Text></Text>
            <TextInput ref={nameRef} value={form.name} editable={!vm.busy} maxLength={100} placeholder="Ví dụ: Trứng gà, sữa tươi…" placeholderTextColor="#85917F" style={[s.nameInput, focus === 'name' && s.focused, errors.name && s.invalid]}
              accessibilityLabel="Tên thực phẩm, bắt buộc" onChangeText={value => { vm.setField('name', value); setSuccess(''); }} onFocus={() => setFocus('name')} onBlur={() => setFocus(null)} returnKeyType="next" onSubmitEditing={() => quantityRef.current?.focus()} />
            {!!errors.name && <Text style={s.error} accessibilityRole="alert">{errors.name}</Text>}
            {!editing && <View style={s.suggestions}>
              <Text style={s.helper}>Chạm để điền nhanh</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={s.suggestionRow}>
                {vm.suggestions.map(item => <Pressable key={item.name} disabled={vm.busy} onPress={() => { vm.chooseSuggestion(item); setSuccess(''); }} style={s.suggestion} accessibilityRole="button" accessibilityLabel={'Điền nhanh ' + item.name}>
                  <Text style={s.suggestionText}>{item.name}</Text><Ionicons name="add" size={16} color={COLORS.primary} />
                </Pressable>)}
              </ScrollView>
            </View>}
            <View style={{ marginTop: 18 }}>
              <QuantityControl value={form.quantity} unit={form.unit} onChange={value => vm.setField('quantity', value)} onStep={vm.changeQuantity} onUnitChange={unit => vm.setField('unit', unit)} disabled={vm.busy} inputRef={quantityRef} error={errors.quantity} unitError={errors.unit} />
            </View>
          </View>
          <View style={s.note}><Ionicons name="information-circle-outline" size={20} color="#6A7C65" /><Text style={s.noteText}>Chưa cần nhập hạn dùng. Khi mua xong, bạn sẽ bổ sung lúc cất vào tủ lạnh.</Text></View>
          {!!vm.error && <Text style={s.error} accessibilityRole="alert">{vm.error}</Text>}
        </ScrollView>
        <View style={[s.footer, { paddingBottom: keyboardOpen ? 10 : Math.max(insets.bottom, 12) }]}>
          <Pressable disabled={vm.busy} onPress={() => save(false)} style={[s.primary, vm.busy && s.disabled]} accessibilityRole="button">
            {vm.busy ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name={editing ? 'checkmark' : 'add'} size={22} color="#FFFFFF" />}
            <Text style={s.primaryText}>{vm.busy ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Thêm vào danh sách'}</Text>
          </Pressable>
          {!editing && <Pressable disabled={vm.busy} onPress={() => save(true)} style={[s.next, vm.busy && s.disabled]} accessibilityRole="button"><Ionicons name="add-circle-outline" size={19} color={COLORS.primary} /><Text style={s.nextText}>Lưu và thêm tiếp</Text></Pressable>}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F8F3' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16, gap: 12 },
  back: { minWidth: 48, minHeight: 48, borderRadius: 15, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E1E8DC', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 10, fontWeight: '700', color: COLORS.muted, letterSpacing: 1, marginBottom: 5 },
  title: { fontSize: 23, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  content: { paddingHorizontal: 16, paddingBottom: 20 },
  card: { padding: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E9DC', borderRadius: 20, marginBottom: 14 },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  smallIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#ECF4E7', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { flexShrink: 1, fontSize: 16, fontWeight: '700', color: COLORS.text },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 9 },
  required: { color: '#A6503A' },
  nameInput: { minHeight: 56, padding: 14, backgroundColor: '#FAFCF8', borderWidth: 1, borderColor: '#DCE5D6', borderRadius: 13, fontSize: 16, color: COLORS.text },
  focused: { borderColor: '#67915C', backgroundColor: '#FBFFF8' },
  invalid: { borderColor: '#C44A3F', backgroundColor: '#FFF9F7' },
  error: { color: '#B33D36', fontSize: 13, lineHeight: 20, marginTop: 8 },
  suggestions: { marginTop: 12 },
  helper: { color: COLORS.muted, fontSize: 12, lineHeight: 18 },
  suggestionRow: { gap: 8, paddingTop: 8 },
  suggestion: { minHeight: 44, borderRadius: 12, backgroundColor: '#F0F6EC', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7 },
  suggestionText: { fontSize: 13, fontWeight: '500', color: '#3D6538' },
  quantityLabels: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  quantityRow: { flexDirection: 'row', gap: 12 },
  stepper: { flex: 1, minHeight: 56, borderWidth: 1, borderColor: '#DCE5D6', borderRadius: 14, backgroundColor: '#FAFCF8', flexDirection: 'row', alignItems: 'center' },
  stepButton: { width: 48, minHeight: 54, alignItems: 'center', justifyContent: 'center' },
  numberInput: { flex: 1, minWidth: 22, minHeight: 54, paddingHorizontal: 0, paddingVertical: 8, fontSize: 22, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  unit: { width: 104, minHeight: 56, borderWidth: 1, borderColor: '#C6D9BC', borderRadius: 14, backgroundColor: '#EFF6E9', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 },
  unitText: { flex: 1, color: COLORS.primary, fontSize: 16, fontWeight: '700' },
  presets: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 10 },
  preset: { flex: 1, minHeight: 56, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 12, borderWidth: 1, borderColor: '#E1E8DB', backgroundColor: '#FAFCF8' },
  presetActive: { backgroundColor: '#ECF5E4', borderColor: '#8CAE79' },
  presetNumber: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  presetUnit: { fontSize: 11, color: COLORS.muted },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 7, paddingVertical: 5 },
  noteText: { flex: 1, fontSize: 12, lineHeight: 20, color: '#6A7C65' },
  footer: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E1E8DB' },
  primary: { minHeight: 54, borderRadius: 15, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: COLORS.primary },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  next: { minHeight: 48, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, marginTop: 3 },
  nextText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  success: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#E6F2DF', borderRadius: 13, padding: 12, marginBottom: 14 },
  successText: { flex: 1, fontSize: 13, lineHeight: 20, color: '#31572C' },
  disabled: { opacity: 0.5 },
});
