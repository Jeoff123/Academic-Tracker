-- Academic Tracker: run this once in Supabase (SQL Editor > New query > paste > Run)

create table if not exists public.user_data (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  key        text        not null,
  value      jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.user_data enable row level security;

-- every student can only see and change their own rows
create policy "own rows: select" on public.user_data
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "own rows: insert" on public.user_data
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own rows: update" on public.user_data
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows: delete" on public.user_data
  for delete to authenticated using ((select auth.uid()) = user_id);
