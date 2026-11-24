import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, Image, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, PageHeader, ui } from '../../components/AppUI';
import { useAuth } from '../../viewmodels/AuthProvider';
import { useProfile } from '../../viewmodels/ProfileProvider';
import { chooseAvatar, removeAvatar } from '../../services/accountService';
export default function ProfileScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const { profile, avatarUrl, loading, error: loadError, reload } = useProfile();
  const [working, setWorking] = useState(false),
    [error, setError] = useState('');
  const running = useRef(false);
  const run = async (action) => {
    if (running.current) return;
    running.current = true;
    setWorking(true);
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err.message);
    } finally {
      running.current = false;
      setWorking(false);
    }
  };
  const avatar = () =>
    Alert.alert('Ảnh đại diện', 'Chọn thao tác', [
      {
        text: 'Chọn ảnh từ thư viện',
        onPress: () =>
          run(async () => {
            if (await chooseAvatar(user.id, profile?.avatar_path)) await reload();
          }),
      },
      ...(profile?.avatar_path
        ? [
            {
              text: 'Gỡ ảnh hiện tại',
              onPress: () =>
                run(async () => {
                  await removeAvatar(user.id, profile.avatar_path);
                  await reload();
                }),
            },
          ]
        : []),
      { text: 'Hủy', style: 'cancel' },
    ]);
  const logout = (allDevices) =>
    Alert.alert(
      allDevices ? 'Đăng xuất trên mọi thiết bị?' : 'Đăng xuất?',
      allDevices
        ? 'Các phiên khác sẽ cần đăng nhập lại khi phiên hiện tại hết hiệu lực.'
        : 'Bạn có thể đăng nhập lại bất cứ lúc nào.',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đăng xuất', onPress: () => run(() => signOut({ allDevices })) },
      ],
    );
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={ui.screen}>
      <PageHeader title="Tài khoản" subtitle="Thông tin cá nhân và bảo mật" />
      <ScrollView contentContainerStyle={ui.content}>
        <View style={[ui.card, { alignItems: 'center', paddingVertical: 24 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đổi ảnh đại diện"
            disabled={working || !profile}
            onPress={avatar}
            style={{ marginBottom: 8 }}
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{ width: 96, height: 96, borderRadius: 48 }}
                onError={() => setError('Chưa hiển thị được ảnh đại diện. Thử tải lại hồ sơ.')}
              />
            ) : (
              <View
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  backgroundColor: '#E7F0E1',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="person-outline" size={44} color="#2E7D32" />
              </View>
            )}
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                padding: 6,
                backgroundColor: '#2E7D32',
                borderRadius: 20,
              }}
            >
              <Ionicons name="camera-outline" color="#fff" size={18} />
            </View>
          </Pressable>
          <Text style={ui.heading}>{profile?.display_name || 'Tài khoản FridgeChef'}</Text>
          <Text style={ui.muted}>{user.email}</Text>
          {!!profile?.bio && <Text style={ui.body}>{profile.bio}</Text>}
        </View>
        {!!loadError && (
          <View style={ui.card}>
            <Text style={ui.error}>{loadError}</Text>
            <Button
              secondary
              title="Tải lại hồ sơ"
              busy={loading || working}
              onPress={() => run(reload)}
            />
          </View>
        )}
        {[
          ['Thông tin cá nhân', 'person-outline', 'EditProfile'],
          ['Sở thích ăn uống', 'heart-outline', 'FoodPreferences'],
          ['Đổi email đăng nhập', 'mail-outline', 'ChangeEmail'],
          ['Đổi mật khẩu', 'lock-closed-outline', 'ChangePassword'],
          ['Cảnh báo hạn dùng', 'notifications-outline', 'ExpiryAlert'],
          ['Nhật ký thực phẩm', 'time-outline', 'Activity'],
        ].map(([label, icon, screen]) => (
          <Pressable
            key={screen}
            accessibilityRole="button"
            disabled={working || (['EditProfile', 'FoodPreferences'].includes(screen) && !profile)}
            style={[ui.card, ui.row]}
            onPress={() => navigation.navigate(screen)}
          >
            <Ionicons name={icon} size={23} color="#2E7D32" />
            <Text style={[ui.body, { flex: 1 }]}>{label}</Text>
            <Ionicons name="chevron-forward" size={18} color="#71816E" />
          </Pressable>
        ))}
        {!!error && (
          <Text accessibilityRole="alert" style={ui.error}>
            {error}
          </Text>
        )}
        <View style={ui.card}>
          <Text style={ui.heading}>Phiên đăng nhập</Text>
          <Button secondary title="Đăng xuất" disabled={working} onPress={() => logout(false)} />
          <Pressable
            accessibilityRole="button"
            disabled={working}
            style={[ui.iconButton, { alignSelf: 'flex-start', paddingHorizontal: 6 }]}
            onPress={() => logout(true)}
          >
            <Text style={ui.error}>Đăng xuất trên mọi thiết bị</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
