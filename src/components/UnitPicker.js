import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { QUICK_UNITS } from '../models/foodForm';

export default function UnitPicker({ visible, value, onClose, onSelect }) {
  const insets = useSafeAreaInsets();
  const [custom, setCustom] = useState('');
  useEffect(() => { if (visible) setCustom(QUICK_UNITS.includes(value) ? '' : value); }, [visible, value]);
  return <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
    <KeyboardAvoidingView style={styles.sheetBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Đóng chọn đơn vị" />
      <View style={[styles.unitSheet, { paddingBottom: Math.max(insets.bottom, 16) }]} accessibilityViewIsModal>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>Chọn đơn vị</Text><Pressable onPress={onClose} style={styles.iconButton} accessibilityLabel="Đóng"><Ionicons name="close" size={22} color={COLORS.text} /></Pressable></View>
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={styles.unitGrid}>{QUICK_UNITS.map(unit => <Pressable key={unit} accessibilityRole="button" accessibilityState={{ selected: unit === value }} onPress={() => onSelect(unit)} style={[styles.unitChoice, value === unit && styles.unitChoiceActive]}><Text style={[styles.unitChoiceText, value === unit && { color: COLORS.primary }]}>{unit}</Text>{value === unit && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}</Pressable>)}</View>
          <Text style={[styles.label, { marginTop: 18 }]}>Đơn vị khác</Text>
          <View style={styles.customUnitRow}>
            <TextInput accessibilityLabel="Nhập đơn vị khác" style={[styles.input, { flex: 1 }]} placeholder="Ví dụ: khay, túi, phần…" placeholderTextColor={COLORS.muted} maxLength={20} value={custom} onChangeText={setCustom} returnKeyType="done" onSubmitEditing={() => { if (custom.trim()) onSelect(custom.trim()); }} />
            <Pressable disabled={!custom.trim()} onPress={() => onSelect(custom.trim())} style={[styles.customUnitConfirm, !custom.trim() && styles.disabled]} accessibilityRole="button" accessibilityLabel="Dùng đơn vị vừa nhập"><Ionicons name="checkmark" size={23} color="#FFFFFF" /></Pressable>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}


const styles = StyleSheet.create({
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(18,35,24,0.4)', justifyContent: 'flex-end', alignItems: 'center' },
  unitSheet: { width: '100%', maxWidth: 480, maxHeight: '85%', backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20 },
  sheetHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#DAE4DA', alignSelf: 'center', marginTop: 10, marginBottom: 12 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  iconButton: { minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center' },
  unitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  unitChoice: { width: '30%', flexGrow: 1, minHeight: 52, borderRadius: 12, borderWidth: 1, borderColor: '#E1E7DD', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7, backgroundColor: '#FAFCF9' },
  unitChoiceActive: { borderColor: '#79A86A', backgroundColor: '#EDF6E7' },
  unitChoiceText: { fontSize: 16, color: COLORS.text, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  customUnitRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  input: { minHeight: 52, backgroundColor: '#FAFCF9', borderWidth: 1, borderColor: '#DDE6D9', borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12, fontSize: 16, color: COLORS.text },
  customUnitConfirm: { width: 52, minHeight: 52, backgroundColor: COLORS.primary, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.45 },
});
