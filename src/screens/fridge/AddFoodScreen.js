import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, ScrollView, KeyboardAvoidingView,
  Platform, Keyboard, Alert, Modal, ToastAndroid, ActivityIndicator, AccessibilityInfo,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { FOOD_CATEGORIES } from '../../models/food';
import { getFoodFormErrors } from '../../models/foodForm';
import { QuantityControl, StorageAndDates } from '../../components/FoodInputControls';
import useFoodFormViewModel from '../../viewmodels/useFoodFormViewModel';


function FieldError({ message }) {
  return message ? <Text style={styles.fieldError} accessibilityRole="alert">{message}</Text> : null;
}

export default function AddFoodScreen({ navigation, route }) {
  const vm = useFoodFormViewModel(route.params?.foodId);
  const { form, errors } = vm;
  const insets = useSafeAreaInsets();
  const scroll = useRef(null);
  const nameInput = useRef(null);
  const quantityInput = useRef(null);
  const positions = useRef({ info: 0, storage: 0, extra: 0 });
  const allowExit = useRef(false);
  const [extraVisible, setExtraVisible] = useState(Boolean(form.notes || form.category !== 'other'));
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [success, setSuccess] = useState('');
  const category = FOOD_CATEGORIES.find(item => item.id === form.category);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  useEffect(() => navigation.addListener('beforeRemove', event => {
    if (allowExit.current || (!vm.dirty && !vm.busy)) return;
    event.preventDefault();
    if (vm.busy) return;
    Alert.alert('Bỏ thay đổi chưa lưu?', 'Thông tin bạn vừa nhập sẽ không được lưu.', [
      { text: 'Tiếp tục nhập', style: 'cancel' },
      { text: 'Bỏ thay đổi', style: 'destructive', onPress: () => { allowExit.current = true; navigation.dispatch(event.data.action); } },
    ]);
  }), [navigation, vm.dirty, vm.busy]);

  const save = async keepAdding => {
    Keyboard.dismiss();
    const problems = getFoodFormErrors(form);
    const result = await vm.save({ keepAdding });
    if (!result) {
      const first = Object.keys(problems)[0];
      const group = ['buyDate', 'expDate'].includes(first) ? 'storage' : ['category', 'notes'].includes(first) ? 'extra' : 'info';
      if (group === 'extra') setExtraVisible(true);
      scroll.current?.scrollTo({ y: Math.max(0, positions.current[group] - 12), animated: true });
      return;
    }
    const message = (vm.editing ? 'Đã cập nhật ' : 'Đã thêm ') + result.name;
    AccessibilityInfo.announceForAccessibility(message);
    if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.SHORT);
    if (keepAdding) {
      setSuccess(message);
      setExtraVisible(false);
      scroll.current?.scrollTo({ y: 0, animated: true });
    } else {
      allowExit.current = true;
      navigation.goBack();
    }
  };
  const busy = vm.busy || vm.missing;

  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
    <View style={styles.header}>
      <Pressable onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Quay lại"><Ionicons name="arrow-back" size={23} color={COLORS.text} /></Pressable>
      <View style={{ flex: 1 }}><Text style={styles.eyebrow}>TỦ LẠNH CỦA BẠN</Text><Text style={styles.title}>{vm.editing ? 'Sửa thực phẩm' : 'Thêm thực phẩm'}</Text></View>
      <View style={styles.headerIcon}><Ionicons name="leaf-outline" size={25} color={COLORS.primary} /></View>
    </View>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView ref={scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>Cất thêm đồ ngon, nhớ dùng đúng lúc.</Text>
        {!!success && <View style={styles.success} accessibilityLiveRegion="polite"><Ionicons name="checkmark-circle" size={21} color={COLORS.primary} /><Text style={styles.successText}>{success}. Thêm món tiếp theo nhé!</Text><Pressable onPress={() => setSuccess('')} style={styles.iconButton} accessibilityLabel="Ẩn thông báo"><Ionicons name="close" size={18} color={COLORS.primary} /></Pressable></View>}
        {vm.missing && <Text style={styles.fieldError}>Thực phẩm này đã bị xóa. Hãy quay lại tủ lạnh.</Text>}
        <View style={styles.card} onLayout={event => { positions.current.info = event.nativeEvent.layout.y; }}>
          <View style={styles.sectionHeading}><View style={styles.sectionIcon}><Ionicons name="nutrition-outline" size={18} color={COLORS.primary} /></View><Text style={styles.sectionTitle}>Thông tin thực phẩm</Text></View>
          <Text style={styles.label}>Tên thực phẩm <Text style={styles.required}>*</Text></Text>
          <TextInput ref={nameInput} accessibilityLabel="Tên thực phẩm, bắt buộc" value={form.name} editable={!busy} maxLength={100} onChangeText={value => { vm.setField('name', value); setSuccess(''); }} placeholder="Ví dụ: Cà chua, sữa tươi…" placeholderTextColor={COLORS.muted} style={[styles.input, errors.name && styles.inputError]} returnKeyType="next" onSubmitEditing={() => quantityInput.current?.focus()} />
          <FieldError message={errors.name} />
          {!vm.editing && <View style={styles.suggestions}>
            <Text style={styles.helper}>Chạm để điền nhanh</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.suggestionRow}>
              {vm.suggestions.map(item => <Pressable key={item.name} disabled={busy} accessibilityRole="button" onPress={() => vm.chooseSuggestion(item)} style={styles.suggestion}><Text style={styles.suggestionText}>{item.name}</Text><Ionicons name="add" size={14} color={COLORS.primary} /></Pressable>)}
            </ScrollView>
          </View>}
          <View style={{ marginTop: 18 }}>
            <QuantityControl value={form.quantity} unit={form.unit} onChange={value => vm.setField('quantity', value)} onStep={vm.changeQuantity} onUnitChange={unit => vm.setField('unit', unit)} disabled={busy} inputRef={quantityInput} error={errors.quantity} unitError={errors.unit} />
          </View>
        </View>

        <View style={styles.card} onLayout={event => { positions.current.storage = event.nativeEvent.layout.y; }}>
          <View style={styles.sectionHeading}><View style={styles.sectionIcon}><Ionicons name="file-tray-full-outline" size={18} color={COLORS.primary} /></View><Text style={styles.sectionTitle}>Bảo quản & hạn dùng</Text></View>
          <StorageAndDates form={form} onChange={vm.setField} disabled={busy} errors={errors} />
        </View>

        <View style={styles.card} onLayout={event => { positions.current.extra = event.nativeEvent.layout.y; }}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: extraVisible }} style={styles.extraToggle} onPress={() => { Keyboard.dismiss(); setExtraVisible(value => !value); }}>
            <View style={styles.sectionIcon}><Ionicons name="options-outline" size={18} color={COLORS.primary} /></View>
            <View style={{ flex: 1 }}><Text style={styles.sectionTitle}>Thêm thông tin</Text><Text style={styles.helper}>{!extraVisible && form.category !== 'other' ? category?.name : 'Nhóm thực phẩm, ghi chú · không bắt buộc'}</Text></View>
            <Ionicons name={extraVisible ? 'chevron-up' : 'chevron-down'} size={19} color={COLORS.muted} />
          </Pressable>
          {extraVisible && <View style={{ marginTop: 20 }}>
            <Text style={styles.label}>Nhóm thực phẩm</Text>
            <View style={styles.categoryGrid}>{FOOD_CATEGORIES.map(item => <Pressable key={item.id} disabled={busy} accessibilityRole="button" accessibilityState={{ selected: form.category === item.id }} onPress={() => vm.setField('category', item.id)} style={[styles.categoryChip, form.category === item.id && styles.areaActive]}>
              <Ionicons name={item.icon} size={17} color={form.category === item.id ? COLORS.primary : COLORS.muted} /><Text style={styles.categoryText}>{item.name}</Text>
            </Pressable>)}</View>
            <FieldError message={errors.category} />
            <Text style={[styles.label, { marginTop: 18 }]}>Ghi chú</Text>
            <TextInput accessibilityLabel="Ghi chú, không bắt buộc" multiline value={form.notes} editable={!busy} maxLength={500} onChangeText={value => vm.setField('notes', value)} placeholder="Ví dụ: Đã mở hộp, để ở kệ trên…" placeholderTextColor={COLORS.muted} style={[styles.input, styles.notes, errors.notes && styles.inputError]} onFocus={() => scroll.current?.scrollToEnd({ animated: true })} />
            <Text style={[styles.helper, { textAlign: 'right' }]}>{form.notes.length}/500</Text>
            <FieldError message={errors.notes} />
          </View>}
        </View>
        <View style={styles.scanNotice}><Ionicons name="barcode-outline" size={18} color={COLORS.muted} /><Text style={styles.scanText}>Quét mã vạch / hóa đơn</Text><Text style={styles.comingSoon}>Sắp có</Text></View>
        {!!vm.error && <Text style={styles.fieldError} accessibilityRole="alert">{vm.error}</Text>}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: keyboardVisible ? 10 : Math.max(insets.bottom, 12) }]}>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => save(false)} style={[styles.saveButton, busy && styles.disabled]}>
          {vm.busy ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Ionicons name="checkmark" size={21} color="#FFFFFF" />}
          <Text style={styles.saveText}>{vm.busy ? 'Đang lưu…' : vm.editing ? 'Lưu thay đổi' : 'Lưu vào tủ lạnh'}</Text>
        </Pressable>
        {!vm.editing && !keyboardVisible && <Pressable accessibilityRole="button" disabled={busy} onPress={() => save(true)} style={[styles.addAnother, busy && styles.disabled]}><Ionicons name="add-circle-outline" size={19} color={COLORS.primary} /><Text style={styles.addAnotherText}>Lưu và thêm món khác</Text></Pressable>}
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F8F3' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, gap: 10 },
  backButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E3EBDF', alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 10, color: COLORS.muted, fontWeight: '700', letterSpacing: 1.1, marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.6, color: COLORS.text },
  headerIcon: { height: 44, width: 44, borderRadius: 14, backgroundColor: '#E6F1E0', alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 16, paddingBottom: 20 },
  intro: { color: COLORS.muted, fontSize: 13, lineHeight: 20, marginBottom: 18, paddingHorizontal: 2 },
  card: { borderWidth: 1, borderColor: '#E3EBDF', borderRadius: 20, backgroundColor: '#FFFFFF', padding: 16, marginBottom: 14 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 18 },
  sectionIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#EDF5E9', alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, flexShrink: 1 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  required: { color: '#B0523C' },
  input: { minHeight: 50, backgroundColor: '#FAFCF9', borderWidth: 1, borderColor: '#DDE6D9', borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12, fontSize: 15, color: COLORS.text },
  inputError: { borderColor: '#C14A40', backgroundColor: '#FFFAF9' },
  helper: { color: COLORS.muted, fontSize: 11, lineHeight: 17, marginTop: 6 },
  fieldError: { color: '#B33D36', fontSize: 12, lineHeight: 18, marginTop: 7, marginBottom: 5 },
  suggestions: { marginTop: 5 },
  suggestionRow: { gap: 7, paddingTop: 7, paddingBottom: 2 },
  suggestion: { minHeight: 44, paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#F0F6ED', flexDirection: 'row', alignItems: 'center', gap: 5 },
  suggestionText: { fontSize: 12, fontWeight: '500', color: '#3C6540' },
  quantityRow: { flexDirection: 'row', gap: 10 },
  stepper: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DDE6D9', borderRadius: 12, backgroundColor: '#FAFCF9', minHeight: 52 },
  stepButton: { width: 44, minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  quantityInput: { flex: 1, minWidth: 25, textAlign: 'center', fontSize: 20, fontWeight: '700', color: COLORS.text, paddingHorizontal: 0, paddingVertical: 8, minHeight: 50 },
  unitButton: { width: 98, minHeight: 52, borderWidth: 1, borderColor: '#DDE6D9', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, backgroundColor: '#FAFCF9', gap: 4 },
  unitValue: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text },
  areaRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  area: { flex: 1, minHeight: 78, borderWidth: 1, borderColor: '#E1E7DD', borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 10, paddingHorizontal: 2, backgroundColor: '#FAFCF9' },
  areaActive: { backgroundColor: '#EDF6E7', borderColor: '#79A86A' },
  areaText: { fontSize: 12, fontWeight: '500', color: COLORS.muted },
  areaTextActive: { color: COLORS.primary, fontWeight: '700' },
  areaCheck: { position: 'absolute', top: 5, right: 5 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 72, borderWidth: 1, borderColor: '#E2E9DD', borderRadius: 13, padding: 12, marginTop: 8, backgroundColor: '#FAFCF9' },
  dateIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF2E5' },
  dateLabel: { fontSize: 11, fontWeight: '500', color: COLORS.muted, marginBottom: 5 },
  dateValue: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  expiryEmpty: { borderStyle: 'dashed', borderColor: '#97B98A', backgroundColor: '#F5FAF1' },
  expiryPreview: { flexDirection: 'row', gap: 7, padding: 10, borderRadius: 10, marginTop: 10, alignItems: 'center' },
  expiryText: { flex: 1, fontSize: 12, fontWeight: '600' },
  extraToggle: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 44 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 11, borderRadius: 12, borderWidth: 1, borderColor: '#E1E7DD', backgroundColor: '#FAFCF9' },
  categoryText: { fontSize: 12, color: COLORS.text },
  notes: { minHeight: 90, textAlignVertical: 'top' },
  scanNotice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, marginTop: 0 },
  scanText: { fontSize: 12, color: COLORS.muted },
  comingSoon: { fontSize: 10, color: '#788675', backgroundColor: '#E8EEE3', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 4 },
  footer: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E9DD' },
  saveButton: { minHeight: 52, borderRadius: 14, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, padding: 12 },
  saveText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  addAnother: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 3 },
  addAnotherText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  disabled: { opacity: 0.45 },
  success: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E5F1DE', borderRadius: 13, paddingLeft: 12, marginBottom: 14 },
  successText: { flex: 1, color: '#315A2B', fontSize: 12, lineHeight: 18 },
  iconButton: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(18,35,24,0.4)', justifyContent: 'flex-end', alignItems: 'center' },
  unitSheet: { width: '100%', maxWidth: 480, maxHeight: '85%', backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20 },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#DAE4DA', alignSelf: 'center', marginTop: 10, marginBottom: 12 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  unitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  unitChoice: { width: '30%', flexGrow: 1, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: '#E1E7DD', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7, backgroundColor: '#FAFCF9' },
  unitChoiceActive: { borderColor: '#79A86A', backgroundColor: '#EDF6E7' },
  unitChoiceText: { fontSize: 15, color: COLORS.text, fontWeight: '600' },
  customUnitRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  customUnitConfirm: { width: 50, minHeight: 50, backgroundColor: COLORS.primary, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
