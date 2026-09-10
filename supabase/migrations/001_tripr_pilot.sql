-- Tripr pilot schema: plans, participants, availability, preferences, trip
-- options and votes, migrated 1:1 from the app's existing TypeScript model
-- (src/lib/types.ts) plus the auth/membership/share-code layer needed to run
-- this as a real multi-user product on Supabase.
--
-- Run this once, top to bottom, in the Supabase SQL editor on a fresh
-- project. Safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE / DROP
-- POLICY IF EXISTS) except for the table CREATE statements themselves.

-- ============================================================
-- EXTENSIONS
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- SHARE CODE GENERATOR
-- ============================================================
-- Short, unguessable, no look-alike characters — meant to be typed/read
-- aloud, same alphabet the app already uses for its local ids.

create or replace function generate_share_code(p_length int default 8)
returns text
language plpgsql
as $$
declare
  alphabet text := '23456789abcdefghjkmnpqrstuvwxyz';
  result text := '';
  i int;
begin
  for i in 1..p_length loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return result;
end;
$$;

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  share_code text not null unique default generate_share_code(8),
  name text not null,
  destination_idea text,
  date_range_start date not null,
  date_range_end date not null,
  trip_length_nights int not null default 3,
  trip_length_flexible boolean not null default false,
  departure_location text,
  organizer_name text not null,
  organizer_user_id uuid not null references auth.users(id),
  expected_participant_names text[] not null default '{}',
  status text not null default 'planning' check (status in ('planning', 'decided')),
  decided_option_id uuid, -- FK added below, after trip_options exists
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  name text not null,
  is_organizer boolean not null default false,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (plan_id, user_id)
);

create table if not exists public.availabilities (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  flexible boolean not null default false,
  days jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (participant_id)
);

create table if not exists public.preferences (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  budget_per_person numeric not null,
  trip_types text[] not null default '{}',
  flight_preference text not null default 'balanced' check (flight_preference in ('cheap', 'balanced', 'convenience')),
  updated_at timestamptz not null default now(),
  unique (participant_id)
);

create table if not exists public.trip_options (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  name text not null,
  destination text not null default '',
  image_emoji text not null default '',
  date_start date,
  date_end date,
  flight_estimate numeric not null default 0,
  hotel_estimate numeric not null default 0,
  other_estimate numeric not null default 0,
  external_link text,
  notes text,
  trip_types text[] not null default '{}',
  price_source text not null default 'manual' check (price_source in ('manual', 'provider')),
  price_checked_at timestamptz not null default now(),
  created_by uuid references public.participants(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  option_id uuid not null references public.trip_options(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  value text not null check (value in ('love', 'like', 'no')),
  updated_at timestamptz not null default now(),
  unique (option_id, participant_id)
);

-- Deferred FK now that trip_options exists.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'plans_decided_option_id_fkey'
  ) then
    alter table public.plans
      add constraint plans_decided_option_id_fkey
      foreign key (decided_option_id) references public.trip_options(id) on delete set null;
  end if;
end $$;

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_plans_share_code on public.plans(share_code);
create index if not exists idx_participants_plan_id on public.participants(plan_id);
create index if not exists idx_participants_user_id on public.participants(user_id);
create index if not exists idx_availabilities_plan_id on public.availabilities(plan_id);
create index if not exists idx_preferences_plan_id on public.preferences(plan_id);
create index if not exists idx_trip_options_plan_id on public.trip_options(plan_id);
create index if not exists idx_votes_plan_id on public.votes(plan_id);
create index if not exists idx_votes_option_id on public.votes(option_id);

-- ============================================================
-- MEMBERSHIP HELPER FUNCTIONS (SECURITY DEFINER, used inside RLS policies)
-- ============================================================

create or replace function public.is_plan_member(p_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.participants
    where plan_id = p_plan_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_plan_organizer(p_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.participants
    where plan_id = p_plan_id and user_id = auth.uid() and is_organizer = true
  ) or exists (
    select 1 from public.plans
    where id = p_plan_id and organizer_user_id = auth.uid()
  );
$$;

create or replace function public.owns_participant(p_participant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.participants
    where id = p_participant_id and user_id = auth.uid()
  );
$$;

grant execute on function public.is_plan_member(uuid) to authenticated;
grant execute on function public.is_plan_organizer(uuid) to authenticated;
grant execute on function public.owns_participant(uuid) to authenticated;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.plans enable row level security;
alter table public.participants enable row level security;
alter table public.availabilities enable row level security;
alter table public.preferences enable row level security;
alter table public.trip_options enable row level security;
alter table public.votes enable row level security;

-- plans: readable by members + the organizer (covers the moment right after
-- creation, before the organizer has completed their own join flow).
drop policy if exists plans_select on public.plans;
create policy plans_select on public.plans
  for select to authenticated
  using (public.is_plan_member(id) or organizer_user_id = auth.uid());

drop policy if exists plans_insert on public.plans;
create policy plans_insert on public.plans
  for insert to authenticated
  with check (organizer_user_id = auth.uid());

-- Only the organizer can change plan state (decide / reopen). No general
-- "edit trip details" UI exists yet, but this stays scoped to organizer-only
-- regardless.
drop policy if exists plans_update on public.plans;
create policy plans_update on public.plans
  for update to authenticated
  using (public.is_plan_organizer(id))
  with check (public.is_plan_organizer(id));

-- participants: any member can see the roster; joining happens exclusively
-- through join_plan_by_code() (security definer) below, so there is no
-- direct insert policy. Someone may only ever update their own row.
drop policy if exists participants_select on public.participants;
create policy participants_select on public.participants
  for select to authenticated
  using (public.is_plan_member(plan_id));

drop policy if exists participants_update_self on public.participants;
create policy participants_update_self on public.participants
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- availabilities: any member can read the whole group's availability (the
-- decision engine needs everyone's data), but a participant may only write
-- their own.
drop policy if exists availabilities_select on public.availabilities;
create policy availabilities_select on public.availabilities
  for select to authenticated
  using (public.is_plan_member(plan_id));

drop policy if exists availabilities_insert on public.availabilities;
create policy availabilities_insert on public.availabilities
  for insert to authenticated
  with check (public.owns_participant(participant_id) and public.is_plan_member(plan_id));

drop policy if exists availabilities_update on public.availabilities;
create policy availabilities_update on public.availabilities
  for update to authenticated
  using (public.owns_participant(participant_id))
  with check (public.owns_participant(participant_id));

-- preferences: same shape as availabilities.
drop policy if exists preferences_select on public.preferences;
create policy preferences_select on public.preferences
  for select to authenticated
  using (public.is_plan_member(plan_id));

drop policy if exists preferences_insert on public.preferences;
create policy preferences_insert on public.preferences
  for insert to authenticated
  with check (public.owns_participant(participant_id) and public.is_plan_member(plan_id));

drop policy if exists preferences_update on public.preferences;
create policy preferences_update on public.preferences
  for update to authenticated
  using (public.owns_participant(participant_id))
  with check (public.owns_participant(participant_id));

-- trip_options: any member can propose a destination (matches the current
-- product — participants, not just the organizer, can add options).
drop policy if exists trip_options_select on public.trip_options;
create policy trip_options_select on public.trip_options
  for select to authenticated
  using (public.is_plan_member(plan_id));

drop policy if exists trip_options_insert on public.trip_options;
create policy trip_options_insert on public.trip_options
  for insert to authenticated
  with check (public.is_plan_member(plan_id));

-- votes: any member can read the group's votes; a participant may only cast
-- or change their own.
drop policy if exists votes_select on public.votes;
create policy votes_select on public.votes
  for select to authenticated
  using (public.is_plan_member(plan_id));

drop policy if exists votes_insert on public.votes;
create policy votes_insert on public.votes
  for insert to authenticated
  with check (public.owns_participant(participant_id) and public.is_plan_member(plan_id));

drop policy if exists votes_update on public.votes;
create policy votes_update on public.votes
  for update to authenticated
  using (public.owns_participant(participant_id))
  with check (public.owns_participant(participant_id));

-- ============================================================
-- PUBLIC-SAFE RPCs
-- ============================================================

-- Everything an invite screen (or an already-joined Trip Room) needs, in one
-- round trip. Deliberately leaves out participants/availabilities/
-- preferences/votes — those stay behind normal membership RLS and are
-- fetched separately once the caller is actually a member.
create or replace function public.get_plan_overview(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_plan public.plans;
  v_options jsonb;
  v_response_count int;
  v_my_participant_id uuid;
begin
  select * into v_plan from public.plans where share_code = p_code;
  if v_plan.id is null then
    return null;
  end if;

  select coalesce(jsonb_agg(o order by o.created_at), '[]'::jsonb)
    into v_options
    from public.trip_options o
    where o.plan_id = v_plan.id;

  select count(*) into v_response_count
    from public.participants
    where plan_id = v_plan.id and responded_at is not null;

  select id into v_my_participant_id
    from public.participants
    where plan_id = v_plan.id and user_id = auth.uid();

  return jsonb_build_object(
    'plan', to_jsonb(v_plan),
    'options', v_options,
    'responseCount', v_response_count,
    'isMember', v_my_participant_id is not null,
    'myParticipantId', v_my_participant_id
  );
end;
$$;

grant execute on function public.get_plan_overview(text) to anon, authenticated;

-- The only way to become a participant. Validates the code, is idempotent
-- for a caller who already joined, and decides organizer status the same
-- way the app already does (first person whose name matches the plan's
-- recorded organizer name).
create or replace function public.join_plan_by_code(p_code text, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan public.plans;
  v_participant_id uuid;
  v_is_organizer boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if trim(coalesce(p_name, '')) = '' then
    raise exception 'Name is required';
  end if;

  select * into v_plan from public.plans where share_code = p_code;
  if v_plan.id is null then
    raise exception 'Invalid invite link';
  end if;

  select id into v_participant_id
    from public.participants
    where plan_id = v_plan.id and user_id = auth.uid();

  if v_participant_id is not null then
    return jsonb_build_object('planId', v_plan.id, 'participantId', v_participant_id, 'isNew', false);
  end if;

  v_is_organizer := lower(trim(p_name)) = lower(trim(v_plan.organizer_name))
    and not exists (select 1 from public.participants where plan_id = v_plan.id and is_organizer = true);

  insert into public.participants (plan_id, user_id, name, is_organizer)
  values (v_plan.id, auth.uid(), trim(p_name), v_is_organizer)
  returning id into v_participant_id;

  return jsonb_build_object('planId', v_plan.id, 'participantId', v_participant_id, 'isNew', true);
end;
$$;

grant execute on function public.join_plan_by_code(text, text) to anon, authenticated;

-- ============================================================
-- REALTIME
-- ============================================================

do $$
declare
  t text;
begin
  foreach t in array array['plans', 'participants', 'availabilities', 'preferences', 'trip_options', 'votes']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
