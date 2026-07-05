alter table public.users
  add column if not exists echoes_enabled boolean not null default true,
  add column if not exists notifications_enabled boolean not null default true,
  add column if not exists default_live_visibility text not null default 'friends'
    check (default_live_visibility in ('friends', 'community', 'hidden')),
  add column if not exists default_pin_visibility text not null default 'private'
    check (default_pin_visibility in ('private', 'friends', 'public'));

create or replace function public.delete_my_account()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  delete from auth.users
  where id = auth.uid();

  return true;
end;
$$;

grant execute on function public.delete_my_account() to authenticated;

-- rollback
-- alter table public.users
--   drop column if exists echoes_enabled,
--   drop column if exists notifications_enabled,
--   drop column if exists default_live_visibility,
--   drop column if exists default_pin_visibility;
-- drop function if exists public.delete_my_account();
