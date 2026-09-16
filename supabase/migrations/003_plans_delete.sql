-- Lets a plan's organizer delete it from their "Your trips" list. Every
-- child table already references plans with "on delete cascade" (see
-- 001_tripr_pilot.sql), so this one delete removes the whole trip cleanly.
-- Deliberately organizer-only, not any member: deleting destroys the trip
-- for the whole group, not just the caller's own view of it.

drop policy if exists plans_delete on public.plans;
create policy plans_delete on public.plans
  for delete to authenticated
  using (organizer_user_id = auth.uid());
