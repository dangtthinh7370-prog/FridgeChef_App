import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Button, Text, View } from 'react-native';
import { supabase, supabaseConfigured } from '../services/supabase';
import * as Linking from 'expo-linking';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [recovery, setRecovery] = useState(false);
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return undefined;
    }
    let active = true;
    let eventReceived = false;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      // Do not await SDK calls inside this callback (Auth holds its lock).
      eventReceived = true;
      if (active) {
        if (_event === 'PASSWORD_RECOVERY') setRecovery(true);
        setSession(next);
        setLoading(false);
        setError('');
      }
    });
    setLoading(true);
    setError('');
    supabase.auth
      .getSession()
      .then(({ data, error: failure }) => {
        if (!active || eventReceived) return;
        if (failure) setError(failure.message);
        else setSession(data.session);
        setLoading(false);
      })
      .catch((failure) => {
        if (active) {
          setError(failure.message);
          setLoading(false);
        }
      });
    const refresh = (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    };
    refresh(AppState.currentState);
    const appSub = AppState.addEventListener('change', refresh);
    const openLink = async (url) => {
      if (!url || !url.includes('auth/callback')) return;
      try {
        const parameters = new URLSearchParams(url.split('#')[1] || url.split('?')[1] || '');
        if (parameters.get('error_description'))
          throw new Error('Liên kết đã hết hạn. Vui lòng yêu cầu email mới.');
        if (parameters.get('type') === 'recovery' && active) setRecovery(true);
        let result;
        if (parameters.get('code'))
          result = await supabase.auth.exchangeCodeForSession(parameters.get('code'));
        else if (parameters.get('access_token') && parameters.get('refresh_token'))
          result = await supabase.auth.setSession({
            access_token: parameters.get('access_token'),
            refresh_token: parameters.get('refresh_token'),
          });
        if (result?.error) throw result.error;
      } catch (failure) {
        if (active) {
          setRecovery(false);
          setError(failure.message);
        }
      }
    };
    const linkSub = Linking.addEventListener('url', (event) => openLink(event.url));
    Linking.getInitialURL()
      .then(openLink)
      .catch(() => {});
    return () => {
      active = false;
      subscription.unsubscribe();
      appSub.remove();
      linkSub.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, [retry]);

  if (!supabaseConfigured)
    return (
      <View style={screen}>
        <Text style={heading}>Kết nối Supabase</Text>
        <Text style={body}>
          Tạo file .env từ .env.example, điền Project URL và Publishable key rồi khởi động lại Expo
          bằng npx expo start --clear.
        </Text>
        <Text style={body}>
          Cần chạy migration SQL trước khi sử dụng. Xem docs/SUPABASE_SETUP.md.
        </Text>
      </View>
    );
  if (loading || error)
    return (
      <View style={screen}>
        {error ? (
          <>
            <Text style={body}>{error}</Text>
            <Button title="Thử lại" onPress={() => setRetry((n) => n + 1)} />
          </>
        ) : (
          <ActivityIndicator size="large" color="#2E7D32" />
        )}
      </View>
    );
  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user,
        recovery,
        completeRecovery: () => setRecovery(false),
        signOut: async ({ allDevices = false } = {}) => {
          const { error: failure } = await supabase.auth.signOut({
            scope: allDevices ? 'global' : 'local',
          });
          if (failure) throw failure;
          setSession(null);
          setRecovery(false);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
const screen = { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#F7FAF6' };
const heading = { fontSize: 24, fontWeight: '700', color: '#24352A', marginBottom: 16 };
const body = { color: '#24352A', fontSize: 16, lineHeight: 24, marginBottom: 16 };
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider is required');
  return value;
}
