import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, ActivityIndicator, View, Text, Button } from 'react-native';
import { openDatabaseAsync } from 'expo-sqlite';
import { initializeDatabase, DATABASE_NAME } from '../database/schema';
import { createFridgeRepository } from '../repositories/fridgeRepository';
import { decorateFood } from '../models/food';

const FridgeContext = createContext(null);
let repositoryPromise;
function openRepository() {
  if (!repositoryPromise) {
    repositoryPromise = (async () => {
      const db = await openDatabaseAsync(DATABASE_NAME);
      await initializeDatabase(db);
      return createFridgeRepository(db);
    })().catch(error => { repositoryPromise = undefined; throw error; });
  }
  return repositoryPromise;
}

export function FridgeProvider({ children }) {
  const repository = useRef(null);
  const [snapshot, setSnapshot] = useState({ foods: [], shopping: [] });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [now, setNow] = useState(new Date());
  const reload = useCallback(async () => {
    const next = await repository.current.getSnapshot();
    setSnapshot(next);
    setNow(new Date());
  }, []);
  const initialize = useCallback(async () => {
    setError('');
    try {
      repository.current = await openRepository();
      await reload();
      setReady(true);
    } catch (err) { setError(err.message); }
  }, [reload]);
  useEffect(() => { initialize(); }, [initialize]);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') setNow(new Date());
    });
    return () => { clearInterval(timer); sub.remove(); };
  }, []);

  const mutate = useCallback(async (method, ...args) => {
    if (busyRef.current) throw new Error('Đang lưu dữ liệu. Vui lòng đợi một chút.');
    busyRef.current = true;
    setBusy(true);
    try {
      const result = await repository.current[method](...args);
      // A committed write is never reported as a failed write (avoids duplicate retries).
      try { await reload(); }
      catch (err) { setError(`Đã lưu nhưng chưa tải lại được dữ liệu: ${err.message}`); }
      return result;
    } finally { busyRef.current = false; setBusy(false); }
  }, [reload]);
  const foods = useMemo(() => snapshot.foods.map(food => decorateFood(food, now)), [snapshot.foods, now]);
  const value = useMemo(() => ({ foods, shopping: snapshot.shopping, busy, mutate, reload }), [foods, snapshot.shopping, busy, mutate, reload]);

  if (!ready || error) {
    return <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#F7FAF6' }}>
      {error ? <><Text accessibilityRole="alert" style={{ marginBottom: 16 }}>{error}</Text><Button title="Thử lại" onPress={initialize} /></> : <><ActivityIndicator size="large" color="#2E7D32" /><Text style={{ textAlign: 'center', marginTop: 16 }}>Đang mở tủ lạnh…</Text></>}
    </View>;
  }
  return <FridgeContext.Provider value={value}>{children}</FridgeContext.Provider>;
}

export function useFridgeViewModel() {
  const context = useContext(FridgeContext);
  if (!context) throw new Error('FridgeProvider is required.');
  return context;
}
