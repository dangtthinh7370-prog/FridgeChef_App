export const DATABASE_NAME = 'fridgechef.db';

export const SCHEMA_V1 = `
CREATE TABLE storage_areas (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE
);
CREATE TABLE food_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 100),
  quantity REAL NOT NULL CHECK(quantity > 0 AND quantity <= 1000000),
  unit TEXT NOT NULL CHECK(length(trim(unit)) BETWEEN 1 AND 20),
  storageAreaId TEXT NOT NULL REFERENCES storage_areas(id) ON DELETE RESTRICT,
  purchasedAt TEXT NOT NULL,
  expiresAt TEXT NOT NULL CHECK(expiresAt >= purchasedAt),
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE shopping_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 100),
  quantity REAL NOT NULL CHECK(quantity > 0 AND quantity <= 1000000),
  unit TEXT NOT NULL CHECK(length(trim(unit)) BETWEEN 1 AND 20),
  bought INTEGER NOT NULL DEFAULT 0 CHECK(bought IN (0,1)),
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_food_area ON food_items(storageAreaId);
CREATE INDEX idx_food_expiry ON food_items(expiresAt);
INSERT INTO storage_areas(id,name) VALUES ('cool','Ngăn mát'),('frozen','Ngăn đông'),('dry','Đồ khô');
PRAGMA user_version = 1;
`;

export const SCHEMA_V2 = `
ALTER TABLE food_items ADD COLUMN category TEXT NOT NULL DEFAULT 'other'
  CHECK(category IN ('vegetables','fruit','protein','dairy','pantry','other'));
ALTER TABLE food_items ADD COLUMN notes TEXT NOT NULL DEFAULT '' CHECK(length(notes) <= 500);
PRAGMA user_version = 2;
`;

export async function initializeDatabase(db) {
  await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  const { user_version: version } = await db.getFirstAsync('PRAGMA user_version');
  if (version > 2) throw new Error('Cơ sở dữ liệu mới hơn ứng dụng. Vui lòng cập nhật ứng dụng.');
  if (version === 0) {
    await db.withTransactionAsync(async () => { await db.execAsync(SCHEMA_V1); });
  }
  if (version < 2) {
    await db.withTransactionAsync(async () => { await db.execAsync(SCHEMA_V2); });
  }
}
