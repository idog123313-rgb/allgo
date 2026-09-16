import type { TripType } from "../types";

/**
 * Server-side-only seam for automated trip discovery. Never imported from a
 * "use client" component — credentials for a real provider (Skyscanner, a
 * hotel API, ...) stay on the server and are never exposed to the browser.
 *
 * The funnel this supports (see search-orchestrator.ts):
 *   group constraints -> discoverDestinations (cheap/indicative) -> shortlist
 *   -> searchHotels (shortlist only) -> rank -> refreshPrice (live, on demand
 *   or for finalists only).
 */

export interface DateWindowInput {
  startIso: string;
  endIso: string;
  nights: number;
}

export interface SearchTripsInput {
  origin: string;
  dateWindows: DateWindowInput[];
  travelers: number;
  roomOccupancy: number;
  maxBudgetPerPerson: number;
  preferredTripTypes: TripType[];
}

export interface DiscoveredDestination {
  name: string;
  destination: string;
  imageEmoji: string;
  dateStart: string;
  dateEnd: string;
  flightPricePerPerson: number;
  tripTypes: TripType[];
}

export interface HotelQuote {
  name: string;
  dateStart: string;
  /** Total accommodation cost for the whole group's rooms over the stay. */
  totalAccommodationPrice: number;
}

export interface LivePriceQuote {
  flightPricePerPerson: number;
  totalAccommodationPrice: number;
}

export interface RefreshPriceInput {
  origin: string;
  destination: string;
  dateStart: string;
  dateEnd: string;
  travelers: number;
  roomOccupancy: number;
}

export interface TravelSearchProvider {
  readonly id: string;
  readonly priceType: "indicative" | "live";
  /** Cheap/cached lookup across many candidate destinations for the group's date windows. */
  discoverDestinations(input: SearchTripsInput): Promise<DiscoveredDestination[]>;
  /** Accommodation pricing — call only for the shortlisted destinations, not the full catalog. */
  searchHotels(input: SearchTripsInput, shortlist: DiscoveredDestination[]): Promise<HotelQuote[]>;
  /** Live re-check for a single, already-chosen destination + dates. */
  refreshPrice(input: RefreshPriceInput): Promise<LivePriceQuote | null>;
}

/** Manual entries never go through a provider — this exists only so callers have a uniform no-op. */
export const manualTravelProvider: TravelSearchProvider = {
  id: "manual",
  priceType: "indicative",
  async discoverDestinations() {
    return [];
  },
  async searchHotels() {
    return [];
  },
  async refreshPrice() {
    return null;
  },
};
