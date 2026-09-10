/**
 * Data model. Shaped to map 1:1 onto future Supabase tables (see README).
 * "Plan" is the generic concept — a trip is just the first Plan type the UI supports.
 */

export type PlanType = "trip";

export type DayStatus = "available" | "maybe" | "unavailable";

export type TripType =
  | "city"
  | "beach"
  | "nature"
  | "party"
  | "relaxing"
  | "food"
  | "adventure";

export type FlightPreference = "cheap" | "balanced" | "convenience";

export type VoteValue = "love" | "like" | "no";

export type PriceSource = "manual" | "provider";

export interface Plan {
  id: string;
  shareCode: string;
  type: PlanType;
  name: string;
  destinationIdea: string | null;
  dateRangeStart: string; // ISO date, e.g. "2026-10-01"
  dateRangeEnd: string; // ISO date
  tripLengthNights: number;
  tripLengthFlexible: boolean;
  departureLocation: string | null;
  organizerName: string;
  expectedParticipantNames: string[]; // optional, powers "waiting for" list
  status: "planning" | "decided";
  decidedOptionId: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface Participant {
  id: string;
  planId: string;
  name: string;
  isOrganizer: boolean;
  respondedAt: string | null; // set once they finish the join flow
  createdAt: string;
}

export interface Availability {
  id: string;
  planId: string;
  participantId: string;
  flexible: boolean; // "generally flexible" — counts as available every day
  days: Record<string, DayStatus>; // ISO date -> status, only for non-default days
  updatedAt: string;
}

export interface Preference {
  id: string;
  planId: string;
  participantId: string;
  budgetPerPerson: number; // ILS, estimated total per person
  tripTypes: TripType[];
  flightPreference: FlightPreference;
  updatedAt: string;
}

export interface TripOption {
  id: string;
  planId: string;
  name: string;
  destination: string;
  imageEmoji: string;
  dateStart: string | null;
  dateEnd: string | null;
  flightEstimate: number;
  hotelEstimate: number;
  otherEstimate: number;
  externalLink: string | null;
  notes: string | null;
  tripTypes: TripType[];
  priceSource: PriceSource;
  priceCheckedAt: string;
  createdBy: string | null; // participant id
  createdAt: string;
}

export interface Vote {
  id: string;
  planId: string;
  optionId: string;
  participantId: string;
  value: VoteValue;
  updatedAt: string;
}

export interface PlanBundle {
  plan: Plan;
  participants: Participant[];
  availabilities: Availability[];
  preferences: Preference[];
  options: TripOption[];
  votes: Vote[];
}

export const BUDGET_BANDS: { key: string; label: string; min: number; max: number | null }[] = [
  { key: "under1000", label: "Under ₪1,000", min: 0, max: 1000 },
  { key: "1000to1500", label: "₪1,000–₪1,500", min: 1000, max: 1500 },
  { key: "1500to2000", label: "₪1,500–₪2,000", min: 1500, max: 2000 },
  { key: "2000to2500", label: "₪2,000–₪2,500", min: 2000, max: 2500 },
  { key: "2500to3500", label: "₪2,500–₪3,500", min: 2500, max: 3500 },
  { key: "over3500", label: "₪3,500+", min: 3500, max: null },
];

export const TRIP_TYPE_OPTIONS: { value: TripType; label: string; emoji: string }[] = [
  { value: "city", label: "City", emoji: "🏙️" },
  { value: "beach", label: "Beach", emoji: "🏖️" },
  { value: "nature", label: "Nature", emoji: "🏔️" },
  { value: "party", label: "Party", emoji: "🎉" },
  { value: "relaxing", label: "Relaxing", emoji: "🧘" },
  { value: "food", label: "Food", emoji: "🍜" },
  { value: "adventure", label: "Adventure", emoji: "🧗" },
];

export const FLIGHT_PREFERENCE_OPTIONS: { value: FlightPreference; label: string; hint: string }[] = [
  { value: "cheap", label: "Cheap is most important", hint: "I'll take layovers for a better price" },
  { value: "balanced", label: "Balanced", hint: "Good mix of price and comfort" },
  { value: "convenience", label: "Convenience is most important", hint: "Direct flights, best times" },
];
