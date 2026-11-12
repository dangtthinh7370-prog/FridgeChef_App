// src/screens/fridge/BarcodeScreen.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants/theme';

export default function BarcodeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.title}>Quét mã vạch</Text>
          <Text style={styles.subtitle}>Đặt mã sản phẩm vào vùng quét</Text>
        </View>
      </View>

      {/* Khung Camera Mockup */}
      <View style={styles.cameraBox}>
        <Text style={styles.camText}>CAMERA PREVIEW</Text>
        <View style={styles.scanTarget}>
          <View style={styles.laserLine} />
        </View>
        <Text style={styles.scanTip}>Đưa mã vạch vào khung</Text>
      </View>

      {/* Tra cứu OpenFoodFacts Card */}
      <View style={styles.apiCard}>
        <Ionicons name="information-circle-outline" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.apiTitle}>Tra cứu OpenFoodFacts</Text>
          <Text style={styles.apiDesc}>Tên + ảnh sẽ được điền nếu API có dữ liệu</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.manualBtn}
        onPress={() => navigation.navigate('AddFood')}
      >
        <Text style={styles.manualBtnText}>Nhập thủ công</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { padding: 4 },
  title: { fontSize: SIZES.h1, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: SIZES.body, color: COLORS.muted, marginTop: 2 },
  cameraBox: {
    backgroundColor: '#1C2520',
    borderRadius: SIZES.radiusLarge,
    height: 380,
    alignItems: 'center',
    justifyContent: 'center',
  },
  camText: { color: '#8A9990', fontSize: 12, fontWeight: '600', position: 'absolute', top: 20 },
  scanTarget: {
    width: 220,
    height: 180,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#4E6155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  laserLine: { width: '80%', height: 2, backgroundColor: '#00E676' },
  scanTip: { color: COLORS.white, fontSize: 13, marginTop: 24 },
  apiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: SIZES.radius,
    padding: 14,
    marginVertical: 16,
  },
  apiTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  apiDesc: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  manualBtn: {
    height: SIZES.btnHeight,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    marginBottom: 10,
  },
  manualBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
});
