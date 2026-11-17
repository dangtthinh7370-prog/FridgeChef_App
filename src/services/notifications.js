import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
let queue = Promise.resolve();
const serial = (action) => {
  const result = queue.then(action);
  queue = result.catch(() => {});
  return result;
};
export async function notificationPermission() {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android')
    await Notifications.setNotificationChannelAsync('fridgechef', {
      name: 'Nhắc việc nhà bếp',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) permission = await Notifications.requestPermissionsAsync();
  return permission.granted;
}
async function clearExpiry() {
  if (Platform.OS === 'web') return;
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    pending
      .filter((n) => n.content.data?.kind === 'expiry')
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}
export const cancelExpiryReminders = () => serial(clearExpiry);
export const syncReminders = (userId, foods, enabled = false) =>
  serial(async () => {
    if (Platform.OS === 'web') return;
    await clearExpiry();
    if (!enabled) return;
    const { granted } = await Notifications.getPermissionsAsync();
    if (!granted) throw new Error('Chưa cấp quyền thông báo trên thiết bị này.');
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Hôm nay tủ lạnh có gì?',
        body: 'Kiểm tra hạn dùng và lên món ăn để tránh lãng phí.',
        data: { kind: 'expiry' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 7,
        minute: 0,
        channelId: 'fridgechef',
      },
    });
    const groups = new Map();
    for (const food of foods) {
      const [y, m, d] = food.expiresAt.split('-').map(Number);
      const date = new Date(y, m - 1, d, 7, 0, 0);
      date.setDate(date.getDate() - 1);
      if (date.getTime() <= Date.now()) continue;
      const stamp = date.getTime();
      groups.set(stamp, [...(groups.get(stamp) || []), food.name]);
    }
    // iOS allows only a limited number of scheduled notifications. Keep room for timers.
    for (const [stamp, names] of [...groups].sort((a, b) => a[0] - b[0]).slice(0, 30)) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${names.length} thực phẩm gần hết hạn`,
          body: names.slice(0, 3).join(', ') + '. Kiểm tra tủ lạnh trước khi nấu.',
          data: { kind: 'expiry' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(stamp),
          channelId: 'fridgechef',
        },
      });
    }
  });
export async function scheduleTimer(seconds, title, deadline = Date.now() + seconds * 1000) {
  if (!(await notificationPermission())) return null;
  const remaining = Math.ceil((deadline - Date.now()) / 1000);
  if (remaining <= 0) return null;
  return Notifications.scheduleNotificationAsync({
    content: { title: 'Hết giờ nấu', body: title, sound: 'default', data: { kind: 'timer' } },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: remaining,
      repeats: false,
      channelId: 'fridgechef',
    },
  });
}
export const cancelTimer = (id) =>
  Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
