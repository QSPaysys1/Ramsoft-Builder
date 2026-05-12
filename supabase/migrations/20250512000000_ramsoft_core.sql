-- Ramsoft Builder: core tables, RLS, profile bootstrap, realtime.
-- Apply in Supabase SQL editor or via Supabase CLI (`supabase db push`).

-- ---------------------------------------------------------------------------
-- profiles: mirrors legacy Firestore `users/{uid}` document in `data` jsonb
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- products: per-user catalog (legacy `products` collection)
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb
);

create index if not exists products_user_created_at_idx
  on public.products (user_id, created_at asc);

alter table public.products enable row level security;

create policy "products_select_own"
  on public.products for select
  using (auth.uid() = user_id);

create policy "products_insert_own"
  on public.products for insert
  with check (auth.uid() = user_id);

create policy "products_update_own"
  on public.products for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "products_delete_own"
  on public.products for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- einvoices
-- ---------------------------------------------------------------------------
create table if not exists public.einvoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  base_object jsonb not null,
  gstzen_response jsonb not null,
  created_at timestamptz not null default now(),
  sort_date_2 bigint not null
);

create index if not exists einvoices_user_sort_idx
  on public.einvoices (user_id, sort_date_2 desc);

alter table public.einvoices enable row level security;

create policy "einvoices_select_own"
  on public.einvoices for select
  using (auth.uid() = user_id);

create policy "einvoices_insert_own"
  on public.einvoices for insert
  with check (auth.uid() = user_id);

create policy "einvoices_update_own"
  on public.einvoices for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "einvoices_delete_own"
  on public.einvoices for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- user_dashboard_fy: replaces Firestore userDashboard/{uid}/fy/{fy}
-- ---------------------------------------------------------------------------
create table if not exists public.user_dashboard_fy (
  user_id uuid not null references auth.users (id) on delete cascade,
  fy_key text not null,
  invoices integer not null default 0,
  cinvoices integer not null default 0,
  ewaybills integer not null default 0,
  creditnotes integer not null default 0,
  debitnotes integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, fy_key)
);

alter table public.user_dashboard_fy enable row level security;

create policy "user_dashboard_fy_select_own"
  on public.user_dashboard_fy for select
  using (auth.uid() = user_id);

create policy "user_dashboard_fy_insert_own"
  on public.user_dashboard_fy for insert
  with check (auth.uid() = user_id);

create policy "user_dashboard_fy_update_own"
  on public.user_dashboard_fy for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Auto-create profile row for new auth users
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, data)
  values (new.id, '{}'::jsonb)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Realtime (postgres_changes)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.einvoices;
alter publication supabase_realtime add table public.products;
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.user_dashboard_fy;

-- ---------------------------------------------------------------------------
-- Storage bucket scaffold (optional uploads)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('app-uploads', 'app-uploads', false)
on conflict (id) do nothing;

create policy "storage_app_uploads_select_own"
  on storage.objects for select
  using (
    bucket_id = 'app-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage_app_uploads_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'app-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage_app_uploads_update_own"
  on storage.objects for update
  using (
    bucket_id = 'app-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage_app_uploads_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'app-uploads'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
