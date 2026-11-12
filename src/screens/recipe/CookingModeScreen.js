// src/screens/recipe/CookingModeScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants/theme';

export default function CookingModeScreen({ navigation }) {
  const [seconds, setSeconds] = useState(300); // 5 phút = 300s
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isActive && seconds > 0) {
      interval = setInterval(() => {
        setSeconds(prev => prev - 1);
      }, 1000);
    } else if (seconds === 0) {
      clearInterval(interval);
      setIsActive(false);
      Alert.alert('Hoàn thành', 'Hết giờ nấu cho bước 2!');
    }
    return () => clearInterval(interval);
  }, [isActive, seconds]);

  const formatTime = (sec) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleNext = () => {
    Alert.alert('Thành công', 'Chúc mừng bạn đã hoàn thành món ăn! Hệ thống "Nấu ngay" sẽ tự động trừ các nguyên liệu đã dùng trong tủ lạnh (Tuần 3-4).', [
      { text: 'Về trang chủ', onPress: () => navigation.navigate('MainTabs') }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.title}>Chế độ nấu ăn</Text>
          <Text style={styles.subtitle}>Hướng dẫn từng bước • Màn hình luôn sáng</Text>
        </View>
      </View>

      {/* Progress */}
      <Text style={styles.stepProgress}>BƯỚC 2 / 5</Text>
      <View style={styles.progressBar}>
        <View style={styles.progressActive} />
      </View>

      {/* Card Bước */}
      <View style={styles.stepCard}>
        <Text style={styles.stepNum}>Bước 2</Text>
        <Text style={styles.stepHeading}>Xào thịt gà</Text>
        <Text style={styles.stepBody}>
          Cho một ít dầu vào chảo, phi thơm hành tím. Thêm thịt gà và đảo đều tay cho săn thịt lại.
        </Text>
      </View>

      {/* Timer Bấm giờ */}
      <View style={styles.timerCard}>
        <Text style={styles.timerTitle}>ĐỒNG HỒ NẤU ĂN</Text>
        <Text style={styles.timerClock}>{formatTime(seconds)}</Text>
        <TouchableOpacity
          style={[styles.timerBtn, isActive && { backgroundColor: COLORS.expirySoon }]}
          onPress={() => setIsActive(!isActive)}
        >
          <Text style={styles.timerBtnText}>
            {isActive ? 'Tạm dừng hẹn giờ' : 'Bắt đầu hẹn giờ'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Nav Buttons */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.prevBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.prevBtnText}>Quay lại</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>Bước tiếp theo →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { padding: 4 },
  title: { fontSize: SIZES.h1, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: SIZES.body, color: COLORS.muted, marginTop: 2 },
  stepProgress: { fontSize: 12, fontWeight: '700', color: COLORS.primary, marginBottom: 6 },
  progressBar: { height: 6, backgroundColor: COLORS.divider, borderRadius: 3, marginBottom: 16 },
  progressActive: { width: '40%', height: 6, backgroundColor: COLORS.primary, borderRadius: 3 },
  stepCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLarge,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.divider,
    marginBottom: 16,
  },
  stepNum: { fontSize: 13, color: COLORS.muted },
  stepHeading: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginVertical: 6 },
  stepBody: { fontSize: 15, color: COLORS.text, lineHeight: 22 },
  timerCard: {
    borderWidth: 2,
    borderColor: '#0284C7',
    borderRadius: SIZES.radiusLarge,
    backgroundColor: COLORS.white,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  timerTitle: { fontSize: 12, fontWeight: '700', color: '#0284C7' },
  timerClock: { fontSize: 44, fontWeight: '800', color: '#0284C7', marginVertical: 8 },
  timerBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: SIZES.radius,
  },
  timerBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  bottomNav: { flexDirection: 'row', gap: 12, marginTop: 'auto', marginBottom: 10 },
  prevBtn: {
    flex: 1,
    height: SIZES.btnHeight,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prevBtnText: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  nextBtn: {
    flex: 1.5,
    height: SIZES.btnHeight,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
});
