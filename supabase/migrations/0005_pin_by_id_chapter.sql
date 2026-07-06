-- Extend pin_by_id with chapter metadata when the chapter is visible to the caller.

create or replace function public.pin_by_id(p_id uuid)
returns table (
  id uuid,
  user_id uuid,
  chapter_id uuid,
  chapter_title text,
  chapter_color text,
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
    c.title as chapter_title,
    c.color as chapter_color,
    st_x(p.location::geometry) as lng,
    st_y(p.location::geometry) as lat,
    p.location_exact,
    p.location_name,
    p.title,
    p.body,
    p.visibility,
    p.pinned_at
  from public.pins_visible p
  left join public.chapters c
    on c.id = p.chapter_id
    and public.can_view(c.user_id, c.visibility)
  where p.id = p_id;
$$;

grant execute on function public.pin_by_id(uuid) to authenticated, anon;
