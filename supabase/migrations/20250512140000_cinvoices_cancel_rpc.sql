-- Cancelled e-invoices archive + atomic move from einvoices (replaces Firestore batch).

create table if not exists public.cinvoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_einvoice_id uuid not null,
  base_object jsonb not null,
  gstzen_response jsonb not null,
  gstzen_cancel_response jsonb not null default '{}'::jsonb,
  cancel_reason text not null default '',
  fy_key text,
  created_at timestamptz not null default now(),
  sort_date_2 bigint not null
);

create index if not exists cinvoices_user_sort_idx
  on public.cinvoices (user_id, sort_date_2 desc);

alter table public.cinvoices enable row level security;

create policy "cinvoices_select_own"
  on public.cinvoices for select
  using (auth.uid() = user_id);

-- Writes happen only via SECURITY DEFINER RPC (no client insert/delete policies).

alter publication supabase_realtime add table public.cinvoices;

create or replace function public.archive_and_remove_einvoice(
  p_id uuid,
  p_cancel_json jsonb,
  p_cancel_reason text,
  p_fy_key text
)
returns void
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_uid uuid := auth.uid();
  r public.einvoices%rowtype;
  v_fy text := nullif(trim(coalesce(p_fy_key, '')), '');
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select * into r
  from public.einvoices
  where id = p_id and user_id = v_uid;

  if not found then
    raise exception 'einvoice not found';
  end if;

  insert into public.cinvoices (
    user_id,
    source_einvoice_id,
    base_object,
    gstzen_response,
    gstzen_cancel_response,
    cancel_reason,
    fy_key,
    sort_date_2
  )
  values (
    r.user_id,
    r.id,
    r.base_object,
    r.gstzen_response,
    coalesce(p_cancel_json, '{}'::jsonb),
    coalesce(p_cancel_reason, ''),
    v_fy,
    r.sort_date_2
  );

  delete from public.einvoices
  where id = p_id and user_id = v_uid;

  if v_fy is not null then
    update public.user_dashboard_fy
    set
      invoices = greatest(0, coalesce(invoices, 0) - 1),
      cinvoices = coalesce(cinvoices, 0) + 1,
      updated_at = now()
    where user_id = v_uid and fy_key = v_fy;
  end if;
end;
$$;

revoke all on function public.archive_and_remove_einvoice(uuid, jsonb, text, text) from public;
grant execute on function public.archive_and_remove_einvoice(uuid, jsonb, text, text) to authenticated;
