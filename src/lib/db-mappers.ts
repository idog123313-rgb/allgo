// Snake_case Supabase row -> camelCase app model. Framework-agnostic (no
// "use client"), so both the browser store and server API routes share one
// copy instead of drifting apart.

import type { Availability, Participant, Plan, Preference, TripOption } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapPlan(row: any): Plan {
  return {
    id: row.id,
    shareCode: row.share_code,
    type: "trip",
    name: row.name,
    destinationIdea: row.destination_idea,
    dateRangeStart: row.date_range_start,
    dateRangeEnd: row.date_range_end,
    tripLengthNights: row.trip_length_nights,
    tripLengthFlexible: row.trip_length_flexible,
    departureLocation: row.departure_location,
    roomOccupancy: row.room_occupancy,
    organizerName: row.organizer_name,
    expectedParticipantNames: row.expected_participant_names ?? [],
    status: row.status,
    decidedOptionId: row.decided_option_id,
    decidedAt: row.decided_at,
    createdAt: row.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapParticipant(row: any): Participant {
  return {
    id: row.id,
    planId: row.plan_id,
    name: row.name,
    isOrganizer: row.is_organizer,
    respondedAt: row.responded_at,
    createdAt: row.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapAvailability(row: any): Availability {
  return {
    id: row.id,
    planId: row.plan_id,
    participantId: row.participant_id,
    flexible: row.flexible,
    days: row.days ?? {},
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapPreference(row: any): Preference {
  return {
    id: row.id,
    planId: row.plan_id,
    participantId: row.participant_id,
    budgetPerPerson: Number(row.budget_per_person),
    tripTypes: row.trip_types ?? [],
    flightPreference: row.flight_preference,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapTripOption(row: any): TripOption {
  return {
    id: row.id,
    planId: row.plan_id,
    name: row.name,
    destination: row.destination,
    imageEmoji: row.image_emoji,
    dateStart: row.date_start,
    dateEnd: row.date_end,
    flightEstimate: Number(row.flight_estimate),
    hotelEstimate: Number(row.hotel_estimate),
    otherEstimate: Number(row.other_estimate),
    externalLink: row.external_link,
    notes: row.notes,
    tripTypes: row.trip_types ?? [],
    provider: row.provider,
    priceType: row.price_type,
    searchedAt: row.searched_at,
    currency: row.currency,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapVote(row: any) {
  return {
    id: row.id,
    planId: row.plan_id,
    optionId: row.option_id,
    participantId: row.participant_id,
    value: row.value,
    updatedAt: row.updated_at,
  };
}
