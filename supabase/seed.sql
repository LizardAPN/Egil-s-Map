-- Imprint local development seed
-- Runs automatically on `supabase db reset` (see supabase/config.toml [db.seed])
--
-- Dev login (email / password):
--   demo@imprint.dev  / imprint-dev
--   alex@imprint.dev  / imprint-dev
--   sam@imprint.dev   / imprint-dev
--
-- LOCAL ONLY — do not run against production.

create extension if not exists pgcrypto;

do $seed_user$
declare
  v_pw text := crypt('imprint-dev', gen_salt('bf'));
begin
  -- demo
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, is_super_admin
  ) values (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'demo@imprint.dev', v_pw, now(),
    '{"provider":"email","providers":["email"]}',
    '{"username":"demo","full_name":"Demo Traveler"}',
    now(), now(), false
  ) on conflict (id) do nothing;

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '{"sub":"11111111-1111-1111-1111-111111111111","email":"demo@imprint.dev"}',
    'email', '11111111-1111-1111-1111-111111111111',
    now(), now(), now()
  ) on conflict (id) do nothing;

  -- alex
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, is_super_admin
  ) values (
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'alex@imprint.dev', v_pw, now(),
    '{"provider":"email","providers":["email"]}',
    '{"username":"alex","full_name":"Alex Wanderer"}',
    now(), now(), false
  ) on conflict (id) do nothing;

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    '{"sub":"22222222-2222-2222-2222-222222222222","email":"alex@imprint.dev"}',
    'email', '22222222-2222-2222-2222-222222222222',
    now(), now(), now()
  ) on conflict (id) do nothing;

  -- sam
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, is_super_admin
  ) values (
    '33333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'sam@imprint.dev', v_pw, now(),
    '{"provider":"email","providers":["email"]}',
    '{"username":"sam","full_name":"Sam Explorer"}',
    now(), now(), false
  ) on conflict (id) do nothing;

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    '33333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    '{"sub":"33333333-3333-3333-3333-333333333333","email":"sam@imprint.dev"}',
    'email', '33333333-3333-3333-3333-333333333333',
    now(), now(), now()
  ) on conflict (id) do nothing;
end;
$seed_user$;

update public.users set
  display_name = 'Demo Traveler',
  bio = 'Mapping memories around Berlin.',
  location_name = 'Berlin, Germany',
  is_onboarded = true
where id = '11111111-1111-1111-1111-111111111111';

update public.users set
  display_name = 'Alex Wanderer',
  bio = 'Friend for Live Map and Echoes testing.',
  location_name = 'Berlin, Germany',
  is_onboarded = true
where id = '22222222-2222-2222-2222-222222222222';

update public.users set
  display_name = 'Sam Explorer',
  bio = 'Public discovery seed account.',
  location_name = 'Potsdam, Germany',
  is_onboarded = true
where id = '33333333-3333-3333-3333-333333333333';

insert into public.chapters (id, user_id, title, description, color, started_at, ended_at)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'Year in Berlin',
    'Startup year and city walks',
    '#3B8BD4',
    '2025-01-01',
    null
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '22222222-2222-2222-2222-222222222222',
    'Alps 2025',
    'Hiking memories',
    '#22c55e',
    '2025-06-01',
    '2025-09-01'
  )
on conflict (id) do nothing;

insert into public.memory_pins (
  id, user_id, chapter_id, location, location_name,
  title, body, media_urls, media_types, visibility, pinned_at
)
values
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    st_setsrid(st_makepoint(13.4178, 52.4984), 4326)::geography,
    'Kreuzberg, Berlin',
    'First flat in Berlin',
    'Moved in during a snowy week. Still one of my favorite corners of the city.',
    '{}', '{}', 'friends', now() - interval '120 days'
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    st_setsrid(st_makepoint(13.3777, 52.5163), 4326)::geography,
    'Mitte, Berlin',
    'Brandenburg Gate at blue hour',
    'Private note for myself.',
    '{}', '{}', 'private', now() - interval '30 days'
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '22222222-2222-2222-2222-222222222222',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    st_setsrid(st_makepoint(13.3756, 52.5096), 4326)::geography,
    'Potsdamer Platz, Berlin',
    'Alex was here',
    'Friend-visible pin for Echoes / Live Map demos.',
    '{}', '{}', 'friends', now() - interval '14 days'
  ),
  (
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    '33333333-3333-3333-3333-333333333333',
    null,
    st_setsrid(st_makepoint(13.4049, 52.5200), 4326)::geography,
    'Museum Island, Berlin',
    'Public story on the Spree',
    'Discovery Mode seed — visible to everyone.',
    '{}', '{}', 'public', now() - interval '7 days'
  )
on conflict (id) do nothing;

insert into public.follows (follower_id, following_id)
values
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111'),
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333')
on conflict do nothing;

insert into public.reactions (id, user_id, pin_id)
values (
  '99999999-9999-9999-9999-999999999991',
  '22222222-2222-2222-2222-222222222222',
  'cccccccc-cccc-cccc-cccc-cccccccccccc'
)
on conflict (user_id, pin_id) do nothing;

insert into public.live_presence (user_id, location, visibility, updated_at)
values
  (
    '22222222-2222-2222-2222-222222222222',
    st_setsrid(st_makepoint(13.4050, 52.5120), 4326)::geography,
    'friends',
    now()
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    st_setsrid(st_makepoint(13.3900, 52.5080), 4326)::geography,
    'community',
    now()
  )
on conflict (user_id) do update set
  location = excluded.location,
  visibility = excluded.visibility,
  updated_at = excluded.updated_at;
