-- Map legacy short login names (e.g. "ajay") to the email stored on legacy_user_flat
-- before signInWithPassword. Anonymous clients may call this RPC; the function runs
-- with definer rights and only returns a string (no row data).

create or replace function public.resolve_login_identifier(p_identifier text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trim text := btrim(p_identifier);
  v_login text;
begin
  if v_trim is null or v_trim = '' then
    return v_trim;
  end if;
  if position('@' in v_trim) > 0 then
    return v_trim;
  end if;
  select nullif(btrim(l.login_email), '')
    into v_login
  from public.legacy_user_flat l
  where lower(btrim(l.user_name)) = lower(v_trim)
  limit 1;
  if v_login is not null then
    return v_login;
  end if;
  return v_trim || '@phone.com';
end;
$$;

comment on function public.resolve_login_identifier(text) is
  'Legacy username → email for signInWithPassword; full emails are returned unchanged.';

grant execute on function public.resolve_login_identifier(text) to anon;
grant execute on function public.resolve_login_identifier(text) to authenticated;
grant execute on function public.resolve_login_identifier(text) to service_role;
