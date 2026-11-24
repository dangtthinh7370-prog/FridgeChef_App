import { isRunningInExpoGo } from 'expo';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { fetchWithTimeout } from './network';
import { supabase, supabasePublicKey, supabaseUrl } from './supabase';

const redirectTo = 'fridgechef://google-auth';

export async function signInWithGoogle() {
  if (Platform.OS === 'web' || isRunningInExpoGo())
    throw new Error('Để đăng nhập Google, hãy mở bản Android hoặc iOS cài riêng của FridgeChef.');

  const bytes = await Crypto.getRandomBytesAsync(32);
  const verifier = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  const challenge = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, {
    encoding: Crypto.CryptoEncoding.BASE64,
  });
  const params = new URLSearchParams({
    provider: 'google',
    redirect_to: redirectTo,
    code_challenge: challenge.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
    code_challenge_method: 's256',
    prompt: 'select_account',
  });
  const headers = { apikey: supabasePublicKey, 'Content-Type': 'application/json' };
  const configuration = await fetchWithTimeout(supabaseUrl + '/auth/v1/settings', { headers });
  const settings = await configuration.json().catch(() => ({}));
  if (!configuration.ok) throw new Error('Chưa kết nối được dịch vụ đăng nhập Google.');
  if (settings.external?.google === false)
    throw new Error('Đăng nhập Google chưa được bật trên Supabase.');

  const authorizationUrl = supabaseUrl + '/auth/v1/authorize?' + params.toString();
  const result = await WebBrowser.openAuthSessionAsync(authorizationUrl, redirectTo);
  if (result.type !== 'success') return false;

  const callback = new URL(result.url);
  if (
    callback.protocol !== 'fridgechef:' ||
    callback.hostname !== 'google-auth' ||
    (callback.pathname && callback.pathname !== '/') ||
    callback.port ||
    callback.username ||
    callback.password
  )
    throw new Error('Liên kết quay lại ứng dụng không hợp lệ.');
  if (callback.searchParams.get('error') === 'access_denied') return false;
  const code = callback.searchParams.get('code');
  if (!code) throw new Error('Google chưa xác nhận đăng nhập. Vui lòng thử lại.');

  const exchanged = await fetchWithTimeout(supabaseUrl + '/auth/v1/token?grant_type=pkce', {
    method: 'POST',
    headers,
    body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
  });
  const tokens = await exchanged.json().catch(() => ({}));
  if (!exchanged.ok || !tokens.access_token || !tokens.refresh_token)
    throw new Error('Không tạo được phiên đăng nhập Google. Vui lòng thử lại.');
  const { error } = await supabase.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });
  if (error) throw error;
  return true;
}
