import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, PageHeader, ui } from '../../components/AppUI';
import { COLORS } from '../../constants/theme';
import { getFoodPreferences } from '../../models/profile';
import { useProfile } from '../../viewmodels/ProfileProvider';

const fields = [
  {
    key: 'food_likes',
    label: 'Yêu thích',
    icon: 'heart-outline',
    hint: 'Ví dụ: thích vị cay, thích nấm',
    quick: ['Thích vị cay', 'Thích nấm'],
  },
  {
    key: 'food_limits',
    label: 'Hạn chế',
    icon: 'options-outline',
    hint: 'Ví dụ: giảm ngọt, ít dầu mỡ',
    quick: ['Giảm ngọt', 'Ít dầu mỡ'],
  },
  {
    key: 'food_dislikes',
    label: 'Ghét',
    icon: 'close-circle-outline',
    hint: 'Ví dụ: không ăn cá, không thích rau mùi',
    quick: ['Không ăn cá', 'Không thích rau mùi'],
  },
];

export default function FoodPreferencesScreen({ navigation }) {
  const { profile, saveFoodPreferences, reload } = useProfile();
  const [form, setForm] = useState(() => getFoodPreferences(profile));
  const original = useRef(form);
  const allowExit = useRef(false);
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dirty = fields.some(({ key }) => form[key] !== original.current[key]);
  const stale = fields.some(({ key }) => (profile?.[key] || '') !== original.current[key]);

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        if (allowExit.current || (!dirty && !saving.current)) return;
        event.preventDefault();
        if (saving.current) return;
        Alert.alert('Bỏ thay đổi?', 'Sở thích vừa nhập chưa được lưu.', [
          { text: 'Tiếp tục sửa', style: 'cancel' },
          {
            text: 'Bỏ thay đổi',
            style: 'destructive',
            onPress: () => {
              allowExit.current = true;
              navigation.dispatch(event.data.action);
            },
          },
        ]);
      }),
    [dirty, navigation],
  );

  const refresh = async () => {
    try {
      const current = getFoodPreferences(await reload());
      original.current = current;
      setForm(current);
      setError('');
    } catch (failure) {
      setError(failure.message);
    }
  };

  const save = async () => {
    if (!dirty || stale || saving.current) return;
    saving.current = true;
    setBusy(true);
    setError('');
    try {
      await saveFoodPreferences(form, original.current);
      allowExit.current = true;
      navigation.goBack();
    } catch (failure) {
      setError(failure.message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  return (
    <SafeAreaView style={ui.screen}>
      <PageHeader title="Sở thích ăn uống" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.content}>
          <Text style={ui.body}>
            Bếp AI dùng sở thích này để chọn món và gợi ý cách nấu phù hợp với bạn.
          </Text>
          {fields.map(({ key, label, icon, hint, quick }) => (
            <View key={key} style={ui.card}>
              <View style={ui.row}>
                <Ionicons name={icon} size={20} color={COLORS.primary} />
                <Text style={s.label}>{label}</Text>
              </View>
              <TextInput
                accessibilityLabel={label}
                value={form[key]}
                placeholder={hint}
                placeholderTextColor={COLORS.muted}
                multiline
                maxLength={500}
                editable={!busy}
                onChangeText={(value) => {
                  setError('');
                  setForm((current) => ({ ...current, [key]: value }));
                }}
                style={[ui.input, s.input]}
              />
              <View style={s.quickRow}>
                {quick.map((choice) => {
                  const chosen = form[key]
                    .split(/[,\n]+/)
                    .some((value) => value.trim().toLowerCase() === choice.toLowerCase());
                  return (
                    <Pressable
                      key={choice}
                      accessibilityRole="button"
                      accessibilityState={{ selected: chosen, disabled: busy || chosen }}
                      disabled={busy || chosen}
                      style={s.quickChip}
                      onPress={() => {
                        setError('');
                        setForm((current) => {
                          const next = [current[key].trim(), choice].filter(Boolean).join(', ');
                          return next.length <= 500 ? { ...current, [key]: next } : current;
                        });
                      }}
                    >
                      <Ionicons
                        name={chosen ? 'checkmark' : 'add'}
                        size={16}
                        color={COLORS.primary}
                      />
                      <Text style={s.quickText}>{choice}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
          {!!error && (
            <Text accessibilityRole="alert" style={ui.error}>
              {error}
            </Text>
          )}
          {(stale || !!error) && (
            <Button
              secondary
              title="Tải sở thích đã lưu"
              disabled={busy}
              onPress={() => {
                if (!dirty) {
                  refresh();
                  return;
                }
                Alert.alert(
                  'Tải lại sở thích?',
                  'Thao tác này sẽ thay các chỉnh sửa chưa lưu bằng dữ liệu trên hồ sơ.',
                  [
                    { text: 'Hủy', style: 'cancel' },
                    { text: 'Tải lại', onPress: refresh },
                  ],
                );
              }}
            />
          )}
        </ScrollView>
        <View style={ui.footer}>
          <Button title="Lưu sở thích" busy={busy} disabled={!dirty || stale} onPress={save} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  label: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  input: { minHeight: 64, textAlignVertical: 'top' },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: '#E7EFDF',
    borderRadius: 12,
  },
  quickText: { color: COLORS.darkGreen, fontSize: 13, fontWeight: '700', flexShrink: 1 },
});
