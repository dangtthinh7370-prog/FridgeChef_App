import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { STORAGE_AREAS, todayISO, formatDate, parseDate, decorateFood } from '../models/food';
import { quantityPresets } from '../models/foodForm';
import UnitPicker from './UnitPicker';
import FoodDatePicker from './FoodDatePicker';

export function QuantityControl({ value, unit, onChange, onStep, onUnitChange, disabled, inputRef, error, unitError, label = 'Số lượng', onFocus, onBlur }) {
  const [unitOpen, setUnitOpen] = useState(false);
  return <View>
    <View style={s.labels}><Text style={s.label}>{label} <Text style={s.required}>*</Text></Text><Text style={[s.label, { width: 104 }]}>Đơn vị</Text></View>
    <View style={s.row}>
      <View style={[s.stepper, error && s.invalid]}>
        <Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel="Giảm số lượng" onPress={() => onStep(-1)} style={s.step}><Ionicons name="remove" size={24} color={COLORS.primary} /></Pressable>
        <TextInput ref={inputRef} accessibilityLabel={label} editable={!disabled} value={value} onChangeText={onChange} keyboardType="decimal-pad" maxLength={15} selectTextOnFocus style={s.number} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} onFocus={onFocus} onBlur={onBlur} />
        <Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel="Tăng số lượng" onPress={() => onStep(1)} style={s.step}><Ionicons name="add" size={24} color={COLORS.primary} /></Pressable>
      </View>
      <Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel={'Đơn vị ' + unit + ', chạm để đổi'} onPress={() => { Keyboard.dismiss(); setUnitOpen(true); }} style={[s.unit, unitError && s.invalid]}><Text style={s.unitText} numberOfLines={1}>{unit || 'Chọn'}</Text><Ionicons name="chevron-down" size={18} color={COLORS.primary} /></Pressable>
    </View>
    {!!(error || unitError) && <Text style={s.error} accessibilityRole="alert">{error || unitError}</Text>}
    <View style={s.presets}>{quantityPresets(unit).map(amount => {
      const selected = Number(String(value).replace(',', '.')) === Number(amount);
      return <Pressable key={amount} disabled={disabled} accessibilityRole="button" accessibilityLabel={'Chọn ' + amount + ' ' + unit} accessibilityState={{ selected }} onPress={() => onChange(amount)} style={[s.preset, selected && s.active]}>
        <Text style={[s.presetNumber, selected && { color: COLORS.primary }]}>{amount.replace('.', ',')}</Text><Text style={s.presetUnit} numberOfLines={1}>{unit}</Text>
      </Pressable>;
    })}</View>
    <Text style={s.hint}>Chọn nhanh hoặc chạm vào số để nhập lượng khác.</Text>
    <UnitPicker visible={unitOpen} value={unit} onClose={() => setUnitOpen(false)} onSelect={next => { onUnitChange(next); setUnitOpen(false); }} />
  </View>;
}

export function StorageAndDates({ form, onChange, disabled, errors = {} }) {
  const [field, setField] = useState(null);
  let minimumDate;
  try { minimumDate = parseDate(form.buyDate); } catch {}
  let expiry;
  try { expiry = decorateFood({ ...form, name: form.name || 'Thực phẩm', purchasedAt: parseDate(form.buyDate), expiresAt: parseDate(form.expDate) }); } catch {}
  const icons = { cool: 'thermometer-outline', frozen: 'snow-outline', dry: 'basket-outline' };
  const expiryColor = expiry?.status === 'expired' ? '#B33D36' : expiry?.status === 'soon' ? '#9C6419' : COLORS.primary;
  return <View>
    <Text style={s.label}>Cất ở đâu?</Text>
    <View style={s.areas}>{STORAGE_AREAS.map(area => <Pressable key={area.id} disabled={disabled} accessibilityRole="button" accessibilityState={{ selected: form.storageAreaId === area.id }} onPress={() => onChange('storageAreaId', area.id)} style={[s.area, form.storageAreaId === area.id && s.active]}>
      <Ionicons name={icons[area.id]} size={23} color={form.storageAreaId === area.id ? COLORS.primary : COLORS.muted} />
      <Text style={[s.areaName, form.storageAreaId === area.id && { color: COLORS.primary, fontWeight: '700' }]}>{area.name}</Text>
      {form.storageAreaId === area.id && <Ionicons name="checkmark-circle" size={14} color={COLORS.primary} style={s.areaCheck} />}
    </Pressable>)}</View>
    {[['buyDate', 'Ngày mua', 'bag-handle-outline'], ['expDate', 'Hạn sử dụng', 'time-outline']].map(([key, label, icon]) => <View key={key}>
      <Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel={label + ': ' + (form[key] || 'chưa chọn') + ', chạm để mở lịch'} onPress={() => { Keyboard.dismiss(); setField(key); }} style={[s.date, key === 'expDate' && !form[key] && s.emptyDate, errors[key] && s.invalid]}>
        <View style={s.dateIcon}><Ionicons name={icon} size={20} color={COLORS.primary} /></View>
        <View style={{ flex: 1 }}><Text style={s.dateLabel}>{label}{key === 'expDate' ? ' *' : ''}</Text><Text style={[s.dateValue, !form[key] && { color: COLORS.primary }]}>{form[key] || 'Chọn ngày hết hạn'}{key === 'buyDate' && form[key] === formatDate(todayISO()) ? ' · Hôm nay' : ''}</Text></View>
        <Ionicons name="calendar-outline" size={21} color={COLORS.primary} />
      </Pressable>
      {!!errors[key] && <Text style={s.error} accessibilityRole="alert">{errors[key]}</Text>}
    </View>)}
    {expiry ? <View style={[s.expiry, { backgroundColor: expiry.status === 'expired' ? '#FFF0EF' : expiry.status === 'soon' ? '#FFF6E8' : '#EFF7ED' }]}><Ionicons name={expiry.status === 'expired' ? 'alert-circle-outline' : 'time-outline'} size={18} color={expiryColor} /><Text style={[s.expiryText, { color: expiryColor }]}>{expiry.daysLeft}</Text></View> : <Text style={s.hint}>Chọn hạn dùng ghi trên bao bì hoặc nhãn sản phẩm.</Text>}
    <FoodDatePicker visible={field !== null} title={field === 'buyDate' ? 'Ngày mua' : 'Hạn sử dụng'} value={field ? form[field] : ''} minimumDate={field === 'expDate' ? minimumDate : undefined} onClose={() => setField(null)} onConfirm={date => { onChange(field, date); setField(null); }} />
  </View>;
}
export const inputCardStyle = { borderWidth: 1, borderColor: '#E3EBDF', borderRadius: 20, backgroundColor: '#FFFFFF', padding: 16, marginBottom: 14 };
const s = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  required: { color: '#B0523C' },
  row: { flexDirection: 'row', gap: 10 },
  stepper: { flex: 1, minHeight: 56, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DDE6D9', borderRadius: 13, backgroundColor: '#FAFCF9' },
  step: { width: 48, minHeight: 54, justifyContent: 'center', alignItems: 'center' },
  number: { flex: 1, minWidth: 22, minHeight: 54, textAlign: 'center', fontSize: 22, fontWeight: '700', color: COLORS.text, paddingHorizontal: 0, paddingVertical: 8 },
  unit: { width: 104, minHeight: 56, borderWidth: 1, borderColor: '#C6D9BC', borderRadius: 13, backgroundColor: '#EFF6E9', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, gap: 5 },
  unitText: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.primary },
  presets: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 5 },
  preset: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E1E8DB', borderRadius: 12, backgroundColor: '#FAFCF8', paddingVertical: 7, gap: 2 },
  presetNumber: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  presetUnit: { fontSize: 11, color: COLORS.muted, maxWidth: '100%' },
  active: { backgroundColor: '#EDF6E7', borderColor: '#79A86A' },
  hint: { fontSize: 12, lineHeight: 18, color: COLORS.muted, marginTop: 7 },
  error: { fontSize: 12, lineHeight: 18, color: '#B33D36', marginTop: 7 },
  invalid: { borderColor: '#C14A40', backgroundColor: '#FFFAF9' },
  areas: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  area: { flex: 1, minHeight: 78, borderWidth: 1, borderColor: '#E1E7DD', borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 10, paddingHorizontal: 2, backgroundColor: '#FAFCF9' },
  areaName: { fontSize: 12, fontWeight: '500', color: COLORS.muted },
  areaCheck: { position: 'absolute', top: 5, right: 5 },
  date: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 72, borderWidth: 1, borderColor: '#E2E9DD', borderRadius: 13, padding: 12, marginTop: 8, backgroundColor: '#FAFCF9' },
  dateIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#EAF2E5', alignItems: 'center', justifyContent: 'center' },
  dateLabel: { fontSize: 11, fontWeight: '500', color: COLORS.muted, marginBottom: 5 },
  dateValue: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  emptyDate: { borderStyle: 'dashed', borderColor: '#97B98A', backgroundColor: '#F5FAF1' },
  expiry: { flexDirection: 'row', gap: 7, alignItems: 'center', borderRadius: 10, padding: 10, marginTop: 10 },
  expiryText: { flex: 1, fontSize: 12, fontWeight: '600' },
});
