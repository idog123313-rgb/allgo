import type { DiscoveredDestination, HotelQuote, LivePriceQuote, TravelSearchProvider } from "./provider";

/**
 * Target shape for a real integration. Not wired up yet — there's no
 * production API key. `createTravelProvider()` (./index.ts) only returns
 * this when SKYSCANNER_API_KEY is set; otherwise the app runs on
 * mockTravelProvider automatically, so nothing breaks without credentials.
 *
 * Intended mapping (two-stage, per Skyscanner's own API design):
 *   discoverDestinations -> Flights Indicative Prices API
 *     (cheap, cacheable, used to find affordable destination/date combos —
 *     indicative prices are allowed to be estimates)
 *   searchHotels -> Hotels Search API, called only for the shortlist that
 *     discoverDestinations narrowed things down to
 *   refreshPrice -> Flights Live Prices API + Hotels Live Prices API,
 *     called only on explicit "Check latest price" or for finalists —
 *     never across the full candidate list (that's the expensive path).
 */
function requireKey(): string {
  const key = process.env.SKYSCANNER_API_KEY;
  if (!key) throw new Error("SKYSCANNER_API_KEY is not set");
  return key;
}

export const skyscannerTravelProvider: TravelSearchProvider = {
  id: "skyscanner",
  priceType: "indicative",

  async discoverDestinations(): Promise<DiscoveredDestination[]> {
    requireKey();
    // TODO: call Skyscanner's Flights Indicative Prices API with
    // (origin, date windows, cabin class) and map the response into
    // DiscoveredDestination[]. Left unimplemented until real credentials
    // and the exact response contract are available to test against.
    throw new Error("Skyscanner discovery is not implemented yet");
  },

  async searchHotels(): Promise<HotelQuote[]> {
    requireKey();
    // TODO: call the Hotels Search API for each shortlisted destination +
    // date window and sum room pricing into HotelQuote[].
    throw new Error("Skyscanner hotel search is not implemented yet");
  },

  async refreshPrice(): Promise<LivePriceQuote | null> {
    requireKey();
    // TODO: Flights Live Prices API + Hotels Live Prices API for this one
    // destination/date combo — the expensive, on-demand path.
    throw new Error("Skyscanner live refresh is not implemented yet");
  },
};
