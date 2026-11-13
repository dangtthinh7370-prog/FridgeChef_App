import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import Storage from 'expo-sqlite/kv-store';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
export const supabaseConfigured = /^https:\/\/[^/]+\.supabase\.co\/?$/.test(url)
  && key.startsWith('sb_publishable_') && !key.includes('PASTE_');
// The public key is bundled in the app. RLS, not this key, isolates user data.
export const supabase = supabaseConfigured ? createClient(url, key, {
  auth: {
    storage: Storage,
    storageKey: 'fridgechef-supabase-session',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
}) : null;
