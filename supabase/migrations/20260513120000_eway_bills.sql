-- Standalone e-way bills generated via GSTZen ewbapi + app persistence.

create table if not exists public.eway_bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  ewb_number text,
  invoice_details jsonb not null default '{}'::jsonb,
  transporter_details jsonb not null default '{}'::jsonb,
  vehicle_details jsonb not null default '{}'::jsonb,
  request_payload jsonb not null default '{}'::jsonb,
  generated_response jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'generated', 'cancelled', 'error')),
  cancel_response jsonb not null default '{}'::jsonb,
  cancel_reason text,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists eway_bills_user_created_idx
  on public.eway_bills (user_id, created_at desc);

alter table public.eway_bills enable row level security;

create policy "eway_bills_select_own"
  on public.eway_bills for select
  using (auth.uid() = user_id);

create policy "eway_bills_insert_own"
  on public.eway_bills for insert
  with check (auth.uid() = user_id);

create policy "eway_bills_update_own"
  on public.eway_bills for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "eway_bills_delete_own"
  on public.eway_bills for delete
  using (auth.uid() = user_id);

alter publication supabase_realtime add table public.eway_bills;
