import type { Scenario } from "./types";
import { cafePhrases } from "./cafe";
import { restaurantPhrases } from "./restaurant";
import { taxiPhrases } from "./taxi";
import { hotelPhrases } from "./hotel";
import { directionsPhrases } from "./directions";

export const SCENARIOS: Scenario[] = [
  {
    id: "cafe",
    title: "Café",
    titlePt: "Café",
    emoji: "☕",
    blurb: "Order coffee and a pastel de nata in a Lisbon café.",
    phrases: cafePhrases,
  },
  {
    id: "restaurant",
    title: "Restaurant",
    titlePt: "Restaurante",
    emoji: "🍽️",
    blurb: "Order dinner at a tasca in Bairro Alto.",
    phrases: restaurantPhrases,
  },
  {
    id: "taxi",
    title: "Taxi",
    titlePt: "Táxi",
    emoji: "🚖",
    blurb: "Get to the airport, a station, or a specific address.",
    phrases: taxiPhrases,
  },
  {
    id: "hotel",
    title: "Hotel check-in",
    titlePt: "Receção do hotel",
    emoji: "🏨",
    blurb: "Check in, ask about breakfast and Wi-Fi.",
    phrases: hotelPhrases,
  },
  {
    id: "directions",
    title: "Asking for directions",
    titlePt: "Pedir direções",
    emoji: "🗺️",
    blurb: "Find the metro, a famous spot, or a bus stop.",
    phrases: directionsPhrases,
  },
];

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
