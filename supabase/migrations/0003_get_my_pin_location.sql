-- Owner-only pin location as GeoJSON (for client fly-to after onboarding)
create or replace function public.get_my_pin_location(pin_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select ST_AsGeoJSON(location)::jsonb
  from public.memory_pins
  where id = pin_id and user_id = auth.uid();
$$;
