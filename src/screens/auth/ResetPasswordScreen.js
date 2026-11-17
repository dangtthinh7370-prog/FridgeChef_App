import React, { useState } from 'react';
import { Text, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, PageHeader, ui } from '../../components/AppUI';
import { useAuth } from '../../viewmodels/AuthProvider';
import { supabase } from '../../services/supabase';
import { authErrorMessage } from '../../models/auth';
export default function ResetPasswordScreen() {
  const { completeRecovery, signOut } = useAuth();
  const [password, setPassword] = useState(''),
    [confirmation, setConfirmation] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const save = async () => {
    if (busy) return;
    setError('');
    if (password.length < 8 || password !== confirmation) {
      setError('Mật khẩu cần ít nhất 8 ký tự và hai lần nhập phải khớp.');
      return;
    }
    setBusy(true);
    try {
      const { error: failure } = await supabase.auth.updateUser({ password });
      if (failure) throw failure;
      completeRecovery();
      Alert.alert('Đã đổi mật khẩu', 'Bạn đã có thể sử dụng mật khẩu mới.');
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <SafeAreaView style={ui.screen}>
      <PageHeader title="Đặt mật khẩu mới" subtitle="Bảo vệ tài khoản FridgeChef của bạn" />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.content}>
        <TextInput
          accessibilityLabel="Mật khẩu mới"
          placeholder="Mật khẩu mới (ít nhất 8 ký tự)"
          style={ui.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          autoComplete="new-password"
        />
        <TextInput
          accessibilityLabel="Nhập lại mật khẩu mới"
          placeholder="Nhập lại mật khẩu mới"
          style={ui.input}
          secureTextEntry
          value={confirmation}
          onChangeText={setConfirmation}
          autoCapitalize="none"
        />
        {!!error && <Text style={ui.error}>{error}</Text>}
        <Button title="Lưu mật khẩu" busy={busy} onPress={save} />
        <Button
          secondary
          title="Hủy và đăng xuất"
          disabled={busy}
          onPress={() => signOut().catch((err) => setError(err.message))}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
