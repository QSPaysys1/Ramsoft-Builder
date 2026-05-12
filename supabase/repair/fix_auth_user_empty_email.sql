-- -----------------------------------------------------------------------------
-- Repair: auth.users — email + password for email/password sign-in
-- -----------------------------------------------------------------------------
-- Dashboard "Raw JSON" does not include the password. The secret lives only in
-- auth.users.encrypted_password (bcrypt). If that column is null or was never
-- set, signInWithPassword will always fail until you set a hash here (or use
-- Dashboard → Send password recovery).
--
-- Run in Supabase SQL Editor. Edit v_uid, v_email, and v_plain_password below.
-- Uses the same crypt() approach as supabase/seed/legacy_user_profile_seed.sql.
--
-- After login, change the password from the app or Dashboard.
-- -----------------------------------------------------------------------------

begin;

do $$
declare
  v_uid constant uuid := '8ec50ac1-e7c2-4209-a291-9fb731b76682';
  v_email constant text := lower(btrim('ajay.gunda@sbpcorp.in'));
  v_plain_password text := 'AjayKumar1#'; -- change before/after run as needed
  v_other uuid;
begin
  if v_email = '' then
    raise exception 'Set v_email to a non-empty address.';
  end if;

  if length(v_plain_password) < 6 then
    raise exception 'Password must be at least 6 characters (Supabase minimum).';
  end if;

  select id into v_other from auth.users where lower(btrim(email)) = v_email and id <> v_uid limit 1;
  if v_other is not null then
    raise exception 'Email % is already used by auth user %', v_email, v_other;
  end if;

  update auth.users
  set
    email = v_email,
    encrypted_password = crypt(v_plain_password, gen_salt('bf')),
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    updated_at = now()
  where id = v_uid;

  if not found then
    raise exception 'No auth.users row for id %', v_uid;
  end if;

  update auth.identities
  set
    identity_data = identity_data
      || jsonb_build_object('email', v_email),
    updated_at = now()
  where user_id = v_uid and provider = 'email';
end $$;

commit;
