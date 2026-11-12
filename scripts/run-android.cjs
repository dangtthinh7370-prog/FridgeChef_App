const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const candidates = [
  process.env.ANDROID_HOME,
  process.env.ANDROID_SDK_ROOT,
  process.env.USERPROFILE && path.join(process.env.USERPROFILE, 'AppData', 'Local', 'Android', 'Sdk'),
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk'),
].filter(Boolean);
const sdk = candidates.find(candidate => fs.existsSync(path.join(candidate, 'platform-tools', 'adb.exe')));
const cli = path.join(root, 'node_modules', 'expo', 'bin', 'cli');

if (!fs.existsSync(cli)) {
  console.error('Dependencies are missing. Run npm install in the project terminal first.');
  process.exit(1);
}
if (!sdk) {
  console.error('Android SDK was not found. Set ANDROID_HOME to the Android SDK Location shown in Android Studio > Settings > Android SDK.');
  process.exit(1);
}
const env = { ...process.env, ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk };
env.PATH = [path.join(sdk, 'platform-tools'), path.join(sdk, 'emulator'), process.env.PATH || ''].join(path.delimiter);
if (process.argv.includes('--check')) {
  console.log('Ready: Node.js, Expo CLI and Android SDK found.');
  console.log('Project: ' + root);
  console.log('Android SDK: ' + sdk);
  process.exit(0);
}

console.log('Starting FridgeChef on Android...');
console.log('Keep the Run session open while using the app.');
console.log('If port 8081 is already in use, stop the previous Expo terminal/session first.');
// Expo Go is already installed for SDK 52 on this emulator. Offline CLI mode
// avoids an interactive upgrade/reinstall prompt in the IDE Run console.
// It only affects Expo CLI network checks, not network requests made by the app.
const child = spawn(process.execPath, [cli, 'start', '--android', '--offline'], {
  cwd: root, env, stdio: 'inherit', windowsHide: true,
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
// The IDE's Stop action must not leave a detached Expo server behind.
process.on('SIGINT', () => { child.kill('SIGINT'); });
process.on('SIGTERM', () => { child.kill('SIGTERM'); });
