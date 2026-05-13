-- Audit log for GSTZen update vehicle / Part B calls + denormalized summary on eway_bills for list filters.

create table if not exists public.eway_bill_transport_updates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  eway_bill_id uuid not null references public.eway_bills (id) on delete cascade,
  request_payload jsonb not null default '{}'::jsonb,
  response jsonb not null default '{}'::jsonb,
  status text not null
    check (status in ('pending', 'success', 'failed')),
  error_message text,
  vehicle_no_before text,
  vehicle_no_after text,
  created_at timestamptz not null default now()
);

create index if not exists eway_bill_transport_updates_bill_created_idx
  on public.eway_bill_transport_updates (eway_bill_id, created_at desc);

alter table public.eway_bills
  add column if not exists transport_last_status text,
  add column if not exists transport_last_at timestamptz,
  add column if not exists transport_success_count integer not null default 0,
  add column if not exists transport_last_vehicle_changed boolean not null default false;

alter table public.eway_bill_transport_updates enable row level security;

create policy "eway_bill_transport_updates_select_own"
  on public.eway_bill_transport_updates for select
  using (auth.uid() = user_id);

create policy "eway_bill_transport_updates_insert_own"
  on public.eway_bill_transport_updates for insert
  with check (auth.uid() = user_id);

create policy "eway_bill_transport_updates_update_own"
  on public.eway_bill_transport_updates for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "eway_bill_transport_updates_delete_own"
  on public.eway_bill_transport_updates for delete
  using (auth.uid() = user_id);
