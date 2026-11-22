-- Supabase の SQL Editor で一度だけ実行してください。
create table if not exists public.drink_entries (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  entry jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.drink_entries enable row level security;
revoke all on public.drink_entries from anon;
grant select, insert, update, delete on public.drink_entries to authenticated;
drop policy if exists "read own entries" on public.drink_entries;
drop policy if exists "insert own entries" on public.drink_entries;
drop policy if exists "update own entries" on public.drink_entries;
drop policy if exists "delete own entries" on public.drink_entries;
create policy "read own entries" on public.drink_entries for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own entries" on public.drink_entries for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own entries" on public.drink_entries for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "delete own entries" on public.drink_entries for delete to authenticated using ((select auth.uid()) = user_id);
