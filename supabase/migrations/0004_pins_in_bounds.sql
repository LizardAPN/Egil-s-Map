-- Viewport pin reads via pins_visible (RLS + coordinate blur enforced by the view).

create or replace function public.pins_in_bounds(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision,
  p_user_id uuid default null,
  p_chapter_id uuid default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_limit int default 500
)
returns table (
  id uuid,
  user_id uuid,
  chapter_id uuid,
  lng double precision,
  lat double precision,
  location_exact boolean,
  location_name text,
  title text,
  visibility text,
  pinned_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    p.id,
    p.user_id,
    p.chapter_id,
    st_x(p.location::geometry) as lng,
    st_y(p.location::geometry) as lat,
    p.location_exact,
    p.location_name,
    p.title,
    p.visibility,
    p.pinned_at
  from public.pins_visible p
  where (
    (min_lng <= -180 and max_lng >= 180 and min_lat <= -90 and max_lat >= 90)
    or st_intersects(
      p.location,
      st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography
    )
  )
    and (p_user_id is null or p.user_id = p_user_id)
    and (p_chapter_id is null or p.chapter_id = p_chapter_id)
    and (p_from is null or p.pinned_at >= p_from)
    and (p_to is null or p.pinned_at <= p_to)
  order by p.pinned_at desc
  limit least(p_limit, 500);
$$;

create or replace function public.pin_by_id(p_id uuid)
returns table (
  id uuid,
  user_id uuid,
  chapter_id uuid,
  lng double precision,
  lat double precision,
  location_exact boolean,
  location_name text,
  title text,
  body text,
  visibility text,
  pinned_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    p.id,
    p.user_id,
    p.chapter_id,
    st_x(p.location::geometry) as lng,
    st_y(p.location::geometry) as lat,
    p.location_exact,
    p.location_name,
    p.title,
    p.body,
    p.visibility,
    p.pinned_at
  from public.pins_visible p
  where p.id = p_id;
$$;

grant execute on function public.pins_in_bounds(
  double precision,
  double precision,
  double precision,
  double precision,
  uuid,
  uuid,
  timestamptz,
  timestamptz,
  int
) to authenticated, anon;

grant execute on function public.pin_by_id(uuid) to authenticated, anon;
