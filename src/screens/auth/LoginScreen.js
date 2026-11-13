// src/screens/auth/LoginScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES } from '../../constants/theme';
import { MOCK_AUTH_USER } from '../../data/mockData';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('fridgechef@example.com');
  const [password, setPassword] = useState('123456');

  const handleLogin = () => {
    // Tuần 2: Sử dụng tài khoản mock demo
    // Tuần 3-4: Bạn làm Backend sẽ thay bằng hàm Firebase Auth: signInWithEmailAndPassword(auth, email, password)
    navigation.replace('MainTabs');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo FC */}
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>{MOCK_AUTH_USER.avatarCode}</Text>
        </View>

        <Text style={styles.title}>FridgeChef</Text>
        <Text style={styles.subtitle}>Quản lý tủ lạnh và nấu ăn thông minh</Text>

        {/* Inputs */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            placeholder="Nhập email của bạn"
            placeholderTextColor={COLORS.muted}
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mật khẩu</Text>
          <TextInput
            placeholder="Nhập mật khẩu"
            placeholderTextColor={COLORS.muted}
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity style={styles.forgotBtn}>
            <Text style={styles.forgotText}>Quên mật khẩu?</Text>
          </TouchableOpacity>
        </View>

        {/* Buttons */}
        <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin}>
          <Text style={styles.primaryBtnText}>Đăng nhập</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.googleBtn} onPress={handleLogin}>
          <Text style={styles.googleBtnText}>Tiếp tục với Google</Text>
        </TouchableOpacity>

        {/* Demo Account Hint */}
        <View style={styles.demoHintBox}>
          <Text style={styles.demoHintText}>
            💡 Demo cục bộ · chưa xác thực tài khoản. Dữ liệu dùng chung trên thiết bị.
          </Text>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Chưa có tài khoản? </Text>
          <TouchableOpacity onPress={() => Alert.alert('Thông báo', 'Tính năng đăng ký sẽ liên kết Firebase ở Tuần 3-4')}>
            <Text style={styles.registerText}>Đăng ký</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#E8F5E9',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: { fontSize: 28, fontWeight: '800', color: COLORS.primary },
  title: { fontSize: SIZES.h1, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  subtitle: { fontSize: SIZES.body, color: COLORS.muted, textAlign: 'center', marginTop: 6, marginBottom: 28 },
  inputGroup: { marginBottom: 16 },
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
  forgotBtn: { alignSelf: 'flex-end', marginTop: 6 },
  forgotText: { fontSize: 13, color: COLORS.primary, fontWeight: '500' },
  primaryBtn: {
    height: SIZES.btnHeight,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  primaryBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  googleBtn: {
    height: SIZES.btnHeight,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.divider,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  googleBtnText: { color: COLORS.text, fontSize: 15, fontWeight: '500' },
  demoHintBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  demoHintText: { fontSize: 12, color: COLORS.darkGreen },
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { fontSize: 14, color: COLORS.muted },
  registerText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
});
