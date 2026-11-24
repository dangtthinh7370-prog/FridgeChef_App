import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { createSupabaseFridgeRepository } from '../repositories/supabaseFridgeRepository';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthProvider';
import { decorateFood } from '../models/food';
import { useProfile } from './ProfileProvider';
import {
  cancelExpiryReminders,
  syncReminders,
  notificationPermission,
} from '../services/notifications';

const FridgeContext = createContext(null);
export function FridgeProvider({ children }) {
  const { user, signOut } = useAuth();
  const { profile, setReminders } = useProfile();
  const repository = useMemo(() => createSupabaseFridgeRepository(supabase, user.id), [user.id]);
  const [snapshot, setSnapshot] = useState({ foods: [], shopping: [] });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const reminderEnabled = !!profile?.reminders_enabled;
  const [reminderError, setReminderError] = useState('');
  const busyRef = useRef(false);
  const active = useRef(true);
  const readVersion = useRef(0);
  const [now, setNow] = useState(new Date());
  const reload = useCallback(async () => {
    const version = ++readVersion.current;
    let next;
    try {
      next = await repository.getSnapshot();
    } catch (failure) {
      if (active.current && version === readVersion.current) throw failure;
      return;
    }
    if (active.current && version === readVersion.current) {
      const synced = new Date().toISOString();
      setSnapshot(next);
      setNow(new Date());
      setError('');
      setReady(true);
      setOffline(false);
      setLastSynced(synced);
    }
  }, [repository]);
  const initialize = useCallback(async () => {
    try {
      await reload();
    } catch (err) {
      if (!active.current) return;
      setError(err.message);
      setOffline(true);
    }
  }, [reload]);
  useEffect(() => {
    active.current = true;
    initialize();
    return () => {
      active.current = false;
      readVersion.current++;
    };
  }, [initialize]);
  useEffect(() => {
    let timer;
    const changed = () => {
      clearTimeout(timer);
      timer = setTimeout(initialize, 400);
    };
    const channel = supabase
      .channel(`fridge-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'food_items', filter: `user_id=eq.${user.id}` },
        changed,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shopping_items', filter: `user_id=eq.${user.id}` },
        changed,
      )
      .subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [user.id, initialize]);
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
      if (AppState.currentState === 'active' && !busyRef.current) initialize();
    }, 60000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') initialize();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [initialize]);
  const mutate = useCallback(
    async (method, ...args) => {
      if (busyRef.current) throw new Error('Đang lưu dữ liệu. Vui lòng đợi một chút.');
      if (offline)
        throw new Error('Chưa kết nối được Supabase. Kết nối mạng và tải lại trước khi thay đổi.');
      if (
        ![
          'saveFood',
          'deleteFood',
          'saveShopping',
          'setBought',
          'deleteShopping',
          'moveBoughtToFridge',
          'consumeFood',
          'addRecipeShopping',
        ].includes(method)
      )
        throw new Error('Thao tác không được hỗ trợ.');
      busyRef.current = true;
      setBusy(true);
      try {
        const result = await repository[method](...args);
        try {
          await reload();
        } catch (err) {
          if (active.current)
            setError(`Đã lưu trên Supabase nhưng chưa tải lại được: ${err.message}`);
        }
        return result;
      } finally {
        busyRef.current = false;
        if (active.current) setBusy(false);
      }
    },
    [repository, reload, offline],
  );
  const foods = useMemo(
    () => snapshot.foods.map((food) => decorateFood(food, now)),
    [snapshot.foods, now],
  );
  const reminderFingerprint = snapshot.foods
    .map((f) => `${f.id}:${f.name}:${f.expiresAt}`)
    .join('|');
  useEffect(
    () => () => {
      cancelExpiryReminders().catch(() => {});
    },
    [user.id],
  );
  useEffect(() => {
    if (ready)
      syncReminders(user.id, snapshot.foods, reminderEnabled).catch(() => {
        if (active.current)
          setReminderError('Không cập nhật được lịch nhắc. Kiểm tra quyền thông báo rồi bật lại.');
      });
  }, [user.id, reminderFingerprint, ready, reminderEnabled]);
  const toggleReminder = useCallback(
    async (enabled) => {
      setReminderError('');
      if (enabled && !(await notificationPermission()))
        throw new Error('Cần cấp quyền thông báo trên điện thoại.');
      await setReminders(enabled);
      try {
        await syncReminders(user.id, snapshot.foods, enabled);
      } catch (err) {
        await setReminders(false);
        throw new Error('Không tạo được lịch nhắc trên thiết bị. Vui lòng thử lại.');
      }
    },
    [user.id, snapshot.foods, setReminders],
  );
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reload();
    } catch (err) {
      if (active.current) {
        setError(err.message);
        setOffline(true);
      }
      throw err;
    } finally {
      if (active.current) setRefreshing(false);
    }
  }, [reload]);
  const getActivity = useCallback(() => repository.getActivity(), [repository]);
  const value = useMemo(
    () => ({
      foods,
      ready,
      error,
      shopping: snapshot.shopping,
      busy,
      mutate,
      reload: refresh,
      refreshing,
      offline,
      lastSynced,
      getActivity,
      reminderEnabled,
      toggleReminder,
      reminderError,
    }),
    [
      foods,
      ready,
      error,
      snapshot.shopping,
      busy,
      mutate,
      refresh,
      refreshing,
      offline,
      lastSynced,
      getActivity,
      reminderEnabled,
      toggleReminder,
      reminderError,
    ],
  );
  return <FridgeContext.Provider value={value}>{children}</FridgeContext.Provider>;
}
export function useFridgeViewModel() {
  const context = useContext(FridgeContext);
  if (!context) throw new Error('FridgeProvider is required.');
  return context;
}
