import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';
import * as Crypto from 'expo-crypto';
import { supabase } from './supabase';

export async function chooseAvatar(userId, oldPath) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Cần cho phép truy cập ảnh để thay avatar.');
  const selected = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (selected.canceled || !selected.assets?.[0]) return false;
  const image = await manipulateAsync(selected.assets[0].uri, [{ resize: { width: 512 } }], {
    compress: 0.75,
    format: SaveFormat.JPEG,
    base64: true,
  });
  if (!image.base64) throw new Error('Không đọc được ảnh đã chọn.');
  const buffer = decode(image.base64);
  if (buffer.byteLength > 1048576)
    throw new Error('Ảnh sau xử lý vượt quá 1 MB. Vui lòng chọn ảnh khác.');
  const path = `${userId}/${Crypto.randomUUID()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, buffer, { contentType: 'image/jpeg', upsert: false });
  if (uploadError) throw uploadError;
  const { data, error } = await supabase
    .from('profiles')
    .update({ avatar_path: path })
    .eq('user_id', userId)
    .select('user_id');
  if (error || !data?.length) {
    // A lost HTTP response does not prove the update failed. Check before removing a file
    // that may already be the account's current avatar.
    const current = await supabase
      .from('profiles')
      .select('avatar_path')
      .eq('user_id', userId)
      .single();
    if (current.error) throw error || current.error;
    if (current.data.avatar_path !== path) {
      await supabase.storage
        .from('avatars')
        .remove([path])
        .catch(() => {});
      throw error || new Error('Không cập nhật được avatar trong hồ sơ.');
    }
  }
  if (oldPath && oldPath.startsWith(userId + '/'))
    await supabase.storage
      .from('avatars')
      .remove([oldPath])
      .catch(() => {});
  return true;
}
export async function removeAvatar(userId, oldPath) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ avatar_path: null })
    .eq('user_id', userId)
    .select('user_id');
  if (error) throw error;
  if (!data?.length) throw new Error('Không tìm thấy hồ sơ tài khoản.');
  if (oldPath?.startsWith(userId + '/'))
    await supabase.storage
      .from('avatars')
      .remove([oldPath])
      .catch(() => {});
}
