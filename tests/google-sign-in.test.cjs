const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const makeLoader = require('./load-ui.cjs');

function fixture({
  enabled = true,
  callback = 'fridgechef://google-auth?code=one-time',
  expoGo = false,
  cancelled = false,
} = {}) {
  const requests = [];
  const sessions = [];
  const opens = [];
  const load = makeLoader({
    expo: { isRunningInExpoGo: () => expoGo },
    'react-native': { Platform: { OS: 'android' } },
    'expo-crypto': {
      getRandomBytesAsync: async () => new Uint8Array(32).fill(10),
      CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
      CryptoEncoding: { BASE64: 'base64' },
      digestStringAsync: async (_, data) => createHash('sha256').update(data).digest('base64'),
    },
    'expo-web-browser': {
      openAuthSessionAsync: async (url, redirect) => {
        opens.push([new URL(url), redirect]);
        return cancelled ? { type: 'cancel' } : { type: 'success', url: callback };
      },
    },
    'src/services/network': {
      fetchWithTimeout: async (url, options) => {
        requests.push([url, options]);
        return url.endsWith('/settings')
          ? Response.json({ external: { google: enabled } })
          : Response.json({ access_token: 'access', refresh_token: 'refresh' });
      },
    },
    'src/services/supabase': {
      supabaseUrl: 'https://example.supabase.co',
      supabasePublicKey: 'publishable',
      supabase: {
        auth: {
          setSession: async (tokens) => {
            sessions.push(tokens);
            return {};
          },
        },
      },
    },
  });
  return { signIn: load('src/services/googleSignIn').signInWithGoogle, requests, sessions, opens };
}

test('Google OAuth sends S256 challenge and establishes the existing Supabase session', async () => {
  const f = fixture();
  assert.equal(await f.signIn(), true);
  const [[url, redirect]] = f.opens;
  assert.equal(redirect, 'fridgechef://google-auth');
  assert.equal(url.searchParams.get('redirect_to'), redirect);
  assert.equal(url.searchParams.get('code_challenge_method'), 's256');
  const [tokenUrl, request] = f.requests[1];
  assert.match(tokenUrl, /grant_type=pkce$/);
  const { auth_code, code_verifier } = JSON.parse(request.body);
  assert.equal(auth_code, 'one-time');
  assert.equal(
    url.searchParams.get('code_challenge'),
    createHash('sha256').update(code_verifier).digest('base64url'),
  );
  assert.equal(url.toString().includes(code_verifier), false);
  assert.deepEqual(f.sessions, [{ access_token: 'access', refresh_token: 'refresh' }]);
});

test('Google sign-in tells the user when the provider is disabled or Expo Go is active', async () => {
  const disabled = fixture({ enabled: false });
  await assert.rejects(disabled.signIn(), /chưa được bật/);
  assert.equal(disabled.opens.length, 0);
  const expo = fixture({ expoGo: true });
  await assert.rejects(expo.signIn(), /cài riêng/);
  assert.equal(expo.requests.length, 0);
});

test('Google sign-in never exchanges a code from an unexpected callback and handles cancellation', async () => {
  const wrong = fixture({ callback: 'https://example.com/google-auth?code=one-time' });
  await assert.rejects(wrong.signIn(), /không hợp lệ/);
  assert.equal(wrong.requests.length, 1);
  const cancelled = fixture({ cancelled: true });
  assert.equal(await cancelled.signIn(), false);
  assert.equal(cancelled.sessions.length, 0);
});
