import { mockTravelProvider } from "./mock-provider";
import { duffelTravelProvider } from "./duffel-provider";
import { skyscannerTravelProvider } from "./skyscanner-provider";
import type { TravelSearchProvider } from "./provider";

export * from "./provider";
export { manualTravelProvider } from "./provider";

/** Server-side only — picks a real provider when credentials exist, mock otherwise. */
export function createTravelProvider(): TravelSearchProvider {
  if (process.env.SKYSCANNER_API_KEY) return skyscannerTravelProvider;
  if (process.env.DUFFEL_API_KEY) return duffelTravelProvider;
  return mockTravelProvider;
}
