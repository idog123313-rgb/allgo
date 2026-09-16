import { computeBestDateWindows, computeOptionMatch } from "../planning";
import type { Availability, Participant, Plan, Preference, TripOption, TripType } from "../types";
import type { DiscoveredDestination, TravelSearchProvider } from "./provider";

export interface SearchCandidate {
  name: string;
  destination: string;
  imageEmoji: string;
  dateStart: string;
  dateEnd: string;
  flightEstimate: number;
  hotelEstimate: number;
  tripTypes: TripType[];
  matchPercent: number;
}

const SHORTLIST_SIZE = 8;
const RESULT_SIZE = 6;

/**
 * The funnel: group constraints -> cheap discovery across many destinations
 * -> shortlist -> hotel pricing only for the shortlist -> rank with the same
 * match scoring the rest of the app already uses -> top results.
 */
export async function runTripSearch(
  provider: TravelSearchProvider,
  plan: Plan,
  participants: Participant[],
  availabilities: Availability[],
  preferences: Preference[],
  existingOptions: TripOption[]
): Promise<SearchCandidate[]> {
  const dateWindows = computeBestDateWindows(plan, participants, availabilities, 5).map((w) => ({
    startIso: w.startIso,
    endIso: w.endIso,
    nights: plan.tripLengthNights,
  }));
  if (dateWindows.length === 0 || participants.length === 0) return [];

  const maxBudgetPerPerson = preferences.length > 0 ? Math.max(...preferences.map((p) => p.budgetPerPerson)) : 3000;
  const preferredTripTypes = Array.from(new Set(preferences.flatMap((p) => p.tripTypes)));

  const discovered = await provider.discoverDestinations({
    origin: plan.departureLocation ?? "",
    dateWindows,
    travelers: participants.length,
    roomOccupancy: plan.roomOccupancy,
    maxBudgetPerPerson,
    preferredTripTypes,
  });
  if (discovered.length === 0) return [];

  const existingNames = new Set(existingOptions.map((o) => o.name.toLowerCase()));
  const notAlreadyAdded = discovered.filter((d) => !existingNames.has(d.name.toLowerCase()));

  // Shortlist: cheapest window per destination, top N destinations by price.
  const cheapestPerDestination = new Map<string, DiscoveredDestination>();
  for (const d of notAlreadyAdded) {
    const current = cheapestPerDestination.get(d.name);
    if (!current || d.flightPricePerPerson < current.flightPricePerPerson) {
      cheapestPerDestination.set(d.name, d);
    }
  }
  const shortlist = Array.from(cheapestPerDestination.values())
    .sort((a, b) => a.flightPricePerPerson - b.flightPricePerPerson)
    .slice(0, SHORTLIST_SIZE);
  if (shortlist.length === 0) return [];

  const hotelQuotes = await provider.searchHotels(
    { origin: plan.departureLocation ?? "", dateWindows, travelers: participants.length, roomOccupancy: plan.roomOccupancy, maxBudgetPerPerson, preferredTripTypes },
    shortlist
  );
  const hotelByKey = new Map(hotelQuotes.map((h) => [`${h.name}:${h.dateStart}`, h]));

  const candidates: SearchCandidate[] = shortlist.map((d) => {
    const hotel = hotelByKey.get(`${d.name}:${d.dateStart}`);
    const hotelPerPerson = hotel ? Math.round(hotel.totalAccommodationPrice / participants.length) : 0;
    return {
      name: d.name,
      destination: d.destination,
      imageEmoji: d.imageEmoji,
      dateStart: d.dateStart,
      dateEnd: d.dateEnd,
      flightEstimate: d.flightPricePerPerson,
      hotelEstimate: hotelPerPerson,
      tripTypes: d.tripTypes,
      matchPercent: 0,
    };
  });

  // Score with the exact same engine the rest of the app uses to rank
  // options, so search results and manually-added options are directly
  // comparable.
  const scored = candidates.map((c) => {
    const pseudoOption: TripOption = {
      id: `candidate:${c.name}:${c.dateStart}`,
      planId: plan.id,
      name: c.name,
      destination: c.destination,
      imageEmoji: c.imageEmoji,
      dateStart: c.dateStart,
      dateEnd: c.dateEnd,
      flightEstimate: c.flightEstimate,
      hotelEstimate: c.hotelEstimate,
      otherEstimate: 0,
      externalLink: null,
      notes: null,
      tripTypes: c.tripTypes,
      provider: provider.id,
      priceType: provider.priceType,
      searchedAt: new Date().toISOString(),
      currency: "ILS",
      createdBy: null,
      createdAt: new Date().toISOString(),
    };
    const match = computeOptionMatch(pseudoOption, participants, availabilities, preferences, []);
    return { ...c, matchPercent: match.matchPercent };
  });

  scored.sort((a, b) => b.matchPercent - a.matchPercent);
  return scored.slice(0, RESULT_SIZE);
}
