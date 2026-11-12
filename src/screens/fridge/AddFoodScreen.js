// src/screens/fridge/AddFoodScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants/theme';

const STORAGE_AREAS = ['Ngăn mát', 'Ngăn đông', 'Đồ khô'];

export default function AddFoodScreen({ navigation }) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [selectedArea, setSelectedArea] = useState('Ngăn mát');
  const [buyDate, setBuyDate] = useState('05/11/2026');
  const [expDate, setExpDate] = useState('08/11/2026');

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập tên thực phẩm');
      return;
    }
    Alert.alert('Thành công', `Đã thêm "${name}" vào ${selectedArea}!`, [
      { text: 'OK', onPress: () => navigation.goBack() }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Back + Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.title}>Thêm thực phẩm</Text>
            <Text style={styles.subtitle}>Nhập mới hoặc quét mã vạch</Text>
          </View>
        </View>

        {/* Card quét mã vạch hoặc hóa đơn */}
        <TouchableOpacity
          style={styles.scanBox}
          onPress={() => navigation.navigate('BarcodeScanner')}
        >
          <View style={styles.scanIcon}>
            <Ionicons name="barcode-outline" size={24} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.scanTitle}>Quét mã vạch hoặc hóa đơn</Text>
            <Text style={styles.scanSub}>Tự động điền thông tin sản phẩm</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
        </TouchableOpacity>

        {/* Form Inputs */}
        <View style={styles.field}>
          <Text style={styles.label}>Tên thực phẩm</Text>
          <TextInput
            placeholder="Ví dụ: Cà chua"
            placeholderTextColor={COLORS.muted}
            style={styles.input}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Số lượng</Text>
          <TextInput
            placeholder="Ví dụ: 3 quả / 500 g"
            placeholderTextColor={COLORS.muted}
            style={styles.input}
            value={quantity}
            onChangeText={setQuantity}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Khu vực lưu trữ</Text>
          <View style={styles.areaRow}>
            {STORAGE_AREAS.map(area => (
              <TouchableOpacity
                key={area}
                style={[styles.areaBtn, selectedArea === area && styles.areaBtnActive]}
                onPress={() => setSelectedArea(area)}
              >
                <Text style={[styles.areaText, selectedArea === area && styles.areaTextActive]}>
                  {area}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Ngày mua</Text>
          <TextInput style={styles.input} value={buyDate} onChangeText={setBuyDate} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Hạn sử dụng</Text>
          <TextInput style={styles.input} value={expDate} onChangeText={setExpDate} />
        </View>

        {/* Nút Lưu */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Lưu thực phẩm</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { padding: 4 },
  title: { fontSize: SIZES.h1, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: SIZES.body, color: COLORS.muted, marginTop: 2 },
  scanBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 14,
    borderRadius: SIZES.radius,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  scanIcon: { width: 44, height: 44, borderRadius: 8, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  scanTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  scanSub: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  input: {
    height: 48,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.divider,
    paddingHorizontal: 14,
    fontSize: SIZES.body,
    color: COLORS.text,
  },
  areaRow: { flexDirection: 'row', gap: 10 },
  areaBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.divider,
    alignItems: 'center',
  },
  areaBtnActive: { backgroundColor: '#E8F5E9', borderColor: COLORS.primary },
  areaText: { fontSize: 13, color: COLORS.muted },
  areaTextActive: { color: COLORS.primary, fontWeight: '600' },
  saveBtn: {
    height: SIZES.btnHeight,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  saveBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
});
