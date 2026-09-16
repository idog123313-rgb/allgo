import type { TripType } from "../types";

export interface CatalogEntry {
  name: string;
  destination: string;
  /** IATA airport code — needed to query a real flight-search provider. */
  iataCode: string;
  imageEmoji: string;
  tripTypes: TripType[];
  baseFlightPerPerson: number;
  baseHotelPerRoomPerNight: number;
}

// Short-haul-from-Israel style catalog. Used as the candidate destination
// list for both the mock provider (fully made-up prices) and any real
// per-route provider like Duffel, which has no "cheapest destinations from
// X" endpoint of its own — it searches specific routes, so this list is
// what gets looped over.
export const CATALOG: CatalogEntry[] = [
  { name: "Athens", destination: "Greece", iataCode: "ATH", imageEmoji: "🏛️", tripTypes: ["city", "food", "party"], baseFlightPerPerson: 610, baseHotelPerRoomPerNight: 95 },
  { name: "Budapest", destination: "Hungary", iataCode: "BUD", imageEmoji: "🏙️", tripTypes: ["city", "party", "food"], baseFlightPerPerson: 520, baseHotelPerRoomPerNight: 78 },
  { name: "Barcelona", destination: "Spain", iataCode: "BCN", imageEmoji: "🏖️", tripTypes: ["city", "beach", "food", "party"], baseFlightPerPerson: 690, baseHotelPerRoomPerNight: 120 },
  { name: "Lisbon", destination: "Portugal", iataCode: "LIS", imageEmoji: "🌊", tripTypes: ["city", "beach", "food"], baseFlightPerPerson: 730, baseHotelPerRoomPerNight: 105 },
  { name: "Rome", destination: "Italy", iataCode: "FCO", imageEmoji: "🍝", tripTypes: ["city", "food"], baseFlightPerPerson: 640, baseHotelPerRoomPerNight: 115 },
  { name: "Prague", destination: "Czech Republic", iataCode: "PRG", imageEmoji: "🍺", tripTypes: ["city", "party", "food"], baseFlightPerPerson: 560, baseHotelPerRoomPerNight: 82 },
  { name: "Larnaca", destination: "Cyprus", iataCode: "LCA", imageEmoji: "🏝️", tripTypes: ["beach", "relaxing", "food"], baseFlightPerPerson: 410, baseHotelPerRoomPerNight: 92 },
  { name: "Milan", destination: "Italy", iataCode: "MXP", imageEmoji: "🛍️", tripTypes: ["city", "food"], baseFlightPerPerson: 630, baseHotelPerRoomPerNight: 118 },
  { name: "Thessaloniki", destination: "Greece", iataCode: "SKG", imageEmoji: "🌅", tripTypes: ["city", "food", "party"], baseFlightPerPerson: 470, baseHotelPerRoomPerNight: 72 },
  { name: "Vienna", destination: "Austria", iataCode: "VIE", imageEmoji: "🎻", tripTypes: ["city", "food"], baseFlightPerPerson: 600, baseHotelPerRoomPerNight: 110 },
  { name: "Berlin", destination: "Germany", iataCode: "BER", imageEmoji: "🎡", tripTypes: ["city", "party", "food"], baseFlightPerPerson: 650, baseHotelPerRoomPerNight: 98 },
  { name: "Amsterdam", destination: "Netherlands", iataCode: "AMS", imageEmoji: "🚲", tripTypes: ["city", "party", "food"], baseFlightPerPerson: 720, baseHotelPerRoomPerNight: 130 },
  { name: "Krakow", destination: "Poland", iataCode: "KRK", imageEmoji: "🏰", tripTypes: ["city", "party", "food"], baseFlightPerPerson: 480, baseHotelPerRoomPerNight: 68 },
  { name: "Sofia", destination: "Bulgaria", iataCode: "SOF", imageEmoji: "⛰️", tripTypes: ["city", "relaxing", "adventure"], baseFlightPerPerson: 420, baseHotelPerRoomPerNight: 60 },
  { name: "Tbilisi", destination: "Georgia", iataCode: "TBS", imageEmoji: "🍷", tripTypes: ["city", "food", "adventure"], baseFlightPerPerson: 540, baseHotelPerRoomPerNight: 65 },
  { name: "Split", destination: "Croatia", iataCode: "SPU", imageEmoji: "⛵", tripTypes: ["beach", "relaxing"], baseFlightPerPerson: 590, baseHotelPerRoomPerNight: 100 },
  { name: "Valencia", destination: "Spain", iataCode: "VLC", imageEmoji: "🏖️", tripTypes: ["city", "beach", "food"], baseFlightPerPerson: 670, baseHotelPerRoomPerNight: 95 },
  { name: "Porto", destination: "Portugal", iataCode: "OPO", imageEmoji: "🍷", tripTypes: ["city", "food", "relaxing"], baseFlightPerPerson: 710, baseHotelPerRoomPerNight: 90 },
  { name: "Paphos", destination: "Cyprus", iataCode: "PFO", imageEmoji: "🏝️", tripTypes: ["beach", "relaxing"], baseFlightPerPerson: 400, baseHotelPerRoomPerNight: 88 },
];

/** Free-text departure location -> best-guess IATA code. MVP-simple; a real
 * airport picker/autocomplete would replace this later. */
export function resolveOriginIata(departureLocation: string | null): string {
  const text = (departureLocation ?? "").toLowerCase();
  if (text.includes("eilat")) return "ETM";
  if (text.includes("haifa")) return "HFA";
  return "TLV"; // Tel Aviv default — covers "Tel Aviv" and any unrecognized input
}

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

/** Deterministic ±12% variation so the same destination/window always quotes the same indicative price. */
export function jitter(seed: string, base: number): number {
  const pct = ((hash(seed) % 25) - 12) / 100; // -0.12..0.12
  return Math.round(base * (1 + pct));
}
