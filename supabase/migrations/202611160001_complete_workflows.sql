begin;

create table public.food_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  food_name text not null,
  quantity numeric not null check (quantity > 0),
  unit text not null,
  reason text not null check (reason in ('used','discarded','cooked')),
  recipe_title text,
  created_at timestamptz not null default now()
);
create index activity_user_date on public.food_activity(user_id,created_at desc);
alter table public.food_activity enable row level security;
revoke all on public.food_activity from anon, authenticated;
grant select on public.food_activity to authenticated;
create policy activity_owner_read on public.food_activity for select to authenticated using ((select auth.uid()) = user_id);

create table public.inventory_operations (
  user_id uuid not null references auth.users(id) on delete cascade,
  operation_id uuid not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key(user_id, operation_id)
);
alter table public.inventory_operations enable row level security;
revoke all on public.inventory_operations from anon, authenticated;

-- SECURITY DEFINER is needed only for the private idempotency ledger and history.
-- Every inventory access below is explicitly scoped to auth.uid().
create function public.consume_food(entries jsonb, operation_id uuid, reason text default 'used', recipe_title text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  entry jsonb;
  item public.food_items%rowtype;
  amount numeric;
  previous jsonb;
  total integer;
begin
  if uid is null then raise exception 'Bạn cần đăng nhập.'; end if;
  if operation_id is null then raise exception 'Thiếu mã thao tác.'; end if;
  -- Serialize retries of the same operation, including concurrent requests.
  perform pg_advisory_xact_lock(hashtextextended(uid::text || operation_id::text, 0));
  select o.result into previous from public.inventory_operations o where o.user_id = uid and o.operation_id = consume_food.operation_id;
  if found then return previous; end if;
  if reason not in ('used','discarded','cooked') or reason is null then raise exception 'Lý do không hợp lệ.'; end if;
  if recipe_title is not null and length(recipe_title) > 120 then raise exception 'Tên công thức quá dài.'; end if;
  if entries is null or jsonb_typeof(entries) <> 'array' then raise exception 'Danh sách không hợp lệ.'; end if;
  total := jsonb_array_length(entries);
  if total < 1 or total > 100 then raise exception 'Chọn từ 1 đến 100 thực phẩm.'; end if;
  if (select count(distinct e->>'foodId') from jsonb_array_elements(entries) e) <> total then raise exception 'Thực phẩm bị lặp hoặc thiếu mã.'; end if;
  perform f.id from public.food_items f where f.user_id = uid and f.id in (select (e->>'foodId')::uuid from jsonb_array_elements(entries) e) order by f.id for update;
  for entry in select value from jsonb_array_elements(entries) loop
    select * into item from public.food_items f where f.id = (entry->>'foodId')::uuid and f.user_id = uid;
    if not found then raise exception 'Thực phẩm đã thay đổi. Tải lại tủ lạnh rồi kiểm tra lại.'; end if;
    if entry->>'expectedUpdatedAt' is null or item."updatedAt" <> (entry->>'expectedUpdatedAt')::timestamptz then raise exception 'Thực phẩm đã được cập nhật trên thiết bị khác. Tải lại và xác nhận lượng dùng.'; end if;
    amount := (entry->>'quantity')::numeric;
    if amount is null or amount = 'NaN'::numeric or amount <= 0 or amount > item.quantity then raise exception 'Lượng dùng vượt quá lượng còn lại.'; end if;
    if reason <> 'discarded' and item."expiresAt" < (now() at time zone 'Asia/Ho_Chi_Minh')::date then raise exception 'Không dùng thực phẩm đã quá hạn.'; end if;
    insert into public.food_activity(user_id,food_name,quantity,unit,reason,recipe_title) values(uid,item.name,amount,item.unit,reason,recipe_title);
    if amount = item.quantity then delete from public.food_items where id = item.id and user_id = uid;
    else update public.food_items set quantity = quantity - amount where id = item.id and user_id = uid; end if;
  end loop;
  previous := jsonb_build_object('count', total);
  insert into public.inventory_operations(user_id,operation_id,result) values(uid,operation_id,previous);
  return previous;
end;
$$;

-- Atomic batch insert and retry protection for missing recipe ingredients.
create function public.add_recipe_shopping(entries jsonb, operation_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); previous jsonb; entry jsonb; total integer;
begin
  if uid is null or operation_id is null then raise exception 'Bạn cần đăng nhập và có mã thao tác.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text || operation_id::text, 0));
  select o.result into previous from public.inventory_operations o where o.user_id=uid and o.operation_id=add_recipe_shopping.operation_id;
  if found then return (previous->>'count')::integer; end if;
  if entries is null or jsonb_typeof(entries)<>'array' then raise exception 'Danh sách không hợp lệ.'; end if;
  total := jsonb_array_length(entries);
  if total<1 or total>30 then raise exception 'Danh sách cần từ 1 đến 30 nguyên liệu.'; end if;
  for entry in select value from jsonb_array_elements(entries) loop
    insert into public.shopping_items(user_id,name,quantity,unit) values(uid,entry->>'name',(entry->>'quantity')::numeric,entry->>'unit');
  end loop;
  insert into public.inventory_operations(user_id,operation_id,result) values(uid,operation_id,jsonb_build_object('count',total));
  return total;
end;
$$;

create table public.ai_rate_limits (
 user_id uuid not null references auth.users(id) on delete cascade,
 window_start timestamptz not null,
 requests integer not null default 1,
 primary key(user_id,window_start)
);
alter table public.ai_rate_limits enable row level security;
revoke all on public.ai_rate_limits from anon, authenticated;
create function public.claim_ai_request() returns boolean language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); bucket timestamptz:=date_trunc('hour',now()); n integer;
begin
 if uid is null then return false; end if;
 insert into public.ai_rate_limits(user_id,window_start) values(uid,bucket)
 on conflict(user_id,window_start) do update set requests=public.ai_rate_limits.requests+1 where public.ai_rate_limits.requests<10
 returning requests into n;
 return n is not null;
end;
$$;
revoke all on function public.consume_food(jsonb,uuid,text,text), public.add_recipe_shopping(jsonb,uuid), public.claim_ai_request() from public,anon;
grant execute on function public.consume_food(jsonb,uuid,text,text), public.add_recipe_shopping(jsonb,uuid), public.claim_ai_request() to authenticated;

-- Multi-device updates (RLS still applies). DELETE payloads are used only to reload.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='food_items') then alter publication supabase_realtime add table public.food_items; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='shopping_items') then alter publication supabase_realtime add table public.shopping_items; end if;
 end if;
end $$;
commit;
