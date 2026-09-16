"use client";

/**
 * Supabase-backed persistence layer. Every trip lives in Postgres, gated by
 * Row Level Security — see supabase/migrations/001_tripr_pilot.sql for the
 * schema and policies this relies on.
 *
 * `planId` throughout this file means the plan's internal uuid (`plans.id`),
 * NOT the shareable invite code — resolve a share code to a plan via
 * `getPlanOverview` first.
 */

import { supabase } from "./supabase/client";
import { mapAvailability, mapParticipant, mapPlan, mapPreference, mapTripOption, mapVote } from "./db-mappers";
import type {
  Availability,
  DayStatus,
  FlightPreference,
  Plan,
  PlanBundle,
  Preference,
  PriceType,
  TripOption,
  TripType,
  Vote,
  VoteValue,
} from "./types";

async function getUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error("Not signed in");
  return userId;
}

function raise(error: { message: string } | null, fallback: string): void {
  if (error) throw new Error(error.message || fallback);
}

// ---------------------------------------------------------------------------
// Plan lifecycle
// ---------------------------------------------------------------------------

export interface CreatePlanInput {
  name: string;
  destinationIdea: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  tripLengthNights: number;
  tripLengthFlexible: boolean;
  departureLocation: string;
  roomOccupancy: number;
  organizerName: string;
  expectedParticipantNames: string[];
}

export async function createPlan(input: CreatePlanInput): Promise<Plan> {
  const userId = await getUserId();
  const { data, error } = await supabase
    .from("plans")
    .insert({
      name: input.name.trim(),
      destination_idea: input.destinationIdea.trim() || null,
      date_range_start: input.dateRangeStart,
      date_range_end: input.dateRangeEnd,
      trip_length_nights: input.tripLengthNights,
      trip_length_flexible: input.tripLengthFlexible,
      departure_location: input.departureLocation.trim() || null,
      room_occupancy: input.roomOccupancy,
      organizer_name: input.organizerName.trim(),
      organizer_user_id: userId,
      expected_participant_names: input.expectedParticipantNames,
    })
    .select()
    .single();
  raise(error, "Couldn't create the trip");
  return mapPlan(data);
}

/** Trips this device's identity organizes or has joined — RLS scopes the
 * query itself (see is_plan_member / organizer_user_id in the plans
 * policy), so no explicit filter is needed here. */
export async function listMyPlans(): Promise<Plan[]> {
  const { data, error } = await supabase.from("plans").select().order("created_at", { ascending: false });
  raise(error, "Couldn't load your trips");
  return (data ?? []).map(mapPlan);
}

/** Organizer-only (see plans_delete policy, 003) — cascades to every child
 * row (participants, availabilities, options, votes, ...) via FK. A delete
 * RLS blocks (not the organizer) deletes zero rows without an error, so we
 * check what actually came back rather than trusting a clean response. */
export async function deletePlan(planId: string): Promise<void> {
  const { data, error } = await supabase.from("plans").delete().eq("id", planId).select("id");
  raise(error, "Couldn't delete this trip");
  if (!data || data.length === 0) throw new Error("Only the organizer can delete this trip");
}

export interface PlanOverview {
  plan: Plan;
  options: TripOption[];
  responseCount: number;
  isMember: boolean;
  myParticipantId: string | null;
}

/** Resolves a share code to everything a not-yet-joined visitor may see. */
export async function getPlanOverview(shareCode: string): Promise<PlanOverview | null> {
  const { data, error } = await supabase.rpc("get_plan_overview", { p_code: shareCode });
  raise(error, "Couldn't load this trip");
  if (!data) return null;
  return {
    plan: mapPlan(data.plan),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options: (data.options ?? []).map((o: any) => mapTripOption(o)),
    responseCount: data.responseCount ?? 0,
    isMember: !!data.isMember,
    myParticipantId: data.myParticipantId ?? null,
  };
}

/** Full bundle — only resolvable once the caller is a member (RLS-gated). */
export async function getFullPlanBundle(planId: string): Promise<PlanBundle | null> {
  const [planRes, participantsRes, availabilitiesRes, preferencesRes, optionsRes, votesRes] = await Promise.all([
    supabase.from("plans").select().eq("id", planId).maybeSingle(),
    supabase.from("participants").select().eq("plan_id", planId),
    supabase.from("availabilities").select().eq("plan_id", planId),
    supabase.from("preferences").select().eq("plan_id", planId),
    supabase.from("trip_options").select().eq("plan_id", planId),
    supabase.from("votes").select().eq("plan_id", planId),
  ]);

  if (!planRes.data) return null;
  raise(planRes.error, "Couldn't load this trip");
  raise(participantsRes.error, "Couldn't load participants");
  raise(availabilitiesRes.error, "Couldn't load availability");
  raise(preferencesRes.error, "Couldn't load preferences");
  raise(optionsRes.error, "Couldn't load trip options");
  raise(votesRes.error, "Couldn't load votes");

  return {
    plan: mapPlan(planRes.data),
    participants: (participantsRes.data ?? []).map(mapParticipant),
    availabilities: (availabilitiesRes.data ?? []).map(mapAvailability),
    preferences: (preferencesRes.data ?? []).map(mapPreference),
    options: (optionsRes.data ?? []).map(mapTripOption),
    votes: (votesRes.data ?? []).map(mapVote),
  };
}

export interface JoinResult {
  planId: string;
  participantId: string;
  isNew: boolean;
}

export async function joinPlanByCode(shareCode: string, name: string): Promise<JoinResult> {
  const { data, error } = await supabase.rpc("join_plan_by_code", { p_code: shareCode, p_name: name });
  raise(error, "Couldn't join this trip");
  return { planId: data.planId, participantId: data.participantId, isNew: data.isNew };
}

// ---------------------------------------------------------------------------
// Participant responses
// ---------------------------------------------------------------------------

export async function submitAvailability(
  planId: string,
  participantId: string,
  data: { flexible: boolean; days: Record<string, DayStatus> }
): Promise<Availability> {
  const { data: row, error } = await supabase
    .from("availabilities")
    .upsert(
      {
        plan_id: planId,
        participant_id: participantId,
        flexible: data.flexible,
        days: data.days,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "participant_id" }
    )
    .select()
    .single();
  raise(error, "Couldn't save your availability");
  return mapAvailability(row);
}

export async function submitPreference(
  planId: string,
  participantId: string,
  data: { budgetPerPerson: number; tripTypes: TripType[]; flightPreference: FlightPreference }
): Promise<Preference> {
  const { data: row, error } = await supabase
    .from("preferences")
    .upsert(
      {
        plan_id: planId,
        participant_id: participantId,
        budget_per_person: data.budgetPerPerson,
        trip_types: data.tripTypes,
        flight_preference: data.flightPreference,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "participant_id" }
    )
    .select()
    .single();
  raise(error, "Couldn't save your preferences");

  const { error: respondedErr } = await supabase
    .from("participants")
    .update({ responded_at: new Date().toISOString() })
    .eq("id", participantId);
  raise(respondedErr, "Couldn't finish saving your answers");

  return mapPreference(row);
}

// ---------------------------------------------------------------------------
// Trip options & votes
// ---------------------------------------------------------------------------

export async function addOption(
  planId: string,
  createdBy: string,
  data: Omit<TripOption, "id" | "planId" | "createdBy" | "createdAt" | "provider" | "priceType" | "searchedAt" | "currency"> & {
    provider?: string | null;
    priceType?: PriceType;
    currency?: string;
  }
): Promise<TripOption> {
  const { data: row, error } = await supabase
    .from("trip_options")
    .insert({
      plan_id: planId,
      name: data.name,
      destination: data.destination,
      image_emoji: data.imageEmoji,
      date_start: data.dateStart,
      date_end: data.dateEnd,
      flight_estimate: data.flightEstimate,
      hotel_estimate: data.hotelEstimate,
      other_estimate: data.otherEstimate,
      external_link: data.externalLink,
      notes: data.notes,
      trip_types: data.tripTypes,
      provider: data.provider ?? null,
      price_type: data.priceType ?? "manual",
      currency: data.currency ?? "ILS",
      searched_at: new Date().toISOString(),
      created_by: createdBy,
    })
    .select()
    .single();
  raise(error, "Couldn't add that option");
  return mapTripOption(row);
}

export async function castVote(
  planId: string,
  optionId: string,
  participantId: string,
  value: VoteValue
): Promise<Vote> {
  const { data: row, error } = await supabase
    .from("votes")
    .upsert(
      {
        plan_id: planId,
        option_id: optionId,
        participant_id: participantId,
        value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "option_id,participant_id" }
    )
    .select()
    .single();
  raise(error, "Couldn't save your vote");
  return mapVote(row);
}

// ---------------------------------------------------------------------------
// Decide
// ---------------------------------------------------------------------------

export async function decidePlan(planId: string, optionId: string): Promise<Plan> {
  const { data, error } = await supabase
    .from("plans")
    .update({ status: "decided", decided_option_id: optionId, decided_at: new Date().toISOString() })
    .eq("id", planId)
    .select()
    .single();
  raise(error, "Couldn't lock in that trip");
  return mapPlan(data);
}

export async function reopenPlan(planId: string): Promise<Plan> {
  const { data, error } = await supabase
    .from("plans")
    .update({ status: "planning", decided_option_id: null, decided_at: null })
    .eq("id", planId)
    .select()
    .single();
  raise(error, "Couldn't reopen planning");
  return mapPlan(data);
}

// ---------------------------------------------------------------------------
// Automated trip search — runs server-side (API routes), never calls a
// travel provider directly from the browser.
// ---------------------------------------------------------------------------

async function authedFetch(url: string, body: unknown) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Not signed in");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error || "Request failed");
  return json;
}

export interface SearchTripsResult {
  options: TripOption[];
  optionIds: string[];
}

/** Runs the automated discovery funnel and persists the top matches as real trip options. */
export async function searchTrips(shareCode: string, participantId: string): Promise<SearchTripsResult> {
  const json = await authedFetch("/api/search-trips", { shareCode, participantId });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const options = (json.options ?? []).map((o: any) => mapTripOption(o));
  return { options, optionIds: options.map((o: TripOption) => o.id) };
}

export interface RefreshPriceResult {
  option: TripOption;
  previousTotal: number;
}

/** Live-checks a single option's price (finalist / on-demand refresh). */
export async function refreshOptionPrice(shareCode: string, optionId: string): Promise<RefreshPriceResult> {
  const json = await authedFetch("/api/refresh-price", { shareCode, optionId });
  return { option: mapTripOption(json.option), previousTotal: json.previousTotal };
}
