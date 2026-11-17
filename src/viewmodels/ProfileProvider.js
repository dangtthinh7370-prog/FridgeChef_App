import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthProvider';
import { validateProfile } from '../models/profile';
const Context = createContext(null);
export function ProfileProvider({ children }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null),
    [avatarUrl, setAvatarUrl] = useState(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  const active = useRef(true),
    version = useRef(0);
  const reload = useCallback(async () => {
    const request = ++version.current;
    try {
      const { data, error: failure } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (failure) throw failure;
      let url = null;
      let avatarError = '';
      if (data.avatar_path) {
        const signed = await supabase.storage
          .from('avatars')
          .createSignedUrl(data.avatar_path, 3600);
        if (signed.error)
          avatarError =
            'Không tải được ảnh đại diện. Bạn có thể chọn ảnh khác hoặc gỡ ảnh hiện tại.';
        else url = signed.data.signedUrl;
      }
      if (active.current && request === version.current) {
        setProfile(data);
        setAvatarUrl(url);
        setError(avatarError);
      }
      return data;
    } catch (err) {
      if (active.current && request === version.current) setError(err.message);
      throw err;
    } finally {
      if (active.current && request === version.current) setLoading(false);
    }
  }, [user.id]);
  useEffect(() => {
    active.current = true;
    reload().catch(() => {});
    const timer = setInterval(() => reload().catch(() => {}), 1800000);
    const app = AppState.addEventListener('change', (s) => {
      if (s === 'active') reload().catch(() => {});
    });
    const channel = supabase
      .channel(`profile-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `user_id=eq.${user.id}` },
        () => reload().catch(() => {}),
      )
      .subscribe();
    return () => {
      active.current = false;
      version.current++;
      clearInterval(timer);
      app.remove();
      supabase.removeChannel(channel);
    };
  }, [user.id, reload]);
  const save = async (input, expectedVersion = profile?.updated_at) => {
    const fields = validateProfile(input);
    let query = supabase.from('profiles').update(fields).eq('user_id', user.id);
    if (expectedVersion) query = query.eq('updated_at', expectedVersion);
    const { data, error: failure } = await query.select('user_id');
    if (failure) throw failure;
    if (!data.length) throw new Error('Thông tin đã thay đổi. Tải lại hồ sơ trước khi cập nhật.');
    await reload();
  };
  const setReminders = async (enabled) => {
    const { error: failure } = await supabase
      .from('profiles')
      .update({ reminders_enabled: !!enabled })
      .eq('user_id', user.id)
      .select('user_id')
      .single();
    if (failure) throw failure;
    await reload();
  };
  return (
    <Context.Provider value={{ profile, avatarUrl, error, loading, reload, save, setReminders }}>
      {children}
    </Context.Provider>
  );
}
export const useProfile = () => useContext(Context);
