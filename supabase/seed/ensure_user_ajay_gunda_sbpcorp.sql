-- =============================================================================
-- One-shot / repeatable: Auth user ajay.gunda@sbpcorp.in + profile + FY dashboard
-- =============================================================================
-- Run in Supabase SQL Editor after migrations (needs resolve_login_identifier
-- if you rely on short-name login mapping). Optional: run
-- seed_ajay_products_catalog.sql afterward to load legacy product varieties;
-- rows use auth.users.id as public.products.user_id (not legacy Firebase uid).
--
-- SECURITY: Contains a plaintext password for initial setup. Redact before
-- committing to shared repos; rotate after first login via Dashboard or app.
-- =============================================================================

do $seed$
declare
  v_email constant text := lower(btrim('ajay.gunda@sbpcorp.in'));
  v_plain_password text := 'AjayKumar1#';
  v_fy_key constant text := '2026-2027';
  v_uid uuid;
  v_instance_id uuid;
  v_profile jsonb := jsonb_build_object(
    'name', 'Ajay',
    'manager', 'Ajay Kumar Gunda',
    'userName', 'ajay',
    'email', 'ajay.gunda@sbpcorp.in',
    'loginEmail', 'ajay.gunda@sbpcorp.in',
    'companyName', 'SBP Consulting Private Limited',
    'GSTIN', '36AAYCA9563F1ZZ',
    'gstin', '36AAYCA9563F1ZZ',
    'gstrGstin', '36AAYCA9563F1ZZ',
    'gstr1Gstin', '36AAYCA9563F1ZZ',
    'organizationGstin', '36AAYCA9563F1ZZ',
    'phone', '7013857444',
    'city', 'Hyderabad',
    'address', 'Gachibowli',
    'state', 'Telangana-36',
    'stateCode', '36',
    'pincode', 500082,
    'userType', 'taxpayer',
    'isRolesAdded', true,
    'isSleeping', false,
    'status', 'ACTIVE',
    'isGSTAuthenticated', true,
    'isOnline', true,
    'isAdded', true,
    'gstPortalUsername', 'ARHASRI-23',
    'gstZenUsername', 'ajay.a02@gmail.com',
    'gstZenPassword', 'Arhasri@1234'
  );
begin
  if length(v_plain_password) < 6 then
    raise exception 'Password must be at least 6 characters.';
  end if;

  select u.id into v_uid from auth.users u where lower(btrim(u.email)) = v_email limit 1;

  if v_uid is null then
    select i.id into v_instance_id from auth.instances i limit 1;
    if v_instance_id is null then
      v_instance_id := '00000000-0000-0000-0000-000000000000'::uuid;
    end if;
    v_uid := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change, email_change_token_new
    ) values (
      v_instance_id, v_uid, 'authenticated', 'authenticated',
      v_email, crypt(v_plain_password, gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', 'Ajay Kumar Gunda'),
      now(), now(), '', '', '', ''
    );
    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), v_uid, v_email,
      jsonb_build_object('sub', v_uid::text, 'email', v_email),
      'email', now(), now(), now()
    );
  else
    update auth.users
    set
      encrypted_password = crypt(v_plain_password, gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      email = v_email,
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
        || jsonb_build_object('full_name', 'Ajay Kumar Gunda'),
      updated_at = now()
    where id = v_uid;

    update auth.identities
    set
      provider_id = v_email,
      identity_data = jsonb_build_object('sub', v_uid::text, 'email', v_email),
      updated_at = now()
    where user_id = v_uid and provider = 'email';

    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    )
    select
      gen_random_uuid(), v_uid, v_email,
      jsonb_build_object('sub', v_uid::text, 'email', v_email),
      'email', now(), now(), now()
    where not exists (
      select 1 from auth.identities i where i.user_id = v_uid and i.provider = 'email'
    );
  end if;

  insert into public.profiles (id, data, updated_at)
  values (v_uid, v_profile, now())
  on conflict (id) do update set
    data = coalesce(public.profiles.data, '{}'::jsonb) || excluded.data,
    updated_at = now();

  insert into public.legacy_user_flat (
    id, gstin, company_name, display_name, email, phone, city, address,
    state_code, pincode, user_name, login_email, extra, updated_at
  ) values (
    v_uid, '36AAYCA9563F1ZZ', 'SBP Consulting Private Limited', 'Ajay',
    'ajay.gunda@sbpcorp.in', '7013857444', 'Hyderabad', 'Gachibowli',
    '36', '500082', 'ajay', 'ajay.gunda@sbpcorp.in',
    jsonb_build_object('status', 'ACTIVE'),
    now()
  )
  on conflict (id) do update set
    gstin = excluded.gstin,
    company_name = excluded.company_name,
    display_name = excluded.display_name,
    email = excluded.email,
    phone = excluded.phone,
    city = excluded.city,
    address = excluded.address,
    state_code = excluded.state_code,
    pincode = excluded.pincode,
    user_name = excluded.user_name,
    login_email = excluded.login_email,
    extra = public.legacy_user_flat.extra || excluded.extra,
    updated_at = now();

  insert into public.user_dashboard_fy (
    user_id, fy_key, invoices, cinvoices, ewaybills, creditnotes, debitnotes, updated_at
  ) values (v_uid, v_fy_key, 0, 0, 0, 0, 0, now())
  on conflict (user_id, fy_key) do update set
    updated_at = now();
end
$seed$;
