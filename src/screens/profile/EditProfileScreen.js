import React, { useEffect, useRef, useState } from 'react';
import { Text, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, PageHeader, ui } from '../../components/AppUI';
import { useProfile } from '../../viewmodels/ProfileProvider';
export default function EditProfileScreen({ navigation }) {
  const { profile, save, error: loadError, reload } = useProfile();
  const [form, setForm] = useState(() => ({
    display_name: profile?.display_name || '',
    phone: profile?.phone || '',
    bio: profile?.bio || '',
    date_of_birth: profile?.date_of_birth || '',
  }));
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const initialVersion = useRef(profile?.updated_at);
  const initial = useRef(JSON.stringify(form)),
    allowExit = useRef(false),
    working = useRef(false);
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        if (allowExit.current || JSON.stringify(form) === initial.current) return;
        event.preventDefault();
        if (working.current) return;
        Alert.alert('Bỏ thay đổi?', 'Thông tin vừa nhập chưa được cập nhật.', [
          { text: 'Tiếp tục sửa', style: 'cancel' },
          {
            text: 'Bỏ thay đổi',
            onPress: () => {
              allowExit.current = true;
              navigation.dispatch(event.data.action);
            },
          },
        ]);
      }),
    [navigation, form],
  );
  const update = async () => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError('');
    try {
      await save(form, initialVersion.current);
      allowExit.current = true;
      navigation.goBack();
    } catch (err) {
      setError(err.message);
    } finally {
      working.current = false;
      setBusy(false);
    }
  };
  return (
    <SafeAreaView style={ui.screen}>
      <PageHeader title="Thông tin cá nhân" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.content}>
          {loadError && <Text style={ui.error}>{loadError}</Text>}
          {[
            ['display_name', 'Tên hiển thị', 100],
            ['phone', 'Số điện thoại liên hệ', 25],
            ['date_of_birth', 'Ngày sinh (yyyy-MM-dd)', 10],
            ['bio', 'Giới thiệu', 500],
          ].map(([key, label, max]) => (
            <React.Fragment key={key}>
              <Text style={ui.body}>{label}</Text>
              <TextInput
                accessibilityLabel={label}
                style={ui.input}
                value={form[key]}
                onChangeText={(value) => setForm((f) => ({ ...f, [key]: value }))}
                editable={!busy}
                maxLength={max}
                multiline={key === 'bio'}
                keyboardType={key === 'phone' ? 'phone-pad' : 'default'}
                placeholder={key === 'date_of_birth' ? 'Ví dụ: 2005-08-20' : ''}
              />
            </React.Fragment>
          ))}
          <Text style={ui.muted}>
            Số điện thoại là thông tin liên hệ, không thay đổi phương thức đăng nhập.
          </Text>
          {!!error && <Text style={ui.error}>{error}</Text>}
          <Button title="Cập nhật thông tin" busy={busy} disabled={!profile} onPress={update} />
          {!profile && (
            <Button
              secondary
              title="Tải lại hồ sơ"
              onPress={() => reload().catch((err) => setError(err.message))}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
