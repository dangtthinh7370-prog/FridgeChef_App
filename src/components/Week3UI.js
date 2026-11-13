import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import FreshnessBadge from './FreshnessBadge';

export function Header({ title, subtitle, onBack }) {
  return <View style={ui.header}>
    {onBack && <TouchableOpacity accessibilityLabel="Quay lại" onPress={onBack} style={{ padding: 8, marginRight: 8 }}><Ionicons name="arrow-back" size={24} color={COLORS.text} /></TouchableOpacity>}
    <View style={{ flex: 1 }}><Text style={ui.title}>{title}</Text>{subtitle && <Text style={ui.muted}>{subtitle}</Text>}</View>
  </View>;
}
export function Action({ title, onPress, disabled, secondary, danger }) {
  return <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={onPress}
    style={[ui.button, secondary && ui.secondary, danger && { backgroundColor: COLORS.expired }, disabled && { opacity: 0.5 }]}>
    <Text style={[ui.buttonText, secondary && { color: COLORS.primary }]}>{title}</Text>
  </TouchableOpacity>;
}
export function Field({ label, ...props }) {
  return <View style={{ marginBottom: 14 }}><Text style={ui.label}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor={COLORS.muted} style={ui.input} {...props} /></View>;
}
export function FoodCard({ food, onPress }) {
  return <TouchableOpacity style={ui.card} onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined}>
    <View style={ui.row}><View style={ui.avatar}><Text style={ui.avatarText}>{food.code}</Text></View>
      <View style={{ flex: 1 }}><Text style={ui.name}>{food.name}</Text><Text style={ui.muted}>{food.quantityText} · {food.area}</Text></View>
    </View>
    <View style={{ marginTop: 10 }}><FreshnessBadge status={food.status} text={food.daysLeft} /></View>
  </TouchableOpacity>;
}
export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  section: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 16, marginBottom: 12 },
  muted: { fontSize: 13, color: COLORS.muted, marginTop: 4, lineHeight: 19 },
  name: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  input: { minHeight: 48, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.divider, backgroundColor: COLORS.white, borderRadius: 12, fontSize: 15, color: COLORS.text },
  card: { backgroundColor: COLORS.white, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.divider, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: COLORS.primary, fontWeight: '700', fontSize: 16 },
  button: { backgroundColor: COLORS.primary, minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 12, marginTop: 10 },
  buttonText: { color: COLORS.white, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  secondary: { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#C8E6C9' },
  error: { color: '#B3261E', marginBottom: 12, lineHeight: 21 },
  empty: { color: COLORS.muted, textAlign: 'center', paddingVertical: 24, lineHeight: 22 },
  chip: { padding: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.divider, backgroundColor: COLORS.white },
  activeChip: { backgroundColor: '#E8F5E9', borderColor: COLORS.primary },
});
