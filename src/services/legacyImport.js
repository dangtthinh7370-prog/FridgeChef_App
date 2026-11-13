import { openDatabaseAsync } from 'expo-sqlite';
import Storage from 'expo-sqlite/kv-store';
import { DATABASE_NAME, initializeDatabase } from '../database/schema';

const metadataKey = 'fridgechef-legacy-import-v1';
export async function readLegacySnapshot(userId, claim = false) {
  const db = await openDatabaseAsync(DATABASE_NAME);
  try {
    await initializeDatabase(db);
    const foods = await db.getAllAsync('SELECT * FROM food_items ORDER BY id');
    const shopping = await db.getAllAsync('SELECT * FROM shopping_items ORDER BY id');
    const saved = await Storage.getItem(metadataKey);
    let meta = saved ? JSON.parse(saved) : null;
    if (meta?.userId && meta.userId !== userId) throw new Error('Dữ liệu cũ trên thiết bị đã được gắn với tài khoản khác.');
    if (!meta) meta = { sourceId: `sqlite-${Date.now()}-${Math.random().toString(36).slice(2)}` };
    // Persist the source identifier and account before uploading; never delete old rows.
    if (claim) { meta.userId = userId; await Storage.setItem(metadataKey, JSON.stringify(meta)); }
    return { foods, shopping: shopping.map(row => ({ ...row, bought: Boolean(row.bought) })), sourceId: meta.sourceId };
  } finally { await db.closeAsync(); }
}
