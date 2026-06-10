-- Uploads: metadata for files stored in Cloudflare R2 and images stored in Cloudflare Images.

create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  file_name text not null,
  file_type text not null,                  -- MIME type
  file_size bigint,                         -- bytes
  storage_type text not null
    check (storage_type in ('cloudflare_images', 'r2')),
  cloudflare_image_id text,                 -- only for images
  cloudflare_image_url text,                -- delivery URL (imagedelivery.net)
  r2_object_key text,                       -- only for R2 files
  r2_public_url text,                       -- public URL of the R2 object
  created_at timestamptz not null default now()
);

create index if not exists uploads_user_created_idx
  on public.uploads (user_id, created_at desc);

alter table public.uploads enable row level security;

-- Reads are scoped to the owner. Inserts happen server-side with the service-role
-- key (which bypasses RLS), so no insert policy is required for clients.
create policy "uploads_select_own"
  on public.uploads for select
  using (auth.uid() = user_id);

create policy "uploads_delete_own"
  on public.uploads for delete
  using (auth.uid() = user_id);
