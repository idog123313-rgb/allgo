import { differenceInCalendarDays, parseISO } from "date-fns";
import { CATALOG, jitter } from "./catalog";
import type {
  DiscoveredDestination,
  HotelQuote,
  LivePriceQuote,
  RefreshPriceInput,
  SearchTripsInput,
  TravelSearchProvider,
} from "./provider";

// Deterministic per (destination, date window) so repeated searches for the
// same plan don't jitter around; refreshPrice adds real randomness on top
// to simulate a live re-check.
export const mockTravelProvider: TravelSearchProvider = {
  id: "mock",
  priceType: "indicative",

  async discoverDestinations(input: SearchTripsInput): Promise<DiscoveredDestination[]> {
    const results: DiscoveredDestination[] = [];
    for (const entry of CATALOG) {
      const overlapsPreference =
        input.preferredTripTypes.length === 0 ||
        entry.tripTypes.some((t) => input.preferredTripTypes.includes(t));
      if (!overlapsPreference) continue;

      for (const window of input.dateWindows) {
        const seed = `${entry.name}:${window.startIso}`;
        const flightPricePerPerson = jitter(seed, entry.baseFlightPerPerson);
        // Discovery is about affordable destinations — skip ones already
        // blowing the group's ceiling on flight alone.
        if (flightPricePerPerson > input.maxBudgetPerPerson * 0.6) continue;

        results.push({
          name: entry.name,
          destination: entry.destination,
          imageEmoji: entry.imageEmoji,
          dateStart: window.startIso,
          dateEnd: window.endIso,
          flightPricePerPerson,
          tripTypes: entry.tripTypes,
        });
      }
    }
    return results.sort((a, b) => a.flightPricePerPerson - b.flightPricePerPerson);
  },

  async searchHotels(input: SearchTripsInput, shortlist: DiscoveredDestination[]): Promise<HotelQuote[]> {
    const rooms = Math.max(1, Math.ceil(input.travelers / Math.max(1, input.roomOccupancy)));
    return shortlist.map((dest) => {
      const entry = CATALOG.find((c) => c.name === dest.name)!;
      const nights = differenceInCalendarDays(parseISO(dest.dateEnd), parseISO(dest.dateStart));
      const perNight = jitter(`${dest.name}:${dest.dateStart}:hotel`, entry.baseHotelPerRoomPerNight);
      return {
        name: dest.name,
        dateStart: dest.dateStart,
        totalAccommodationPrice: perNight * Math.max(1, nights) * rooms,
      };
    });
  },

  async refreshPrice(input: RefreshPriceInput): Promise<LivePriceQuote | null> {
    const entry = CATALOG.find((c) => c.name.toLowerCase() === input.destination.toLowerCase() || input.destination.toLowerCase().includes(c.name.toLowerCase()));
    if (!entry) return null;
    const rooms = Math.max(1, Math.ceil(input.travelers / Math.max(1, input.roomOccupancy)));
    const nights = Math.max(1, differenceInCalendarDays(parseISO(input.dateEnd), parseISO(input.dateStart)));
    // Real randomness here (not the deterministic jitter) — a live check can
    // genuinely come back different from the last indicative quote.
    const liveNoise = () => 1 + (Math.random() * 0.16 - 0.08); // -8%..+8%
    return {
      flightPricePerPerson: Math.round(entry.baseFlightPerPerson * liveNoise()),
      totalAccommodationPrice: Math.round(entry.baseHotelPerRoomPerNight * liveNoise() * nights * rooms),
    };
  },
};
