import React, { useRef, useState } from 'react';
import { Text, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { Button, PageHeader, ui } from '../../components/AppUI';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../viewmodels/AuthProvider';
import { authErrorMessage } from '../../models/auth';
export default function ChangeEmailScreen({ navigation }) {
  const { user } = useAuth();
  const [email, setEmail] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const working = useRef(false);
  const submit = async () => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError('');
    try {
      const value = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value === user.email)
        throw new Error('Nhập email mới hợp lệ và khác email hiện tại.');
      const { error: failure } = await supabase.auth.updateUser(
        { email: value },
        { emailRedirectTo: Linking.createURL('auth/callback') },
      );
      if (failure) throw failure;
      Alert.alert(
        'Kiểm tra email xác nhận',
        'Hãy kiểm tra cả email hiện tại và email mới, hoàn tất các liên kết xác nhận theo hướng dẫn. Email đăng nhập chỉ đổi sau khi xác nhận.',
      );
      navigation.goBack();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      working.current = false;
      setBusy(false);
    }
  };
  return (
    <SafeAreaView style={ui.screen}>
      <PageHeader title="Đổi email đăng nhập" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
        <Text style={ui.body}>Hiện tại: {user.email}</Text>
        <TextInput
          accessibilityLabel="Email mới"
          placeholder="Email mới"
          style={ui.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!busy}
        />
        <Text style={ui.muted}>
          Giữ quyền truy cập email hiện tại cho đến khi hoàn tất xác nhận.
        </Text>
        {!!error && <Text style={ui.error}>{error}</Text>}
        <Button title="Gửi yêu cầu đổi email" busy={busy} onPress={submit} />
      </ScrollView>
    </SafeAreaView>
  );
}
