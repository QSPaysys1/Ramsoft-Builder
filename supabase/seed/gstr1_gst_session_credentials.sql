-- =============================================================================
-- Seed: GSTR-1 GST session fields → public.profiles.data (per auth user)
-- =============================================================================
-- Canonical jsonb keys (read by gstr1-login.page.ts):
--   GSTIN              — GSTR registration GSTIN
--   gstPortalUsername  — GST portal username for Generate OTP
--   gstZenUsername     — GSTZen login for Generate Token
--   gstZenPassword     — GSTZen password
--
-- Patches: ajay.gunda@sbpcorp.in, ajay.a02@gmail.com, GSTIN 36AAYCA9563F1ZZ
-- SECURITY: Plaintext password — Supabase SQL Editor only.
-- =============================================================================

do $seed$
declare
  v_gstin constant text := '36AAYCA9563F1ZZ';
  v_portal_username constant text := 'ARHASRI-23';
  v_gstzen_user constant text := 'ajay.a02@gmail.com';
  v_gstzen_pass constant text := 'Arhasri@1234';
  v_patch jsonb := jsonb_build_object(
    'GSTIN', v_gstin,
    'gstin', v_gstin,
    'gstrGstin', v_gstin,
    'gstr1Gstin', v_gstin,
    'gstPortalUsername', v_portal_username,
    'gstZenUsername', v_gstzen_user,
    'gstZenPassword', v_gstzen_pass
  );
  v_uid uuid;
  v_email text;
  r record;
begin
  foreach v_email in array array['ajay.gunda@sbpcorp.in', 'ajay.a02@gmail.com'] loop
    select u.id into v_uid
    from auth.users u
    where lower(btrim(u.email)) = lower(btrim(v_email))
    limit 1;

    if v_uid is null then
      raise notice 'gstr1_gst_session_credentials: no auth.users for %', v_email;
      continue;
    end if;

    insert into public.profiles (id, data, updated_at)
    values (v_uid, v_patch, now())
    on conflict (id) do update set
      data = coalesce(public.profiles.data, '{}'::jsonb) || excluded.data,
      updated_at = now();

    insert into public.legacy_user_flat (id, gstin, extra, updated_at)
    values (
      v_uid,
      v_gstin,
      jsonb_build_object(
        'gstPortalUsername', v_portal_username,
        'gstZenUsername', v_gstzen_user
      ),
      now()
    )
    on conflict (id) do update set
      gstin = excluded.gstin,
      extra = coalesce(public.legacy_user_flat.extra, '{}'::jsonb) || excluded.extra,
      updated_at = now();

    raise notice 'gstr1_gst_session_credentials: patched %', v_email;
  end loop;

  for r in
    select p.id
    from public.profiles p
    where upper(btrim(coalesce(
      p.data->>'GSTIN',
      p.data->>'gstin',
      p.data->>'tinGstNo',
      ''
    ))) = v_gstin
  loop
    update public.profiles
    set
      data = coalesce(data, '{}'::jsonb) || v_patch,
      updated_at = now()
    where id = r.id;

    insert into public.legacy_user_flat (id, gstin, extra, updated_at)
    values (
      r.id,
      v_gstin,
      jsonb_build_object('gstPortalUsername', v_portal_username),
      now()
    )
    on conflict (id) do update set
      gstin = excluded.gstin,
      extra = coalesce(public.legacy_user_flat.extra, '{}'::jsonb) || excluded.extra,
      updated_at = now();
  end loop;

  raise notice 'gstr1_gst_session_credentials: done (GSTIN %, portal %).', v_gstin, v_portal_username;
end
$seed$;
