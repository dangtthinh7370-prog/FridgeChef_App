import React, { createContext, useContext, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Button, Text, View } from 'react-native';
import { supabase, supabaseConfigured } from '../services/supabase';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!supabase) { setLoading(false); return undefined; }
    let active = true;
    let eventReceived = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      // Do not await SDK calls inside this callback (Auth holds its lock).
      eventReceived = true;
      if (active) { setSession(next); setLoading(false); setError(''); }
    });
    setLoading(true); setError('');
    supabase.auth.getSession().then(({ data, error: failure }) => {
      if (!active || eventReceived) return;
      if (failure) setError(failure.message);
      else setSession(data.session);
      setLoading(false);
    }).catch(failure => { if (active) { setError(failure.message); setLoading(false); } });
    const refresh = state => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    };
    refresh(AppState.currentState);
    const appSub = AppState.addEventListener('change', refresh);
    return () => { active = false; subscription.unsubscribe(); appSub.remove(); supabase.auth.stopAutoRefresh(); };
  }, [retry]);

  if (!supabaseConfigured) return <View style={screen}>
    <Text style={heading}>Kết nối Supabase</Text>
    <Text style={body}>Tạo file .env từ .env.example, điền Project URL và Publishable key rồi khởi động lại Expo bằng npx expo start --clear.</Text>
    <Text style={body}>Cần chạy migration SQL trước khi sử dụng. Xem docs/SUPABASE_SETUP.md.</Text>
  </View>;
  if (loading || error) return <View style={screen}>
    {error ? <><Text style={body}>{error}</Text><Button title="Thử lại" onPress={() => setRetry(n => n + 1)} /></> : <ActivityIndicator size="large" color="#2E7D32" />}
  </View>;
  return <AuthContext.Provider value={{ session, user: session?.user, signOut: async () => {
    const { error: failure } = await supabase.auth.signOut({ scope: 'local' });
    if (failure) throw failure;
    setSession(null);
  } }}>{children}</AuthContext.Provider>;
}
const screen = { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#F7FAF6' };
const heading = { fontSize: 24, fontWeight: '700', color: '#24352A', marginBottom: 16 };
const body = { color: '#24352A', fontSize: 16, lineHeight: 24, marginBottom: 16 };
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider is required');
  return value;
}
