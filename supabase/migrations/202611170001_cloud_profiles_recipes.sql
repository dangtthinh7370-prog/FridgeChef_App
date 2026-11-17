begin;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check(length(btrim(display_name)) <= 100),
  phone text not null default '' check(length(phone) <= 25),
  bio text not null default '' check(length(bio) <= 500),
  date_of_birth date check(date_of_birth between date '1900-01-01' and current_date),
  avatar_path text check(avatar_path is null or (length(avatar_path) <= 200 and avatar_path like user_id::text || '/%')),
  reminders_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select, update on public.profiles to authenticated;
create policy profiles_owner on public.profiles for all to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
insert into public.profiles(user_id,display_name)
select id,left(coalesce(raw_user_meta_data->>'display_name',''),100) from auth.users on conflict do nothing;
create function public.create_user_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(user_id,display_name) values(new.id,left(coalesce(new.raw_user_meta_data->>'display_name',''),100)) on conflict do nothing;
 return new;
end $$;
create trigger create_fridgechef_profile after insert on auth.users for each row execute function public.create_user_profile();
create function public.touch_profile() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end $$;
create trigger profile_updated before update on public.profiles for each row execute function public.touch_profile();
revoke all on function public.create_user_profile(),public.touch_profile() from public,anon,authenticated;

create table public.recipe_catalog (
 id text primary key check(id ~ '^themealdb-[0-9]{1,12}$'),
 provider text not null default 'TheMealDB' check(provider='TheMealDB'),
 source_id text not null unique check(source_id ~ '^[0-9]{1,12}$'),
 source_url text not null check(source_url='https://www.themealdb.com/meal/'||source_id),
 recipe jsonb not null check(jsonb_typeof(recipe)='object'),
 source_payload jsonb not null check(jsonb_typeof(source_payload)='object'),
 fetched_at timestamptz not null default now()
);
alter table public.recipe_catalog enable row level security;
revoke all on public.recipe_catalog from anon,authenticated;
grant select on public.recipe_catalog to authenticated;
create policy recipes_read on public.recipe_catalog for select to authenticated using(true);

create table public.recipe_suggestions (
 user_id uuid not null references auth.users(id) on delete cascade,
 recipe_id text not null references public.recipe_catalog(id) on delete cascade,
 recipe jsonb not null check(jsonb_typeof(recipe)='object'),
 reason text not null check(length(reason)<=1000),
 suggested_at timestamptz not null default now(),
 primary key(user_id,recipe_id)
);
alter table public.recipe_suggestions enable row level security;
revoke all on public.recipe_suggestions from anon,authenticated;
grant select on public.recipe_suggestions to authenticated;
create policy suggestions_owner on public.recipe_suggestions for select to authenticated using((select auth.uid())=user_id);
create table public.recipe_favorites (
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 recipe_id text not null references public.recipe_catalog(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(user_id,recipe_id)
);
alter table public.recipe_favorites enable row level security;
revoke all on public.recipe_favorites from anon,authenticated;
grant select,insert,delete on public.recipe_favorites to authenticated;
create policy favorites_owner on public.recipe_favorites for all to authenticated
using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
grant all on public.recipe_catalog,public.recipe_suggestions to service_role;

create index if not exists food_storage_area_idx on public.food_items("storageAreaId");
create index if not exists favorites_recipe_idx on public.recipe_favorites(recipe_id);
create index if not exists suggestions_recipe_idx on public.recipe_suggestions(recipe_id);

-- Private avatar storage. Only the owner may read/write their directory.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('avatars','avatars',false,1048576,array['image/jpeg']) on conflict(id) do nothing;
create policy avatars_read on storage.objects for select to authenticated using(bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy avatars_insert on storage.objects for insert to authenticated with check(bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy avatars_update on storage.objects for update to authenticated using(bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy avatars_delete on storage.objects for delete to authenticated using(bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);

do $$ declare t text; begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  foreach t in array array['profiles','recipe_favorites','recipe_suggestions','recipe_catalog'] loop
   if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
    execute format('alter publication supabase_realtime add table public.%I',t);
   end if;
  end loop;
 end if;
end $$;
commit;
