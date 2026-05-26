-- Base Imprint schema (tables, triggers, indexes). RLS is in 000001_imprint_rls.sql.

create extension if not exists postgis;

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  display_name text,
  bio text,
  avatar_url text,
  website text,
  location_name text,
  is_onboarded boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ============================================================
-- CHAPTERS
-- ============================================================
create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  description text,
  color text not null default '#3B8BD4',
  cover_url text,
  started_at date,
  ended_at date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index chapters_user_id_idx on public.chapters (user_id);

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
  media_urls text[] default '{}',
  media_types text[] default '{}',
  visibility text not null default 'private'
    check (visibility in ('private', 'friends', 'public')),
  pinned_at timestamptz not null default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index memory_pins_location_idx
  on public.memory_pins using gist (location);

create index memory_pins_pinned_at_idx
  on public.memory_pins (pinned_at desc);

create index memory_pins_user_id_idx
  on public.memory_pins (user_id);

-- ============================================================
-- FOLLOWS
-- ============================================================
create table public.follows (
  follower_id uuid not null references public.users (id) on delete cascade,
  following_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index follows_following_id_idx on public.follows (following_id);

-- ============================================================
-- REACTIONS
-- ============================================================
create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  pin_id uuid not null references public.memory_pins (id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, pin_id)
);

create index reactions_pin_id_idx on public.reactions (pin_id);

-- ============================================================
-- LIVE PRESENCE
-- ============================================================
create table public.live_presence (
  user_id uuid primary key references public.users (id) on delete cascade,
  location geography(point, 4326) not null,
  visibility text not null default 'hidden'
    check (visibility in ('friends', 'community', 'hidden')),
  updated_at timestamptz default now()
);

create index live_presence_location_idx
  on public.live_presence using gist (location);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_users_updated_at
  before update on public.users
  for each row
  execute function public.update_updated_at();

create trigger update_chapters_updated_at
  before update on public.chapters
  for each row
  execute function public.update_updated_at();

create trigger update_memory_pins_updated_at
  before update on public.memory_pins
  for each row
  execute function public.update_updated_at();
