-- Extended admission fields (JSON sections + middle name + remarks).

alter table public.students
  add column if not exists middle_name text,
  add column if not exists remarks text,
  add column if not exists admission_details jsonb not null default '{}'::jsonb;
