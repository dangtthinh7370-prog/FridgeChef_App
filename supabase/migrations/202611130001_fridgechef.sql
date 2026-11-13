-- Run once in Supabase SQL Editor on the new FridgeChef project.
-- App fields retain their camelCase names to preserve the existing UI contract.
begin;

create table public.storage_areas (
  id text primary key check (id in ('cool','frozen','dry')),
  name text not null unique
);
insert into public.storage_areas values ('cool','Ngăn mát'),('frozen','Ngăn đông'),('dry','Đồ khô');

create table public.food_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 100),
  quantity numeric not null check (quantity > 0 and quantity <= 1000000),
  unit text not null check (length(btrim(unit)) between 1 and 20),
  "storageAreaId" text not null references public.storage_areas(id) on delete restrict,
  "purchasedAt" date not null check ("purchasedAt" between date '1900-01-01' and date '9999-12-31'),
  "expiresAt" date not null check ("expiresAt" >= "purchasedAt" and "expiresAt" <= date '9999-12-31'),
  category text not null default 'other' check (category in ('vegetables','fruit','protein','dairy','pantry','other')),
  notes text not null default '' check (length(notes) <= 500),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  legacy_key text,
  unique (user_id, legacy_key)
);
create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 100),
  quantity numeric not null check (quantity > 0 and quantity <= 1000000),
  unit text not null check (length(btrim(unit)) between 1 and 20),
  bought boolean not null default false,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  legacy_key text,
  unique (user_id, legacy_key)
);
create table public.legacy_imports (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source_id text not null check (length(source_id) between 1 and 128),
  imported_at timestamptz not null default now(),
  primary key (user_id, source_id)
);
create index food_user_expiry on public.food_items(user_id,"expiresAt");
create index food_user_area on public.food_items(user_id,"storageAreaId");
create index shopping_user_bought on public.shopping_items(user_id,bought);

alter table public.storage_areas enable row level security;
alter table public.food_items enable row level security;
alter table public.shopping_items enable row level security;
alter table public.legacy_imports enable row level security;

revoke all on public.storage_areas, public.food_items, public.shopping_items, public.legacy_imports from anon, authenticated;
grant usage on schema public to authenticated;
grant select on public.storage_areas to authenticated;
grant select, insert, update, delete on public.food_items, public.shopping_items to authenticated;
grant select, insert on public.legacy_imports to authenticated;
create policy areas_read on public.storage_areas for select to authenticated using (true);
create policy foods_owner on public.food_items for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy shopping_owner on public.shopping_items for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy imports_read on public.legacy_imports for select to authenticated using ((select auth.uid()) = user_id);
create policy imports_add on public.legacy_imports for insert to authenticated with check ((select auth.uid()) = user_id);

create function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin
  new."updatedAt" := now();
  return new;
end;
$$;
create trigger food_updated before update on public.food_items for each row execute function public.set_updated_at();
create trigger shopping_updated before update on public.shopping_items for each row execute function public.set_updated_at();

create function public.move_bought_to_fridge(entries jsonb)
returns integer language plpgsql security invoker set search_path = '' as $$
declare
  entry jsonb;
  item public.shopping_items%rowtype;
  total integer;
  locked integer;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
  if entries is null or jsonb_typeof(entries) <> 'array' then raise exception 'Danh sách không hợp lệ.'; end if;
  total := jsonb_array_length(entries);
  if total < 1 or total > 1000 then raise exception 'Chọn từ 1 đến 1.000 món.'; end if;
  if exists(select 1 from jsonb_array_elements(entries) e where e->>'shoppingId' is null)
    or (select count(distinct e->>'shoppingId') from jsonb_array_elements(entries) e) <> total
  then raise exception 'Danh sách chuyển bị thiếu mã hoặc lặp món.'; end if;
  -- Stable lock order prevents duplicate concurrent transfers and avoids deadlocks.
  perform s.id from public.shopping_items s
    where s.user_id = auth.uid() and s.bought = true
      and s.id in (select (e->>'shoppingId')::uuid from jsonb_array_elements(entries) e)
    order by s.id for update;
  get diagnostics locked = row_count;
  if locked <> total then raise exception 'Có món đã được cất, bị xóa hoặc chưa đánh dấu đã mua. Hãy tải lại.'; end if;
  for entry in select value from jsonb_array_elements(entries) loop
    select * into strict item from public.shopping_items where id = (entry->>'shoppingId')::uuid and user_id = auth.uid() and bought = true;
    insert into public.food_items(user_id,name,quantity,unit,"storageAreaId","purchasedAt","expiresAt",category,notes)
    values (auth.uid(),item.name,(entry->>'quantity')::numeric,entry->>'unit',entry->>'storageAreaId',
      (entry->>'purchasedAt')::date,(entry->>'expiresAt')::date,coalesce(entry->>'category','other'),coalesce(entry->>'notes',''));
    delete from public.shopping_items where id = item.id and user_id = auth.uid();
  end loop;
  return total;
end;
$$;

create function public.import_legacy_fridge(source_id text, foods jsonb, shopping jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  inserted integer;
  food_count integer;
  shopping_count integer;
  entry jsonb;
begin
  if auth.uid() is null then raise exception 'Bạn cần đăng nhập.'; end if;
  if source_id is null or length(source_id) not between 1 and 128 then raise exception 'Mã nguồn nhập không hợp lệ.'; end if;
  if foods is null or shopping is null or jsonb_typeof(foods) <> 'array' or jsonb_typeof(shopping) <> 'array'
  then raise exception 'Dữ liệu nhập không hợp lệ.'; end if;
  if jsonb_array_length(foods) + jsonb_array_length(shopping) > 1000 then raise exception 'Chỉ nhập tối đa 1.000 món mỗi nguồn.'; end if;
  insert into public.legacy_imports(user_id,source_id) values(auth.uid(),source_id) on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return jsonb_build_object('alreadyImported',true,'foods',0,'shopping',0); end if;
  food_count := 0; shopping_count := 0;
  for entry in select value from jsonb_array_elements(foods) loop
    if coalesce(entry->>'legacyId','') = '' then raise exception 'Thiếu mã thực phẩm cũ.'; end if;
    insert into public.food_items(user_id,name,quantity,unit,"storageAreaId","purchasedAt","expiresAt",category,notes,legacy_key)
    values(auth.uid(),entry->>'name',(entry->>'quantity')::numeric,entry->>'unit',entry->>'storageAreaId',
      (entry->>'purchasedAt')::date,(entry->>'expiresAt')::date,coalesce(entry->>'category','other'),coalesce(entry->>'notes',''),source_id || ':food:' || (entry->>'legacyId'));
    food_count := food_count + 1;
  end loop;
  for entry in select value from jsonb_array_elements(shopping) loop
    if coalesce(entry->>'legacyId','') = '' then raise exception 'Thiếu mã món đi chợ cũ.'; end if;
    insert into public.shopping_items(user_id,name,quantity,unit,bought,legacy_key)
    values(auth.uid(),entry->>'name',(entry->>'quantity')::numeric,entry->>'unit',coalesce((entry->>'bought')::boolean,false),source_id || ':shopping:' || (entry->>'legacyId'));
    shopping_count := shopping_count + 1;
  end loop;
  return jsonb_build_object('alreadyImported',false,'foods',food_count,'shopping',shopping_count);
end;
$$;
revoke all on function public.move_bought_to_fridge(jsonb), public.import_legacy_fridge(text,jsonb,jsonb), public.set_updated_at() from public, anon;
grant execute on function public.move_bought_to_fridge(jsonb), public.import_legacy_fridge(text,jsonb,jsonb) to authenticated;
commit;
