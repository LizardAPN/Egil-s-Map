create or replace function public.is_mutual_follow(requester uuid, other_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.follows f1
    join public.follows f2
      on f2.follower_id = other_user
     and f2.following_id = requester
    where f1.follower_id = requester
      and f1.following_id = other_user
  );
$$;

create or replace function public.can_view_memory_pin(
  pin_owner_id uuid,
  pin_visibility text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() = pin_owner_id
    or pin_visibility = 'public'
    or (
      pin_visibility = 'friends'
      and auth.uid() is not null
      and public.is_mutual_follow(auth.uid(), pin_owner_id)
    );
$$;

create index if not exists memory_pins_location_gist_idx
  on public.memory_pins
  using gist (location);

create index if not exists memory_pins_user_id_idx
  on public.memory_pins (user_id);

create index if not exists memory_pins_chapter_id_idx
  on public.memory_pins (chapter_id);

create index if not exists memory_pins_visibility_pinned_at_idx
  on public.memory_pins (visibility, pinned_at desc);

create index if not exists memory_pins_user_visibility_idx
  on public.memory_pins (user_id, visibility);

create index if not exists chapters_user_id_idx
  on public.chapters (user_id);

create index if not exists live_presence_location_gist_idx
  on public.live_presence
  using gist (location);

create index if not exists live_presence_visibility_updated_at_idx
  on public.live_presence (visibility, updated_at desc);

create index if not exists follows_follower_id_idx
  on public.follows (follower_id);

create index if not exists follows_following_id_idx
  on public.follows (following_id);

create index if not exists reactions_pin_id_idx
  on public.reactions (pin_id);

create index if not exists reactions_user_id_idx
  on public.reactions (user_id);

alter table public.users enable row level security;
alter table public.memory_pins enable row level security;
alter table public.chapters enable row level security;
alter table public.live_presence enable row level security;
alter table public.follows enable row level security;
alter table public.reactions enable row level security;

drop policy if exists "users_select_authenticated" on public.users;
create policy "users_select_authenticated"
on public.users
for select
to authenticated
using (true);

drop policy if exists "users_insert_own_row" on public.users;
create policy "users_insert_own_row"
on public.users
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "users_update_own_row" on public.users;
create policy "users_update_own_row"
on public.users
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "users_delete_own_row" on public.users;
create policy "users_delete_own_row"
on public.users
for delete
to authenticated
using (id = auth.uid());

drop policy if exists "memory_pins_select_visible" on public.memory_pins;
create policy "memory_pins_select_visible"
on public.memory_pins
for select
to public
using (
  public.can_view_memory_pin(user_id, visibility)
);

drop policy if exists "memory_pins_insert_own_row" on public.memory_pins;
create policy "memory_pins_insert_own_row"
on public.memory_pins
for insert
to authenticated
with check (
  user_id = auth.uid()
);

drop policy if exists "memory_pins_update_owner_only" on public.memory_pins;
create policy "memory_pins_update_owner_only"
on public.memory_pins
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "memory_pins_delete_owner_only" on public.memory_pins;
create policy "memory_pins_delete_owner_only"
on public.memory_pins
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "chapters_select_visible" on public.chapters;
create policy "chapters_select_visible"
on public.chapters
for select
to public
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.memory_pins mp
    where mp.chapter_id = chapters.id
      and (
        mp.visibility = 'public'
        or (
          mp.visibility = 'friends'
          and auth.uid() is not null
          and public.is_mutual_follow(auth.uid(), chapters.user_id)
        )
      )
  )
);

drop policy if exists "chapters_insert_owner_only" on public.chapters;
create policy "chapters_insert_owner_only"
on public.chapters
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "chapters_update_owner_only" on public.chapters;
create policy "chapters_update_owner_only"
on public.chapters
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "chapters_delete_owner_only" on public.chapters;
create policy "chapters_delete_owner_only"
on public.chapters
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "live_presence_select_visible" on public.live_presence;
create policy "live_presence_select_visible"
on public.live_presence
for select
to authenticated
using (
  user_id = auth.uid()
  or visibility = 'community'
  or (
    visibility = 'friends'
    and auth.uid() is not null
    and public.is_mutual_follow(auth.uid(), user_id)
  )
);

drop policy if exists "live_presence_insert_own_row" on public.live_presence;
create policy "live_presence_insert_own_row"
on public.live_presence
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "live_presence_update_own_row" on public.live_presence;
create policy "live_presence_update_own_row"
on public.live_presence
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "follows_select_all" on public.follows;
create policy "follows_select_all"
on public.follows
for select
to public
using (true);

drop policy if exists "follows_insert_own_edge" on public.follows;
create policy "follows_insert_own_edge"
on public.follows
for insert
to authenticated
with check (
  follower_id = auth.uid()
);

drop policy if exists "follows_delete_own_edge" on public.follows;
create policy "follows_delete_own_edge"
on public.follows
for delete
to authenticated
using (follower_id = auth.uid());

drop policy if exists "reactions_select_all" on public.reactions;
create policy "reactions_select_all"
on public.reactions
for select
to public
using (true);

drop policy if exists "reactions_insert_own_reaction" on public.reactions;
create policy "reactions_insert_own_reaction"
on public.reactions
for insert
to authenticated
with check (
  user_id = auth.uid()
);

drop policy if exists "reactions_delete_own_reaction" on public.reactions;
create policy "reactions_delete_own_reaction"
on public.reactions
for delete
to authenticated
using (user_id = auth.uid());
