const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');
const userA = '11111111-1111-4111-8111-111111111111',
  userB = '22222222-2222-4222-8222-222222222222';
test('PostgreSQL: inventory transactions, RLS, retries and AI quota', async (t) => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}'::jsonb);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('app.user_id',true),'')::uuid$$;grant usage on schema auth to authenticated;insert into auth.users(id) values('${userA}'),('${userB}');`,
    );
    await db.exec(
      "create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,update,delete on storage.objects to authenticated;create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;",
    );
    for (const file of [
      '202611130001_fridgechef.sql',
      '202611160001_complete_workflows.sql',
      '202611170001_cloud_profiles_recipes.sql',
      '20261124124031_food_preferences.sql',
    ])
      await db.exec(fs.readFileSync('supabase/migrations/' + file, 'utf8'));
    await db.exec(fs.readFileSync('supabase/schema/ai_conversations.sql', 'utf8'));
    await t.test(
      'chat history is private and clients cannot forge assistant responses',
      async () => {
        await db.exec(
          `insert into ai_conversations(id,user_id,message,reply) values('aaaaaaaa-0000-4000-8000-000000000001','${userA}','hello','answer');set role authenticated;set app.user_id='${userB}';`,
        );
        assert.equal((await db.query('select * from ai_conversations')).rows.length, 0);
        assert.equal((await db.query('delete from ai_conversations returning id')).rows.length, 0);
        await assert.rejects(
          db.query(
            `insert into ai_conversations(id,user_id,message,reply) values(gen_random_uuid(),$1,'forged','forged')`,
            [userB],
          ),
          /permission denied/,
        );
        await db.exec(`set app.user_id='${userA}';`);
        assert.equal((await db.query('select * from ai_conversations')).rows.length, 1);
        assert.equal((await db.query('delete from ai_conversations returning id')).rows.length, 1);
        await db.exec('reset role');
      },
    );
    await db.exec(`set role authenticated;set app.user_id='${userA}';`);
    const insert = async (name = 'Gạo', quantity = 5, expiresAt = '2099-12-31') =>
      (
        await db.query(
          `insert into public.food_items(name,quantity,unit,"storageAreaId","purchasedAt","expiresAt") values($1,$2,'kg','dry','2026-01-01',$3) returning *`,
          [name, quantity, expiresAt],
        )
      ).rows[0];
    const entry = (f, quantity) => ({ foodId: f.id, quantity, expectedUpdatedAt: f.updatedAt });
    const consume = (entries, id, reason = 'used') =>
      db.query('select public.consume_food($1::jsonb,$2::uuid,$3::text)', [
        JSON.stringify(entries),
        id,
        reason,
      ]);
    await t.test(
      'partial usage records history and same operation cannot deduct twice',
      async () => {
        const f = await insert();
        const id = 'aaaaaaaa-1111-4111-8111-111111111111';
        await consume([entry(f, 2)], id);
        await consume([entry(f, 2)], id);
        assert.equal(
          Number(
            (await db.query('select quantity from food_items where id=$1', [f.id])).rows[0]
              .quantity,
          ),
          3,
        );
        assert.equal((await db.query('select * from food_activity')).rows.length, 1);
      },
    );
    await t.test('batch failure rolls back all deductions and activity', async () => {
      const a = await insert('A'),
        b = await insert('B');
      const before = (await db.query('select * from food_activity')).rows.length;
      await assert.rejects(
        consume([entry(a, 1), entry(b, 99)], 'aaaaaaaa-2222-4222-8222-222222222222'),
      );
      assert.equal(
        Number(
          (await db.query('select quantity from food_items where id=$1', [a.id])).rows[0].quantity,
        ),
        5,
      );
      assert.equal((await db.query('select * from food_activity')).rows.length, before);
    });
    await t.test('stale versions and duplicate lot IDs are rejected', async () => {
      const f = await insert('C');
      await db.query('update food_items set quantity=4 where id=$1', [f.id]);
      await assert.rejects(
        consume([entry(f, 1)], 'aaaaaaaa-3333-4333-8333-333333333333'),
        /cập nhật/,
      );
      const fresh = (await db.query('select * from food_items where id=$1', [f.id])).rows[0];
      await assert.rejects(
        consume([entry(fresh, 1), entry(fresh, 1)], 'aaaaaaaa-4444-4444-8444-444444444444'),
        /lặp/,
      );
    });
    await t.test('expired food cannot be used but can be discarded fully', async () => {
      const f = await insert('Cũ', 2, '2026-01-02');
      await assert.rejects(
        consume([entry(f, 2)], 'aaaaaaaa-5555-4555-8555-555555555555'),
        /quá hạn/,
      );
      await consume([entry(f, 2)], 'aaaaaaaa-6666-4666-8666-666666666666', 'discarded');
      assert.equal((await db.query('select * from food_items where id=$1', [f.id])).rows.length, 0);
    });
    await t.test('recipe shopping batch is atomic and retry-safe', async () => {
      const entries = JSON.stringify([{ name: 'Cà chua', quantity: 2, unit: 'quả' }]);
      const id = 'bbbbbbbb-1111-4111-8111-111111111111';
      await db.query('select add_recipe_shopping($1::jsonb,$2::uuid)', [entries, id]);
      await db.query('select add_recipe_shopping($1::jsonb,$2::uuid)', [entries, id]);
      assert.equal((await db.query('select * from shopping_items')).rows.length, 1);
      await assert.rejects(
        db.query('select add_recipe_shopping($1::jsonb,$2::uuid)', [
          JSON.stringify([
            { name: 'A', quantity: 1, unit: 'g' },
            { name: 'B', quantity: -1, unit: 'g' },
          ]),
          'bbbbbbbb-2222-4222-8222-222222222222',
        ]),
      );
      assert.equal((await db.query('select * from shopping_items')).rows.length, 1);
    });
    await t.test(
      'authenticated callers cannot forge history or read the private ledger',
      async () => {
        await assert.rejects(
          db.exec(
            "insert into food_activity(food_name,quantity,unit,reason) values('fake',1,'g','used')",
          ),
        );
        await assert.rejects(db.exec('select * from inventory_operations'));
      },
    );
    await t.test('AI requests are limited atomically to ten per account per hour', async () => {
      for (let i = 0; i < 10; i++)
        assert.equal((await db.query('select claim_ai_request() as ok')).rows[0].ok, true);
      assert.equal((await db.query('select claim_ai_request() as ok')).rows[0].ok, false);
    });
    await t.test('profiles and avatar directory are scoped to their owner', async () => {
      assert.equal((await db.query('select * from profiles')).rows.length, 1);
      await db.query(
        'update profiles set display_name=$1,reminders_enabled=true where user_id=$2',
        ['Thái', userA],
      );
      assert.equal(
        (await db.query('select display_name from profiles')).rows[0].display_name,
        'Thái',
      );
      await assert.rejects(db.query('update profiles set avatar_path=$1', [userB + '/fake.jpg']));
      await db.query('insert into storage.objects(bucket_id,name) values($1,$2)', [
        'avatars',
        userA + '/photo.jpg',
      ]);
      await assert.rejects(
        db.query('insert into storage.objects(bucket_id,name) values($1,$2)', [
          'avatars',
          userB + '/photo.jpg',
        ]),
      );
      await db.exec(`set app.user_id='${userB}';`);
      assert.equal((await db.query('select * from storage.objects')).rows.length, 0);
      assert.equal((await db.query('select * from profiles')).rows[0].display_name, '');
      await db.exec(`set app.user_id='${userA}';`);
    });
    await t.test(
      'food preferences default empty and only the profile owner can read and update them',
      async () => {
        const fields = 'food_likes,food_limits,food_dislikes';
        const initial = (await db.query('select ' + fields + ' from profiles')).rows[0];
        assert.deepEqual(initial, { food_likes: '', food_limits: '', food_dislikes: '' });
        await db.query(
          "update profiles set food_likes='Thích cay',food_limits='Giảm ngọt',food_dislikes='Cá'",
        );
        assert.equal(
          (await db.query('select food_likes from profiles')).rows[0].food_likes,
          'Thích cay',
        );
        await assert.rejects(
          db.query("update profiles set food_likes=repeat('x', 501)"),
          /check constraint/,
        );
        await db.exec("set app.user_id='" + userB + "';");
        assert.equal(
          (await db.query('select food_likes from profiles where user_id=$1', [userA])).rows.length,
          0,
        );
        assert.equal(
          (
            await db.query(
              "update profiles set food_likes='fake' where user_id=$1 returning user_id",
              [userA],
            )
          ).rows.length,
          0,
        );
        await db.exec("set app.user_id='" + userA + "';");
        assert.equal(
          (await db.query('select food_likes from profiles')).rows[0].food_likes,
          'Thích cay',
        );
      },
    );
    await t.test(
      'catalog is server-managed and favorites remain private across accounts',
      async () => {
        await assert.rejects(
          db.query(
            "insert into recipe_catalog(id,source_id,source_url,recipe,source_payload) values('themealdb-52772','52772','https://www.themealdb.com/meal/52772','{}','{}')",
          ),
        );
        await db.exec('reset role');
        await db.query(
          "insert into recipe_catalog(id,source_id,source_url,recipe,source_payload) values('themealdb-52772','52772','https://www.themealdb.com/meal/52772','{}','{}')",
        );
        await db.exec(`set role authenticated;set app.user_id='${userA}';`);
        await db.query("insert into recipe_favorites(recipe_id) values('themealdb-52772')");
        assert.equal((await db.query('select * from recipe_favorites')).rows.length, 1);
        await assert.rejects(
          db.query(
            "insert into recipe_suggestions(user_id,recipe_id,recipe,reason) values($1,'themealdb-52772','{}','fake')",
            [userA],
          ),
        );
        await db.exec(`set app.user_id='${userB}';`);
        assert.equal((await db.query('select * from recipe_catalog')).rows.length, 1);
        assert.equal((await db.query('select * from recipe_favorites')).rows.length, 0);
        await assert.rejects(
          db.query("insert into recipe_favorites(user_id,recipe_id) values($1,'themealdb-52772')", [
            userA,
          ]),
        );
        await db.exec(`set app.user_id='${userA}';`);
      },
    );
    await t.test('another account cannot read or consume the first account data', async () => {
      const f = await insert('Riêng');
      await db.exec(`set app.user_id='${userB}';`);
      assert.equal((await db.query('select * from food_items')).rows.length, 0);
      assert.equal((await db.query('select * from food_activity')).rows.length, 0);
      await assert.rejects(
        consume([entry(f, 1)], 'cccccccc-1111-4111-8111-111111111111'),
        /thay đổi/,
      );
      assert.equal((await db.query('select claim_ai_request() as ok')).rows[0].ok, true);
      await assert.rejects(
        db.query(
          `insert into food_items(user_id,name,quantity,unit,"storageAreaId","purchasedAt","expiresAt") values($1,'fake',1,'g','dry','2026-01-01','2099-01-01')`,
          [userA],
        ),
      );
    });
  } finally {
    await db.close();
  }
});
