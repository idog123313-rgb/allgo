import { CATALOG, jitter, resolveOriginIata } from "./catalog";
import type {
  DiscoveredDestination,
  HotelQuote,
  LivePriceQuote,
  RefreshPriceInput,
  SearchTripsInput,
  TravelSearchProvider,
} from "./provider";

const DUFFEL_BASE = "https://api.duffel.com";

// Duffel doesn't let you force a settlement currency on search, and Stays
// (hotels) isn't enabled without a sales conversation — see searchHotels
// below. Flight prices come back in whatever currency the airline settles
// in (EUR is common for this region); converting to ILS here keeps the rest
// of the app (budgets, matching, display) working in one currency without
// a wider refactor. Approximate, fixed rates — not live FX. Good enough for
// "does this fit the group's budget", not for anything transactional.
const FX_TO_ILS: Record<string, number> = {
  ILS: 1,
  EUR: 3.95,
  USD: 3.7,
  GBP: 4.6,
};

function toILS(amount: string, currency: string): number {
  const rate = FX_TO_ILS[currency] ?? 3.8;
  return Math.round(parseFloat(amount) * rate);
}

function requireKey(): string {
  const key = process.env.DUFFEL_API_KEY;
  if (!key) throw new Error("DUFFEL_API_KEY is not set");
  return key;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function searchCheapestRoundTrip(
  originIata: string,
  destinationIata: string,
  departureDate: string,
  returnDate: string,
  attempt = 0
): Promise<number | null> {
  const res = await fetch(`${DUFFEL_BASE}/air/offer_requests`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireKey()}`,
      "Duffel-Version": "v2",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      data: {
        slices: [
          { origin: originIata, destination: destinationIata, departure_date: departureDate },
          { origin: destinationIata, destination: originIata, departure_date: returnDate },
        ],
        passengers: [{ type: "adult" }],
        cabin_class: "economy",
      },
    }),
  });
  // Sandbox tokens rate-limit under concurrent discovery sweeps — a single
  // short backoff-and-retry recovers most 429s instead of silently dropping
  // that destination from the results.
  if (res.status === 429 && attempt < 2) {
    await sleep(400 * (attempt + 1));
    return searchCheapestRoundTrip(originIata, destinationIata, departureDate, returnDate, attempt + 1);
  }
  if (!res.ok) return null;
  const json = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const offers = (json?.data?.offers ?? []) as any[];
  if (offers.length === 0) return null;
  let cheapest = offers[0];
  for (const offer of offers) {
    if (parseFloat(offer.total_amount) < parseFloat(cheapest.total_amount)) cheapest = offer;
  }
  return toILS(cheapest.total_amount, cheapest.total_currency);
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R | null>): Promise<R[]> {
  const results: R[] = [];
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = items[index++];
      try {
        const result = await fn(current);
        if (result !== null && result !== undefined) results.push(result);
      } catch {
        // one route failing (unsellable in sandbox, rate limited, ...)
        // shouldn't take down the whole search — just skip it.
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export const duffelTravelProvider: TravelSearchProvider = {
  id: "duffel",
  // Flights are real search results; hotel pricing is still estimated
  // (Duffel Stays needs a sales conversation to enable) — "indicative"
  // honestly reflects that mix rather than claiming fully live pricing.
  priceType: "indicative",

  async discoverDestinations(input: SearchTripsInput): Promise<DiscoveredDestination[]> {
    const originIata = resolveOriginIata(input.origin);
    const candidates = CATALOG.filter(
      (entry) =>
        input.preferredTripTypes.length === 0 || entry.tripTypes.some((t) => input.preferredTripTypes.includes(t))
    );

    // Discovery is a live full flight search per call (Duffel has no
    // lightweight "indicative prices" endpoint), so it's the expensive step
    // in the funnel. Query only the single best-ranked date window per
    // destination here — one call per candidate instead of candidates x
    // windows — to cover many more destinations within the sandbox's rate
    // limit and keep the search fast. Other windows get their chance later,
    // on-demand, via "Check latest price" for whichever destination the
    // group actually leans toward.
    const bestWindow = input.dateWindows[0];
    const tasks = bestWindow ? candidates.map((entry) => ({ entry, window: bestWindow })) : [];

    const found = await mapWithConcurrency(tasks, 4, async ({ entry, window }) => {
      const flightPricePerPerson = await searchCheapestRoundTrip(originIata, entry.iataCode, window.startIso, window.endIso);
      if (flightPricePerPerson === null) return null;
      if (flightPricePerPerson > input.maxBudgetPerPerson * 0.6) return null;
      const result: DiscoveredDestination = {
        name: entry.name,
        destination: entry.destination,
        imageEmoji: entry.imageEmoji,
        dateStart: window.startIso,
        dateEnd: window.endIso,
        flightPricePerPerson,
        tripTypes: entry.tripTypes,
      };
      return result;
    });

    return found.sort((a, b) => a.flightPricePerPerson - b.flightPricePerPerson);
  },

  // Duffel Stays (hotels) requires enabling on the account via sales — falls
  // back to the same estimate the mock provider uses so search still
  // returns a usable total, just not a live-checked accommodation price.
  async searchHotels(input: SearchTripsInput, shortlist: DiscoveredDestination[]): Promise<HotelQuote[]> {
    const rooms = Math.max(1, Math.ceil(input.travelers / Math.max(1, input.roomOccupancy)));
    return shortlist.map((dest) => {
      const entry = CATALOG.find((c) => c.name === dest.name);
      const base = entry?.baseHotelPerRoomPerNight ?? 90;
      const nights = Math.max(
        1,
        Math.round((new Date(dest.dateEnd).getTime() - new Date(dest.dateStart).getTime()) / 86400000)
      );
      const perNight = jitter(`${dest.name}:${dest.dateStart}:hotel`, base);
      return { name: dest.name, dateStart: dest.dateStart, totalAccommodationPrice: perNight * nights * rooms };
    });
  },

  async refreshPrice(input: RefreshPriceInput): Promise<LivePriceQuote | null> {
    const originIata = resolveOriginIata(input.origin);
    const entry = CATALOG.find(
      (c) => c.name.toLowerCase() === input.destination.toLowerCase() || input.destination.toLowerCase().includes(c.name.toLowerCase())
    );
    if (!entry) return null;

    const flightPricePerPerson = await searchCheapestRoundTrip(originIata, entry.iataCode, input.dateStart, input.dateEnd);
    if (flightPricePerPerson === null) return null;

    const rooms = Math.max(1, Math.ceil(input.travelers / Math.max(1, input.roomOccupancy)));
    const nights = Math.max(
      1,
      Math.round((new Date(input.dateEnd).getTime() - new Date(input.dateStart).getTime()) / 86400000)
    );
    const perNight = jitter(`${entry.name}:${input.dateStart}:hotel:${Date.now()}`, entry.baseHotelPerRoomPerNight);

    return { flightPricePerPerson, totalAccommodationPrice: perNight * nights * rooms };
  },
};
