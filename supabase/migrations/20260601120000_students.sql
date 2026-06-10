-- School Management: students table, RLS, admission number generation.

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  admission_number text not null,
  roll_number text,
  first_name text not null,
  last_name text not null,
  gender text check (gender in ('male', 'female', 'other')),
  date_of_birth date,
  blood_group text,
  aadhaar_number text,
  mobile_number text not null,
  email text,
  photo_url text,
  category text,
  religion text,
  nationality text default 'India',
  academic_year text not null,
  admission_date date not null default current_date,
  class_name text,
  section text,
  house text,
  previous_school text,
  previous_percentage numeric(5, 2),
  status text not null default 'applicant'
    check (
      status in (
        'applicant',
        'active',
        'inactive',
        'transferred',
        'alumni',
        'dropped'
      )
    ),
  parent_details jsonb not null default '{}'::jsonb,
  address jsonb not null default '{}'::jsonb,
  medical jsonb not null default '{}'::jsonb,
  transfer_details jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint students_user_admission_unique unique (user_id, admission_number)
);

create unique index if not exists students_user_roll_class_section_idx
  on public.students (user_id, class_name, section, roll_number)
  where roll_number is not null
    and deleted_at is null;

create index if not exists students_user_status_idx
  on public.students (user_id, status)
  where deleted_at is null;

create index if not exists students_user_class_section_idx
  on public.students (user_id, class_name, section)
  where deleted_at is null;

create index if not exists students_user_created_idx
  on public.students (user_id, created_at desc);

alter table public.students enable row level security;

create policy "students_select_own"
  on public.students for select
  using (auth.uid() = user_id);

create policy "students_insert_own"
  on public.students for insert
  with check (auth.uid() = user_id);

create policy "students_update_own"
  on public.students for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "students_delete_own"
  on public.students for delete
  using (auth.uid() = user_id);

-- Per-user sequential admission numbers: ADM-YYYY-0001
create table if not exists public.student_admission_sequences (
  user_id uuid not null references auth.users (id) on delete cascade,
  year int not null,
  last_value int not null default 0,
  primary key (user_id, year)
);

alter table public.student_admission_sequences enable row level security;

create policy "student_admission_sequences_select_own"
  on public.student_admission_sequences for select
  using (auth.uid() = user_id);

create policy "student_admission_sequences_insert_own"
  on public.student_admission_sequences for insert
  with check (auth.uid() = user_id);

create policy "student_admission_sequences_update_own"
  on public.student_admission_sequences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.generate_admission_number(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year int := extract(year from current_date)::int;
  v_next int;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized';
  end if;

  insert into public.student_admission_sequences (user_id, year, last_value)
  values (p_user_id, v_year, 0)
  on conflict (user_id, year) do nothing;

  update public.student_admission_sequences
  set last_value = last_value + 1
  where user_id = p_user_id and year = v_year
  returning last_value into v_next;

  return 'ADM-' || v_year::text || '-' || lpad(v_next::text, 4, '0');
end;
$$;

grant execute on function public.generate_admission_number(uuid) to authenticated;

create or replace function public.generate_transfer_certificate_number(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year int := extract(year from current_date)::int;
  v_next int;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Unauthorized';
  end if;

  insert into public.student_admission_sequences (user_id, year, last_value)
  values (p_user_id, v_year, 0)
  on conflict (user_id, year) do nothing;

  update public.student_admission_sequences
  set last_value = last_value + 1
  where user_id = p_user_id and year = v_year
  returning last_value into v_next;

  return 'TC-' || v_year::text || '-' || lpad(v_next::text, 4, '0');
end;
$$;

grant execute on function public.generate_transfer_certificate_number(uuid) to authenticated;

alter publication supabase_realtime add table public.students;
