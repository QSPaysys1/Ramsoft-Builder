-- =============================================================================
-- Seed: legacy "loggedUser" → public.profiles.data + optional legacy_user_flat
-- =============================================================================
-- PREREQ (optional): If no Auth user exists yet, this script will CREATE one using
-- profile JSON "email" (preferred) or "loginEmail", with v_seed_password (change below).
-- If users already exist, it matches by override → loginEmail → email.
--
-- SECURITY: Never store GSTZen tokens, passwords (secureData), or full bank/PAN
-- in git. Paste the full JSON only inside Supabase SQL Editor. Redact before commit.
--
-- The script resolves auth.users.id by:
--   1) v_auth_email (non-empty override)
--   2) loginEmail from JSON
--   3) email from JSON
-- If none match, it INSERTS auth.users + auth.identities (email provider) then continues.
do $seed$
declare
  v_auth_email text := '';
  -- Initial password when the script auto-creates auth.users — reset in Dashboard after login.
  v_seed_password text := 'RamsoftSeed#ChangeOnFirstLogin1';
  v_uid uuid;
  v_new_email text;
  v_instance_id uuid;
  v_profile jsonb := $json$
{
  "legacy_uid": "q98exBwjDThigZGdTMrg7IpFZ193",
  "objectID": "q98exBwjDThigZGdTMrg7IpFZ193",
  "organizationAddress": "",
  "pincode": 500082,
  "GSTIN": "36AADCG4992P1ZU",
  "phone": "7013857444",
  "isUnitsAdded": true,
  "txn": "b9cad73f287e454e8bac5887c4261678",
  "isOnline": true,
  "name": "Ajay",
  "manager": "Ajay Kumar Gunda",
  "organizationLandmark": "",
  "typeOfOrganization": "",
  "registrationType": "",
  "lastActivity": {"seconds": 1765549758, "nanoseconds": 686000000},
  "userName": "ajay",
  "txnSortDate": {"seconds": 1754893761, "nanoseconds": 836000000},
  "email": "ajay.gunda@sbpcorp.in",
  "organizationPhoto": "",
  "isAccountHeadsAdded": true,
  "organizationState": "",
  "address": "Gachibowli",
  "isNatureGroupsAdded": true,
  "companyName": "SBP Consulting Private Limited",
  "industry": "",
  "isNaturesAdded": true,
  "isLabelsAdded": true,
  "organizationStateCode": "",
  "txnSortTime": {"seconds": 1754893761, "nanoseconds": 836000000},
  "legalName": "",
  "panNo": "REDACT_IN_EDITOR",
  "txnSortDate2": 1754893761836,
  "bank": [],
  "isSleeping": false,
  "tinNo": "test",
  "organizationCreatedBy": "q98exBwjDThigZGdTMrg7IpFZ193",
  "registrationTyp": "",
  "state": "Telangana-36",
  "txnCreatedAt": {"seconds": 1754893761, "nanoseconds": 247000000},
  "organizationPincode": 0,
  "organizationCity": "",
  "photo": null,
  "isGSTAuthenticated": true,
  "city": "Hyderabad",
  "txnStatusDesc": "If authentication succeeds",
  "organizationName": "",
  "isAdded": true,
  "loginEmail": "ajay@phone.com",
  "isProductsAdded": true,
  "userType": "taxpayer",
  "stateCode": "36",
  "isRolesAdded": true,
  "organizationCreatedAt": {"seconds": 1751975086, "nanoseconds": 794000000}
}
$json$::jsonb;
begin
  if btrim(v_auth_email) <> '' then
    select u.id
    into v_uid
    from auth.users u
    where lower(btrim(u.email)) = lower(btrim(v_auth_email))
    limit 1;
  end if;

  if v_uid is null and nullif(btrim(v_profile->>'loginEmail'), '') is not null then
    select u.id
    into v_uid
    from auth.users u
    where lower(btrim(u.email)) = lower(btrim(v_profile->>'loginEmail'))
    limit 1;
  end if;

  if v_uid is null and nullif(btrim(v_profile->>'email'), '') is not null then
    select u.id
    into v_uid
    from auth.users u
    where lower(btrim(u.email)) = lower(btrim(v_profile->>'email'))
    limit 1;
  end if;

  if v_uid is null then
    v_new_email := coalesce(
      nullif(btrim(v_auth_email), ''),
      nullif(btrim(v_profile->>'email'), ''),
      nullif(btrim(v_profile->>'loginEmail'), '')
    );
    if v_new_email is null then
      raise exception
        'Cannot create or match user: set v_auth_email or add email / loginEmail to the JSON profile.';
    end if;

    select i.id into v_instance_id from auth.instances i limit 1;
    if v_instance_id is null then
      v_instance_id := '00000000-0000-0000-0000-000000000000'::uuid;
    end if;

    begin
      v_uid := gen_random_uuid();
      insert into auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change,
        email_change_token_new
      ) values (
        v_instance_id,
        v_uid,
        'authenticated',
        'authenticated',
        lower(btrim(v_new_email)),
        crypt(v_seed_password, gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object(
          'full_name',
          coalesce(nullif(btrim(v_profile->>'name'), ''), '')
        ),
        now(),
        now(),
        '',
        '',
        '',
        ''
      );

      insert into auth.identities (
        id,
        user_id,
        provider_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      ) values (
        gen_random_uuid(),
        v_uid,
        v_uid::text,
        jsonb_build_object(
          'sub',
          v_uid::text,
          'email',
          lower(btrim(v_new_email))
        ),
        'email',
        now(),
        now(),
        now()
      );
    exception
      when unique_violation then
        select u.id
        into v_uid
        from auth.users u
        where lower(btrim(u.email)) = lower(btrim(v_new_email))
        limit 1;
        if v_uid is null then
          raise;
        end if;
      when others then
        raise exception using message =
          format(
            'Auto-create auth user failed for "%s": %s (SQLSTATE %s). Create the user manually in Dashboard → Authentication, or adjust the seed.',
            v_new_email,
            sqlerrm,
            sqlstate
          );
    end;
  end if;

  update public.profiles
  set
    data = coalesce(public.profiles.data, '{}'::jsonb) || v_profile,
    updated_at = now()
  where id = v_uid;

  insert into public.legacy_user_flat (
    id, gstin, company_name, display_name, email, phone, city, address,
    state_code, pincode, user_name, login_email, extra
  )
  values (
    v_uid,
    '36AADCG4992P1ZU',
    'SBP Consulting Private Limited',
    'Ajay',
    'ajay.gunda@sbpcorp.in',
    '7013857444',
    'Hyderabad',
    'Gachibowli',
    '36',
    '500082',
    'ajay',
    'ajay@phone.com',
    jsonb_build_object(
      'legacy_uid', 'q98exBwjDThigZGdTMrg7IpFZ193',
      'txn', 'b9cad73f287e454e8bac5887c4261678'
    )
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
end
$seed$;

-- -----------------------------------------------------------------------------
-- Table editor column map (profiles.data jsonb — same logical fields)
-- -----------------------------------------------------------------------------
-- organizationAddress  | text in JSON
-- pincode               | number
-- GSTIN                 | text
-- phone                 | text
-- isUnitsAdded          | boolean
-- txn                   | text
-- isOnline              | boolean
-- name                  | text
-- manager               | text
-- userName              | text
-- email                 | text
-- companyName           | text
-- address / city        | text
-- stateCode             | text
-- loginEmail            | text (sign-in identifier helper)
-- bank                  | jsonb array (edit in JSON panel)
-- legacy_uid            | old Firebase uid string
-- …                     | any other legacy keys you merge into data
