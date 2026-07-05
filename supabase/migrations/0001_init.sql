-- Imprint v2 — initial schema
-- 0001_init.sql
-- Tables, helpers, RLS. Diary-first: pins/chapters/trails core, social layer minimal.

create extension if not exists postgis;

-- ============================================================
-- HELPERS: updated_at
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- USERS (extends auth.users)
-- ============================================================
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  display_name text,
  bio text,
  avatar_url text,
  is_onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index users_username_lower_idx on public.users (lower(username));

create trigger users_updated_at before update on public.users
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.users (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)) || '_' || left(new.id::text, 4),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- USER PREFERENCES
-- ============================================================
create table public.user_preferences (
  user_id uuid primary key references public.users (id) on delete cascade,
  default_pin_visibility text not null default 'private'
    check (default_pin_visibility in ('private','friends','unlisted','public')),
  settings jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create trigger user_preferences_updated_at before update on public.user_preferences
  for each row execute function public.set_updated_at();

-- ============================================================
-- CHAPTERS
-- ============================================================
create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  slug text not null,
  title text not null,
  description text,
  color text not null default '#EFB65A',
  cover_url text,
  started_at date,
  ended_at date,
  visibility text not null default 'private'
    check (visibility in ('private','friends','unlisted','public')),
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create index chapters_user_id_idx on public.chapters (user_id);

create trigger chapters_updated_at before update on public.chapters
  for each row execute function public.set_updated_at();

-- ============================================================
-- MEMORY PINS
-- ============================================================
create table public.memory_pins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  chapter_id uuid references public.chapters (id) on delete set null,
  location geography(point, 4326) not null,
  location_name text,
  title text not null,
  body text,
  visibility text not null default 'private'
    check (visibility in ('private','friends','unlisted','public')),
  pinned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index memory_pins_location_idx on public.memory_pins using gist (location);
create index memory_pins_user_id_idx on public.memory_pins (user_id);
create index memory_pins_chapter_id_idx on public.memory_pins (chapter_id);
create index memory_pins_pinned_at_idx on public.memory_pins (pinned_at desc);
create index memory_pins_visibility_pinned_at_idx on public.memory_pins (visibility, pinned_at desc);

create trigger memory_pins_updated_at before update on public.memory_pins
  for each row execute function public.set_updated_at();

-- Пин можно привязать только к своей главе
create or replace function public.check_pin_chapter_owner()
returns trigger language plpgsql as $$
begin
  if new.chapter_id is not null then
    if not exists (
      select 1 from public.chapters c
      where c.id = new.chapter_id and c.user_id = new.user_id
    ) then
      raise exception 'chapter does not belong to pin owner';
    end if;
  end if;
  return new;
end;
$$;

create trigger memory_pins_chapter_owner
  before insert or update of chapter_id on public.memory_pins
  for each row execute function public.check_pin_chapter_owner();

-- ============================================================
-- PIN MEDIA
-- ============================================================
create table public.pin_media (
  id uuid primary key default gen_random_uuid(),
  pin_id uuid not null references public.memory_pins (id) on delete cascade,
  position int not null default 0,
  media_type text not null check (media_type in ('image','video')),
  storage_path text not null,
  width int,
  height int,
  blurhash text,
  created_at timestamptz not null default now()
);

create index pin_media_pin_id_position_idx on public.pin_media (pin_id, position);

-- ============================================================
-- TRAILS (путь главы)
-- ============================================================
create table public.trails (
  chapter_id uuid primary key references public.chapters (id) on delete cascade,
  mode text not null default 'auto' check (mode in ('auto','custom')),
  -- segments: [{from_pin, to_pin, style: 'solid'|'dashed', waypoints: [[lng,lat],...]}]
  segments jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

create trigger trails_updated_at before update on public.trails
  for each row execute function public.set_updated_at();

-- ============================================================
-- MAP ANNOTATIONS (подписи/стрелки/зоны на карте главы)
-- ============================================================
create table public.map_annotations (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  kind text not null check (kind in ('label','arrow','area')),
  geom geography not null,
  content text,
  style jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index map_annotations_chapter_id_idx on public.map_annotations (chapter_id);

-- ============================================================
-- FOLLOWS
-- ============================================================
create table public.follows (
  follower_id uuid not null references public.users (id) on delete cascade,
  following_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index follows_following_id_idx on public.follows (following_id);

-- ============================================================
-- REACTIONS
-- ============================================================
create table public.reactions (
  user_id uuid not null references public.users (id) on delete cascade,
  pin_id uuid not null references public.memory_pins (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, pin_id)
);

create index reactions_pin_id_idx on public.reactions (pin_id);

-- ============================================================
-- VISIBILITY HELPERS
-- ============================================================
create or replace function public.is_mutual_follow(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.follows f1
    join public.follows f2 on f2.follower_id = b and f2.following_id = a
    where f1.follower_id = a and f1.following_id = b
  );
$$;

create or replace function public.can_view(owner_id uuid, vis text)
returns boolean language sql stable security definer set search_path = public as $$
  select
    auth.uid() = owner_id
    or vis in ('public','unlisted')
    or (vis = 'friends' and auth.uid() is not null and public.is_mutual_follow(auth.uid(), owner_id));
$$;

create or replace function public.can_view_pin(p public.memory_pins)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_view(p.user_id, p.visibility);
$$;

-- ============================================================
-- BLURRED LOCATION VIEW
-- Друзья не видят точные координаты чужих friends-пинов:
-- сетка ~0.02° (~1.5–2 км). Владелец и public/unlisted — точные.
-- Клиентский код читает пины ТОЛЬКО через эту вью.
-- ============================================================
create view public.pins_visible
with (security_invoker = on) as
select
  p.id,
  p.user_id,
  p.chapter_id,
  case
    when p.user_id = auth.uid() or p.visibility in ('public','unlisted')
      then p.location
    else st_snaptogrid(p.location::geometry, 0.02)::geography(point, 4326)
  end as location,
  (p.user_id = auth.uid() or p.visibility in ('public','unlisted')) as location_exact,
  p.location_name,
  p.title,
  p.body,
  p.visibility,
  p.pinned_at,
  p.created_at,
  p.updated_at
from public.memory_pins p;

-- ============================================================
-- RLS
-- ============================================================
alter table public.users enable row level security;
alter table public.user_preferences enable row level security;
alter table public.chapters enable row level security;
alter table public.memory_pins enable row level security;
alter table public.pin_media enable row level security;
alter table public.trails enable row level security;
alter table public.map_annotations enable row level security;
alter table public.follows enable row level security;
alter table public.reactions enable row level security;

-- users: профили публичны, править можно только свой
create policy users_select on public.users for select using (true);
create policy users_update on public.users for update using (auth.uid() = id);

-- preferences: только свои
create policy prefs_all on public.user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- chapters
create policy chapters_select on public.chapters
  for select using (public.can_view(user_id, visibility));
create policy chapters_insert on public.chapters
  for insert with check (auth.uid() = user_id);
create policy chapters_update on public.chapters
  for update using (auth.uid() = user_id);
create policy chapters_delete on public.chapters
  for delete using (auth.uid() = user_id);

-- memory_pins
create policy pins_select on public.memory_pins
  for select using (public.can_view(user_id, visibility));
create policy pins_insert on public.memory_pins
  for insert with check (auth.uid() = user_id);
create policy pins_update on public.memory_pins
  for update using (auth.uid() = user_id);
create policy pins_delete on public.memory_pins
  for delete using (auth.uid() = user_id);

-- pin_media: видимость наследуется от пина, менять может владелец пина
create policy pin_media_select on public.pin_media
  for select using (exists (
    select 1 from public.memory_pins p
    where p.id = pin_id and public.can_view(p.user_id, p.visibility)
  ));
create policy pin_media_cud on public.pin_media
  for all using (exists (
    select 1 from public.memory_pins p
    where p.id = pin_id and p.user_id = auth.uid()
  )) with check (exists (
    select 1 from public.memory_pins p
    where p.id = pin_id and p.user_id = auth.uid()
  ));

-- trails / annotations: видимость наследуется от главы
create policy trails_select on public.trails
  for select using (exists (
    select 1 from public.chapters c
    where c.id = chapter_id and public.can_view(c.user_id, c.visibility)
  ));
create policy trails_cud on public.trails
  for all using (exists (
    select 1 from public.chapters c
    where c.id = chapter_id and c.user_id = auth.uid()
  )) with check (exists (
    select 1 from public.chapters c
    where c.id = chapter_id and c.user_id = auth.uid()
  ));

create policy annotations_select on public.map_annotations
  for select using (exists (
    select 1 from public.chapters c
    where c.id = chapter_id and public.can_view(c.user_id, c.visibility)
  ));
create policy annotations_cud on public.map_annotations
  for all using (exists (
    select 1 from public.chapters c
    where c.id = chapter_id and c.user_id = auth.uid()
  )) with check (exists (
    select 1 from public.chapters c
    where c.id = chapter_id and c.user_id = auth.uid()
  ));

-- follows: списки публичны, управлять можно только своими подписками
create policy follows_select on public.follows for select using (true);
create policy follows_insert on public.follows
  for insert with check (auth.uid() = follower_id);
create policy follows_delete on public.follows
  for delete using (auth.uid() = follower_id);

-- reactions: видны там, где виден пин; ставить можно только там же
create policy reactions_select on public.reactions
  for select using (exists (
    select 1 from public.memory_pins p
    where p.id = pin_id and public.can_view(p.user_id, p.visibility)
  ));
create policy reactions_insert on public.reactions
  for insert with check (
    auth.uid() = user_id and exists (
      select 1 from public.memory_pins p
      where p.id = pin_id and public.can_view(p.user_id, p.visibility)
    )
  );
create policy reactions_delete on public.reactions
  for delete using (auth.uid() = user_id);
