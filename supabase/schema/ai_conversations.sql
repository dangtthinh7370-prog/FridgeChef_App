-- Mirrored schema for the hosted ai_conversations migration.
create table public.ai_conversations (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null check(length(message) between 1 and 2000),
  reply text not null check(length(reply) between 1 and 12000),
  created_at timestamptz not null default now()
);
create index conversations_owner_date on public.ai_conversations(user_id,created_at desc);
alter table public.ai_conversations enable row level security;
revoke all on public.ai_conversations from anon,authenticated;
grant select,delete on public.ai_conversations to authenticated;
grant all on public.ai_conversations to service_role;
create policy conversations_read on public.ai_conversations for select to authenticated using((select auth.uid())=user_id);
create policy conversations_delete on public.ai_conversations for delete to authenticated using((select auth.uid())=user_id);
