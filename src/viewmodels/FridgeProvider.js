import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, ActivityIndicator, View, Text, Button } from 'react-native';
import { createSupabaseFridgeRepository } from '../repositories/supabaseFridgeRepository';
import { supabase } from '../services/supabase';
import { readLegacySnapshot } from '../services/legacyImport';
import { useAuth } from './AuthProvider';
import { decorateFood } from '../models/food';

const FridgeContext = createContext(null);
export function FridgeProvider({ children }) {
  const { user, signOut } = useAuth();
  const repository = useMemo(() => createSupabaseFridgeRepository(supabase, user.id), [user.id]);
  const [snapshot, setSnapshot] = useState({ foods: [], shopping: [] });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const active = useRef(true);
  const readVersion = useRef(0);
  const [now, setNow] = useState(new Date());
  const reload = useCallback(async () => {
    const version = ++readVersion.current;
    const next = await repository.getSnapshot();
    if (active.current && version === readVersion.current) {
      setSnapshot(next); setNow(new Date()); setError(''); setReady(true);
    }
  }, [repository]);
  const initialize = useCallback(async () => {
    try { await reload(); }
    catch (err) { if (active.current) setError(err.message); }
  }, [reload]);
  useEffect(() => {
    active.current = true; initialize();
    return () => { active.current = false; readVersion.current++; };
  }, [initialize]);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    const sub = AppState.addEventListener('change', state => { if (state === 'active') initialize(); });
    return () => { clearInterval(timer); sub.remove(); };
  }, [initialize]);
  const mutate = useCallback(async (method, ...args) => {
    if (busyRef.current) throw new Error('Đang lưu dữ liệu. Vui lòng đợi một chút.');
    if (!['saveFood','deleteFood','saveShopping','setBought','deleteShopping','moveBoughtToFridge','importLegacy','addDemoFoods'].includes(method)) throw new Error('Thao tác không được hỗ trợ.');
    busyRef.current = true; setBusy(true);
    try {
      const result = await repository[method](...args);
      try { await reload(); }
      catch (err) { if (active.current) setError(`Đã lưu trên Supabase nhưng chưa tải lại được: ${err.message}`); }
      return result;
    } finally { busyRef.current = false; if (active.current) setBusy(false); }
  }, [repository, reload]);
  const importLegacy = useCallback(async () => {
    const legacy = await readLegacySnapshot(user.id, true);
    return mutate('importLegacy', legacy);
  }, [mutate, user.id]);
  const foods = useMemo(() => snapshot.foods.map(food => decorateFood(food, now)), [snapshot.foods, now]);
  const value = useMemo(() => ({ foods, shopping: snapshot.shopping, busy, mutate, reload, importLegacy }), [foods, snapshot.shopping, busy, mutate, reload, importLegacy]);
  if (!ready) return <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#F7FAF6' }}>
    {error ? <><Text accessibilityRole="alert" style={{ marginBottom: 16 }}>{error}</Text><Button title="Thử tải lại" onPress={initialize} />
      <Button title="Đăng xuất" onPress={() => signOut().catch(err => setError(err.message))} /></>
      : <><ActivityIndicator size="large" color="#2E7D32" /><Text style={{ textAlign: 'center', marginTop: 16 }}>Đang tải tủ lạnh của bạn…</Text></>}
  </View>;
  return <FridgeContext.Provider value={value}>
    {!!error && <View style={{ backgroundColor: '#FFF3E0', padding: 16 }}><Text accessibilityRole="alert">{error}</Text><Button title="Tải lại dữ liệu" onPress={initialize} /></View>}
    {children}
  </FridgeContext.Provider>;
}
export function useFridgeViewModel() {
  const context = useContext(FridgeContext);
  if (!context) throw new Error('FridgeProvider is required.');
  return context;
}
