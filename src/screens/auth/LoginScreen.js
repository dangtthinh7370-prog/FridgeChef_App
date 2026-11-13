import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES } from '../../constants/theme';
import { supabase } from '../../services/supabase';
import { authErrorMessage, validateCredentials } from '../../models/auth';

export default function LoginScreen() {
  const [registering, setRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const submitting = useRef(false);
  const submit = async () => {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setError(''); setInfo('');
    try {
      const credentials = validateCredentials(email, password, registering, confirmation);
      if (registering && (!name.trim() || name.trim().length > 100)) throw new Error('Nhập tên từ 1 đến 100 ký tự.');
      const result = registering
        ? await supabase.auth.signUp({ ...credentials, options: { data: { display_name: name.trim() } } })
        : await supabase.auth.signInWithPassword(credentials);
      if (result.error) throw result.error;
      if (registering && !result.data.session) {
        setInfo('Kiểm tra hộp thư và xác nhận email, sau đó quay lại đây đăng nhập. Nếu đã có tài khoản, bạn có thể đăng nhập ngay.');
        setRegistering(false); setPassword(''); setConfirmation('');
      }
      // AuthProvider, not navigation.replace(), opens the signed-in app.
    } catch (failure) { setError(authErrorMessage(failure)); }
    finally { submitting.current = false; setBusy(false); }
  };
  const switchMode = () => { setRegistering(!registering); setError(''); setInfo(''); setConfirmation(''); };
  return <SafeAreaView style={styles.container}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <View style={styles.logoBox}><Text style={styles.logoText}>FC</Text></View>
        <Text style={styles.title}>FridgeChef</Text>
        <Text style={styles.subtitle}>{registering ? 'Tạo tài khoản cho tủ lạnh của bạn' : 'Đăng nhập để mở tủ lạnh của bạn trên mọi thiết bị'}</Text>
        {registering && <View style={styles.inputGroup}><Text style={styles.label}>Tên của bạn</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} editable={!busy} maxLength={100} placeholder="Nhập tên của bạn" placeholderTextColor={COLORS.muted} autoComplete="name" /></View>}
        <View style={styles.inputGroup}><Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} editable={!busy} placeholder="ban@example.com" placeholderTextColor={COLORS.muted} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" /></View>
        <View style={styles.inputGroup}><Text style={styles.label}>Mật khẩu{registering ? ' (ít nhất 8 ký tự)' : ''}</Text>
          <View style={styles.passwordRow}><TextInput style={[styles.input, { flex: 1 }]} value={password} onChangeText={setPassword} editable={!busy} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} placeholder="Nhập mật khẩu" placeholderTextColor={COLORS.muted} autoComplete={registering ? 'new-password' : 'current-password'} />
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onPress={() => setVisible(!visible)} style={styles.reveal}><Text style={styles.link}>{visible ? 'Ẩn' : 'Hiện'}</Text></TouchableOpacity></View>
        </View>
        {registering && <View style={styles.inputGroup}><Text style={styles.label}>Nhập lại mật khẩu</Text>
          <TextInput style={styles.input} value={confirmation} onChangeText={setConfirmation} editable={!busy} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} placeholder="Nhập lại mật khẩu" placeholderTextColor={COLORS.muted} autoComplete="new-password" /></View>}
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        {!!info && <Text style={styles.info}>{info}</Text>}
        <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={submit} style={[styles.primaryBtn, busy && { opacity: 0.6 }]}>
          {busy ? <ActivityIndicator color="white" /> : <Text style={styles.primaryBtnText}>{registering ? 'Tạo tài khoản' : 'Đăng nhập'}</Text>}
        </TouchableOpacity>
        <View style={styles.hintBox}><Text style={styles.hintText}>Dữ liệu được lưu theo tài khoản trên Supabase. Cần Internet để tải và lưu thay đổi.</Text></View>
        <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={switchMode} style={styles.switchBtn}><Text style={styles.link}>{registering ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'}</Text></TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 24, justifyContent: 'center' },
  logoBox: { width: 72, height: 72, borderRadius: 16, backgroundColor: '#E8F5E9', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoText: { fontSize: 28, fontWeight: '800', color: COLORS.primary },
  title: { fontSize: SIZES.h1, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  subtitle: { fontSize: SIZES.body, color: COLORS.muted, textAlign: 'center', marginTop: 6, marginBottom: 28, lineHeight: 21 },
  inputGroup: { marginBottom: 16 }, label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  input: { height: 50, backgroundColor: COLORS.white, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.divider, paddingHorizontal: 14, fontSize: 15, color: COLORS.text },
  passwordRow: { flexDirection: 'row', gap: 8 }, reveal: { minWidth: 52, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  primaryBtn: { height: 52, backgroundColor: COLORS.primary, borderRadius: SIZES.radius, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  primaryBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  hintBox: { backgroundColor: '#E8F5E9', borderRadius: 8, padding: 12, marginTop: 16 },
  hintText: { fontSize: 13, lineHeight: 20, color: COLORS.darkGreen },
  switchBtn: { minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  link: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  error: { color: COLORS.expired, fontSize: 14, lineHeight: 21, marginBottom: 8 },
  info: { color: COLORS.darkGreen, fontSize: 14, lineHeight: 21, marginBottom: 8 },
});
