import type { PriceSource, TripType } from "../types";

/**
 * Seam for swapping manual/mock pricing for a real flight+hotel search later
 * (Skyscanner, Duffel, a hotel API, ...) without touching the Trip Room.
 * Nothing in the app calls a provider yet for this pilot — trip options are
 * still entered by hand — this just keeps that door open.
 */

export interface TravelSearchParams {
  destinationIdea: string | null;
  dateStart: string;
  dateEnd: string;
  travelers: number;
}

export interface TravelSearchResultItem {
  name: string;
  destination: string;
  imageEmoji: string;
  flightEstimate: number;
  hotelEstimate: number;
  otherEstimate: number;
  externalLink: string | null;
  tripTypes: TripType[];
}

export interface RefreshedPrice {
  flightEstimate: number;
  hotelEstimate: number;
  otherEstimate: number;
}

export interface TravelProvider {
  readonly source: PriceSource;
  /** Find candidate destinations for a plan's search window. */
  searchTripOptions(params: TravelSearchParams): Promise<TravelSearchResultItem[]>;
  /** Re-check a specific option's price. */
  refreshOptionPrice(optionId: string): Promise<RefreshedPrice | null>;
}

/** This pilot's only provider — no live search, pricing stays manual. */
export const manualTravelProvider: TravelProvider = {
  source: "manual",
  async searchTripOptions() {
    return [];
  },
  async refreshOptionPrice() {
    return null;
  },
};
