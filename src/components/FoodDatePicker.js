import React, { useEffect, useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { monthCells } from '../models/foodForm';
import { todayISO, formatDate, parseDate } from '../models/food';

export default function FoodDatePicker({ visible, title, value, minimumDate, onClose, onConfirm }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [selected, setSelected] = useState('');
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [year, setYear] = useState(() => new Date().getFullYear());
  const today = todayISO();
  useEffect(() => {
    if (!visible) return;
    let iso;
    try { iso = parseDate(value); } catch { iso = minimumDate && minimumDate > today ? minimumDate : today; }
    const [y, m] = iso.split('-').map(Number);
    setYear(y); setMonth(m - 1);
    setSelected(value ? iso : '');
  }, [visible, value, minimumDate, today]);
  const navigate = direction => {
    const date = new Date(year, month + direction, 1);
    if (date.getFullYear() >= 1900 && date.getFullYear() <= 9999) {
      setYear(date.getFullYear()); setMonth(date.getMonth());
    }
  };
  const allowed = date => !!date && (!minimumDate || date >= minimumDate);
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
    <View style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Đóng lịch" onPress={onClose} />
      <View style={[styles.sheet, { maxHeight: height * 0.9, paddingBottom: Math.max(insets.bottom, 16) }]} accessibilityViewIsModal>
        <View style={styles.handle} />
        <View style={styles.heading}><View style={{ flex: 1 }}><Text style={styles.title}>{title}</Text><Text style={styles.sub}>Chọn ngày trên lịch</Text></View><Pressable onPress={onClose} style={styles.iconButton} accessibilityLabel="Đóng lịch"><Ionicons name="close" size={24} color={COLORS.text} /></Pressable></View>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.monthBar}>
            <Pressable style={styles.iconButton} onPress={() => navigate(-1)} accessibilityLabel="Tháng trước"><Ionicons name="chevron-back" size={22} color={COLORS.primary} /></Pressable>
            <Text style={styles.month}>Tháng {month + 1}, {year}</Text>
            <Pressable style={styles.iconButton} onPress={() => navigate(1)} accessibilityLabel="Tháng sau"><Ionicons name="chevron-forward" size={22} color={COLORS.primary} /></Pressable>
          </View>
          <View style={styles.grid}>{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => <View key={day} style={styles.cell}><Text style={styles.weekday}>{day}</Text></View>)}</View>
          <View style={styles.grid}>{monthCells(year, month).map((date, index) => <View key={date || 'empty-' + index} style={styles.cell}>
            {date && <Pressable accessibilityRole="button" accessibilityLabel={formatDate(date)} accessibilityState={{ selected: selected === date, disabled: !allowed(date) }} disabled={!allowed(date)} onPress={() => setSelected(date)}
              style={[styles.day, today === date && styles.today, selected === date && styles.selected]}>
              <Text style={[styles.dayText, !allowed(date) && styles.disabled, selected === date && styles.selectedText]}>{Number(date.slice(-2))}</Text>
            </Pressable>}
          </View>)}</View>
          {allowed(today) && <Pressable style={styles.todayButton} onPress={() => { const now = new Date(); setMonth(now.getMonth()); setYear(now.getFullYear()); setSelected(today); }}><Text style={styles.todayText}>Về hôm nay</Text></Pressable>}
        </ScrollView>
        <Pressable accessibilityRole="button" disabled={!allowed(selected)} onPress={() => onConfirm(formatDate(selected))} style={[styles.confirm, !allowed(selected) && { opacity: 0.45 }]}>
          <Text style={styles.confirmText}>{selected ? 'Chọn ngày ' + formatDate(selected) : 'Chọn một ngày'}</Text>
        </Pressable>
      </View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(18,35,24,0.4)' },
  sheet: { width: '100%', maxWidth: 480, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, backgroundColor: '#FFFFFF' },
  handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#DAE4DA', alignSelf: 'center', marginTop: 10, marginBottom: 18 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  sub: { fontSize: 13, color: COLORS.muted, marginTop: 5 },
  monthBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  month: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.285714%', minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  weekday: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  day: { width: '100%', minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  today: { borderColor: '#C8E6C9' },
  selected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dayText: { color: COLORS.text, fontSize: 15 },
  disabled: { color: '#C5CEC7' },
  selectedText: { color: '#FFFFFF', fontWeight: '700' },
  todayButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  todayText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  confirm: { backgroundColor: COLORS.primary, minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', padding: 12, marginTop: 10 },
  confirmText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
