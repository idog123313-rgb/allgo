-- Automated trip search: room-occupancy setting for accommodation math, and
-- richer price-freshness metadata on trip_options (replaces the old
-- price_source/price_checked_at pair from 001 with provider/price_type/
-- searched_at/currency). Safe to re-run.

alter table public.plans
  add column if not exists room_occupancy int not null default 2;

alter table public.trip_options
  add column if not exists provider text,
  add column if not exists price_type text not null default 'manual' check (price_type in ('manual', 'indicative', 'live')),
  add column if not exists searched_at timestamptz not null default now(),
  add column if not exists currency text not null default 'ILS';

do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'trip_options' and column_name = 'price_source') then
    update public.trip_options
      set price_type = case when price_source = 'provider' then 'indicative' else 'manual' end
      where price_source is not null;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'trip_options' and column_name = 'price_checked_at') then
    update public.trip_options set searched_at = price_checked_at where price_checked_at is not null;
  end if;
end $$;

alter table public.trip_options drop column if exists price_source;
alter table public.trip_options drop column if exists price_checked_at;

create index if not exists idx_trip_options_price_type on public.trip_options(price_type);

-- 001 deliberately shipped trip_options with no UPDATE policy (nothing needed
-- one yet). "Check latest price" needs to update an existing option's price
-- fields — any plan member may trigger a refresh, matching who can already
-- vote/add options.
drop policy if exists trip_options_update on public.trip_options;
create policy trip_options_update on public.trip_options
  for update to authenticated
  using (public.is_plan_member(plan_id))
  with check (public.is_plan_member(plan_id));
