import type { TripType } from "./types";

/**
 * Curated destination photography. Real trips will eventually pull this from
 * a proper image search/upload flow — for the MVP we match on keywords in
 * the option's name/destination text.
 */
const DESTINATION_IMAGES: { match: string[]; url: string }[] = [
  {
    match: ["athens", "greece", "acropolis"],
    url: "https://images.unsplash.com/photo-1555993539-1732b0258235?q=80&w=1200&auto=format&fit=crop",
  },
  {
    match: ["budapest", "hungary"],
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Hungarian_Parliament_Building_at_sunset%2C_2006_%2801%29.jpg/960px-Hungarian_Parliament_Building_at_sunset%2C_2006_%2801%29.jpg",
  },
  {
    match: ["mallorca", "palma", "majorca"],
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Palma_de_Mallorca%2C_Kathedrale_La_Seu_--_2009_--_5.jpg/960px-Palma_de_Mallorca%2C_Kathedrale_La_Seu_--_2009_--_5.jpg",
  },
  {
    match: ["cyprus", "ayia napa", "nicosia", "larnaca"],
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Nissi_Beach_at_Ayia_Napa%2C_Cyprus_-_panoramio_%282%29.jpg/960px-Nissi_Beach_at_Ayia_Napa%2C_Cyprus_-_panoramio_%282%29.jpg",
  },
];

const FALLBACK_IMAGE = DESTINATION_IMAGES[0].url;

export function getDestinationImage(name: string, destination: string): string {
  const haystack = `${name} ${destination}`.toLowerCase();
  const hit = DESTINATION_IMAGES.find((d) => d.match.some((kw) => haystack.includes(kw)));
  return hit?.url ?? FALLBACK_IMAGE;
}

export const TRIP_TYPE_IMAGES: Record<TripType, string> = {
  city: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Tokyo_Tower%2C_Minato_City.jpg/960px-Tokyo_Tower%2C_Minato_City.jpg",
  beach:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Anantara_Kihavah_-_Aerial_Hero_Shot_2024.jpg/960px-Anantara_Kihavah_-_Aerial_Hero_Shot_2024.jpg",
  nature:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Blushing_Peaks%2C_Shadow_Mountain_Lake_Sunrise%2C_CO_8-29-12_%288097275990%29.jpg/960px-Blushing_Peaks%2C_Shadow_Mountain_Lake_Sunrise%2C_CO_8-29-12_%288097275990%29.jpg",
  party:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Beach-Please-2022-crowd-stage-lights-night-performance.jpg/960px-Beach-Please-2022-crowd-stage-lights-night-performance.jpg",
  relaxing:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/People_in_hammocks_at_the_beach_of_the_Holbox_Island%2C_Mexico.jpg/960px-People_in_hammocks_at_the_beach_of_the_Holbox_Island%2C_Mexico.jpg",
  food: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/DZ6_1735_A_lively_nighttime_street_food_market_with_outdoor_tables_and_colorful_food_trucks_gathered_around_a_large_illuminated_tree.jpg/960px-DZ6_1735_A_lively_nighttime_street_food_market_with_outdoor_tables_and_colorful_food_trucks_gathered_around_a_large_illuminated_tree.jpg",
  adventure:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Itanda_Falls_%E2%80%93_Thunder_of_the_Nile.jpg/960px-Itanda_Falls_%E2%80%93_Thunder_of_the_Nile.jpg",
};
