import React, { useRef, useState } from 'react';
import { Text, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, PageHeader, ui } from '../../components/AppUI';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../viewmodels/AuthProvider';
import { validatePasswordChange } from '../../models/profile';
import { authErrorMessage } from '../../models/auth';
export default function ChangePasswordScreen({ navigation }) {
  const { user } = useAuth();
  const [current, setCurrent] = useState(''),
    [password, setPassword] = useState(''),
    [confirmation, setConfirmation] = useState(''),
    [nonce, setNonce] = useState(''),
    [needsNonce, setNeedsNonce] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const working = useRef(false);
  const submit = async () => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError('');
    try {
      validatePasswordChange(current, password, confirmation);
      const verified = await supabase.auth.signInWithPassword({
        email: user.email,
        password: current,
      });
      if (verified.error)
        throw new Error('Mật khẩu hiện tại chưa đúng hoặc không xác thực được tài khoản.');
      const { error: failure } = await supabase.auth.updateUser({
        password,
        ...(nonce.trim() ? { nonce: nonce.trim() } : {}),
      });
      if (failure) {
        if (['reauthentication_needed', 'reauthentication_not_valid'].includes(failure.code)) {
          const sent = await supabase.auth.reauthenticate();
          if (sent.error) throw sent.error;
          setNeedsNonce(true);
          throw new Error('Nhập mã xác thực được gửi qua email rồi thử lại.');
        }
        throw failure;
      }
      setCurrent('');
      setPassword('');
      setConfirmation('');
      setNonce('');
      Alert.alert('Đã đổi mật khẩu', 'Mật khẩu mới có hiệu lực từ bây giờ.');
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
      <PageHeader title="Đổi mật khẩu" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.content}>
          {[
            [current, setCurrent, 'Mật khẩu hiện tại'],
            [password, setPassword, 'Mật khẩu mới (ít nhất 8 ký tự)'],
            [confirmation, setConfirmation, 'Nhập lại mật khẩu mới'],
          ].map(([value, onChangeText, label]) => (
            <TextInput
              key={label}
              accessibilityLabel={label}
              placeholder={label}
              style={ui.input}
              value={value}
              onChangeText={onChangeText}
              editable={!busy}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          ))}
          {needsNonce && (
            <TextInput
              accessibilityLabel="Mã xác thực email"
              placeholder="Mã xác thực email"
              style={ui.input}
              value={nonce}
              onChangeText={setNonce}
              keyboardType="number-pad"
            />
          )}
          {!!error && (
            <Text accessibilityRole="alert" style={ui.error}>
              {error}
            </Text>
          )}
          <Button title="Cập nhật mật khẩu" busy={busy} onPress={submit} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
