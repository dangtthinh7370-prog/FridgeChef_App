import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

export function PageHeader({ title, subtitle, onBack, right }) {
  return (
    <View style={ui.header}>
      {onBack && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          onPress={onBack}
          style={ui.iconButton}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </Pressable>
      )}
      <View style={{ flex: 1 }}>
        <Text style={ui.title}>{title}</Text>
        {!!subtitle && <Text style={ui.muted}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}
export function Button({ title, onPress, busy, disabled, secondary, danger }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!(disabled || busy) }}
      disabled={disabled || busy}
      onPress={onPress}
      style={[
        ui.button,
        secondary && ui.secondary,
        danger && { backgroundColor: '#B33D36' },
        (disabled || busy) && { opacity: 0.5 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={secondary ? COLORS.primary : '#fff'} />
      ) : (
        <Text style={[ui.buttonText, secondary && { color: COLORS.primary }]}>{title}</Text>
      )}
    </Pressable>
  );
}
export function Empty({ icon = 'leaf-outline', title, detail }) {
  return (
    <View style={ui.empty}>
      <Ionicons name={icon} size={40} color={COLORS.primary} />
      <Text style={ui.heading}>{title}</Text>
      <Text style={[ui.muted, { textAlign: 'center' }]}>{detail}</Text>
    </View>
  );
}
export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F8F3' },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  title: { fontSize: 25, fontWeight: '800', color: COLORS.text },
  heading: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  body: { fontSize: 15, lineHeight: 23, color: COLORS.text },
  muted: { fontSize: 13, lineHeight: 20, color: COLORS.muted },
  card: {
    borderWidth: 1,
    borderColor: '#DFE8DB',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    gap: 7,
  },
  button: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginVertical: 4,
  },
  secondary: { backgroundColor: '#E7F0E1' },
  buttonText: { fontSize: 15, fontWeight: '700', color: '#fff', textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#D5E1D0',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 13,
    minHeight: 50,
    color: COLORS.text,
    fontSize: 15,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#B33D36', fontSize: 13, lineHeight: 20 },
  empty: { padding: 30, alignItems: 'center', gap: 12 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#DFE8DB', backgroundColor: '#fff' },
});
