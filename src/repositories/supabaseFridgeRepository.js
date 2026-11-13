import { validateFood, validateShopping, formatDate, todayISO } from '../models/food.js';

const fail = error => {
  if (!error) return;
  if (['42501', 'PGRST205', 'PGRST202', '42P01'].includes(error.code)) {
    throw new Error('Chưa cấu hình đủ database hoặc quyền truy cập Supabase. Kiểm tra migration SQL và RLS.');
  }
  throw new Error(error.message || 'Không kết nối được Supabase. Kiểm tra mạng và tải lại trước khi thử lưu lại.');
};
const foodFields = 'id,name,quantity,unit,storageAreaId,purchasedAt,expiresAt,category,notes,createdAt,updatedAt';
const shoppingFields = 'id,name,quantity,unit,bought,createdAt,updatedAt';

export function createSupabaseFridgeRepository(client, userId) {
  if (!userId) throw new Error('Bạn cần đăng nhập.');
  let queue = Promise.resolve();
  const write = action => {
    const pending = queue.then(action);
    queue = pending.catch(() => {});
    return pending;
  };
  const scoped = table => client.from(table).select(table === 'food_items' ? foodFields : shoppingFields).eq('user_id', userId);
  const readAll = async table => {
    const rows = [];
    for (let start = 0; ; start += 1000) {
      const { data, error } = await scoped(table).order('id').range(start, start + 999);
      fail(error); rows.push(...data);
      if (data.length < 1000) return rows;
    }
  };
  const change = async (table, id, values, remove = false) => {
    let query = remove ? client.from(table).delete() : client.from(table).update(values);
    const { data, error } = await query.eq('id', id).eq('user_id', userId).select('id');
    fail(error);
    if (!data.length) throw new Error('Mục này không còn tồn tại. Hãy tải lại danh sách.');
    return data[0].id;
  };
  const insert = async (table, values) => {
    const { data, error } = await client.from(table).insert({ ...values, user_id: userId }).select('id').single();
    fail(error); return data.id;
  };
  return {
    async getSnapshot() {
      await queue;
      const [foods, shopping] = await Promise.all([readAll('food_items'), readAll('shopping_items')]);
      foods.sort((a, b) => a.expiresAt.localeCompare(b.expiresAt) || b.createdAt.localeCompare(a.createdAt));
      shopping.sort((a, b) => Number(a.bought) - Number(b.bought) || b.createdAt.localeCompare(a.createdAt));
      return { foods, shopping };
    },
    saveFood: (input, id) => write(() => {
      const data = validateFood(input);
      return id != null ? change('food_items', id, data) : insert('food_items', data);
    }),
    deleteFood: id => write(() => change('food_items', id, null, true)),
    saveShopping: (input, id) => write(() => {
      const data = validateShopping(input);
      return id != null ? change('shopping_items', id, data) : insert('shopping_items', data);
    }),
    setBought: (id, bought) => write(() => change('shopping_items', id, { bought: Boolean(bought) })),
    deleteShopping: id => write(() => change('shopping_items', id, null, true)),
    addDemoFoods: () => write(async () => {
      const dateAt = offset => { const date = new Date(); date.setDate(date.getDate() + offset); return formatDate(todayISO(date)); };
      const rows = [['Cà chua',3,'quả','cool',1],['Sữa tươi',1,'hộp','cool',-1],['Thịt gà',500,'g','frozen',10],['Gạo',2,'kg','dry',30]]
        .map(([name,quantity,unit,storageAreaId,offset]) => ({ ...validateFood({ name,quantity,unit,storageAreaId,buyDate:dateAt(-2),expDate:dateAt(offset) }), user_id: userId }));
      const { error } = await client.from('food_items').insert(rows); fail(error);
    }),
    moveBoughtToFridge: ({ entries }) => write(async () => {
      if (!Array.isArray(entries) || !entries.length) throw new Error('Chọn ít nhất một món đã mua.');
      const ids = new Set();
      const rows = entries.map(entry => {
        if (ids.has(entry.shoppingId)) throw new Error('Danh sách chuyển có món bị lặp.');
        ids.add(entry.shoppingId);
        const data = validateFood(entry);
        return { shoppingId: entry.shoppingId, ...data };
      });
      // This PostgreSQL function locks the rows and moves all items atomically.
      const { data, error } = await client.rpc('move_bought_to_fridge', { entries: rows });
      fail(error); return data;
    }),
    importLegacy: snapshot => write(async () => {
      const foods = snapshot.foods.map(row => ({ legacyId: String(row.id), ...validateFood({ ...row,
        buyDate: formatDate(row.purchasedAt), expDate: formatDate(row.expiresAt) }) }));
      const shopping = snapshot.shopping.map(row => ({ legacyId: String(row.id), ...validateShopping(row), bought: Boolean(row.bought) }));
      if (foods.length + shopping.length > 1000) throw new Error('Dữ liệu cũ vượt 1.000 món. Cần chia đợt nhập.');
      const { data, error } = await client.rpc('import_legacy_fridge', { source_id: snapshot.sourceId, foods, shopping });
      fail(error); return data;
    }),
  };
}
