-- Optional wide table for Supabase Table Editor (column-per-field).
-- Core app still reads `public.profiles.data` jsonb; keep this in sync manually or via trigger later.

create table if not exists public.legacy_user_flat (
  id uuid primary key references auth.users (id) on delete cascade,
  gstin text,
  company_name text,
  display_name text,
  email text,
  phone text,
  city text,
  address text,
  state_code text,
  pincode text,
  user_name text,
  login_email text,
  extra jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.legacy_user_flat enable row level security;

drop policy if exists "legacy_user_flat_select_own" on public.legacy_user_flat;
create policy "legacy_user_flat_select_own"
  on public.legacy_user_flat for select
  using (auth.uid() = id);

drop policy if exists "legacy_user_flat_insert_own" on public.legacy_user_flat;
create policy "legacy_user_flat_insert_own"
  on public.legacy_user_flat for insert
  with check (auth.uid() = id);

drop policy if exists "legacy_user_flat_update_own" on public.legacy_user_flat;
create policy "legacy_user_flat_update_own"
  on public.legacy_user_flat for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
