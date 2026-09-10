import type { TripType } from "./types";

/**
 * Preloaded demo destinations an organizer can add with one tap, with mock
 * pricing — stand-ins for a future live flight/hotel pricing integration.
 */
export interface DemoOption {
  name: string;
  destination: string;
  imageEmoji: string;
  flightEstimate: number;
  hotelEstimate: number;
  otherEstimate: number;
  tripTypes: TripType[];
}

export const DEMO_OPTIONS: DemoOption[] = [
  {
    name: "Athens",
    destination: "Greece",
    imageEmoji: "🏛️",
    flightEstimate: 620,
    hotelEstimate: 780,
    otherEstimate: 180,
    tripTypes: ["city", "food", "party"],
  },
  {
    name: "Budapest",
    destination: "Hungary",
    imageEmoji: "🏙️",
    flightEstimate: 540,
    hotelEstimate: 610,
    otherEstimate: 150,
    tripTypes: ["city", "party", "food"],
  },
  {
    name: "Mallorca",
    destination: "Spain",
    imageEmoji: "🏝️",
    flightEstimate: 690,
    hotelEstimate: 850,
    otherEstimate: 200,
    tripTypes: ["beach", "relaxing", "nature"],
  },
  {
    name: "Cyprus",
    destination: "Cyprus",
    imageEmoji: "🏖️",
    flightEstimate: 480,
    hotelEstimate: 720,
    otherEstimate: 160,
    tripTypes: ["beach", "relaxing", "adventure"],
  },
];
