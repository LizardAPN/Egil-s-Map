create table if not exists public.echo_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  pin_id uuid not null references public.memory_pins (id) on delete cascade,
  latitude_bucket integer not null,
  longitude_bucket integer not null,
  triggered_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, pin_id, latitude_bucket, longitude_bucket, triggered_on)
);

create index if not exists echo_logs_user_triggered_on_idx
  on public.echo_logs (user_id, triggered_on desc);

create index if not exists echo_logs_pin_id_idx
  on public.echo_logs (pin_id);

alter table public.echo_logs enable row level security;

drop policy if exists "echo_logs_select_own_rows" on public.echo_logs;
create policy "echo_logs_select_own_rows"
on public.echo_logs
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "echo_logs_insert_own_rows" on public.echo_logs;
create policy "echo_logs_insert_own_rows"
on public.echo_logs
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "echo_logs_delete_own_rows" on public.echo_logs;
create policy "echo_logs_delete_own_rows"
on public.echo_logs
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "live_presence_delete_own_row" on public.live_presence;
create policy "live_presence_delete_own_row"
on public.live_presence
for delete
to authenticated
using (user_id = auth.uid());

create or replace function public.cleanup_expired_live_presence()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.live_presence
  where updated_at < now() - interval '30 minutes';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

create or replace function public.cleanup_old_echo_logs()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.echo_logs
  where created_at < now() - interval '14 days';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

do $$
declare
  cron_extension_available boolean;
  existing_job_id bigint;
begin
  create extension if not exists pg_cron;
  select exists (select 1 from pg_extension where extname = 'pg_cron')
  into cron_extension_available;

  if not cron_extension_available then
    return;
  end if;

  for existing_job_id in execute 'select jobid from cron.job where jobname = ''cleanup-live-presence'''
  loop
    perform cron.unschedule(existing_job_id);
  end loop;

  for existing_job_id in execute 'select jobid from cron.job where jobname = ''cleanup-echo-logs'''
  loop
    perform cron.unschedule(existing_job_id);
  end loop;

  perform cron.schedule(
    'cleanup-live-presence',
    '*/15 * * * *',
    'select public.cleanup_expired_live_presence();'
  );

  perform cron.schedule(
    'cleanup-echo-logs',
    '15 3 * * *',
    'select public.cleanup_old_echo_logs();'
  );
exception
  when insufficient_privilege or undefined_table or undefined_function then
    null;
end;
$$;

-- Rollback:
-- drop table if exists public.echo_logs;
-- drop function if exists public.cleanup_expired_live_presence();
-- drop function if exists public.cleanup_old_echo_logs();
-- drop policy if exists "live_presence_delete_own_row" on public.live_presence;
