import type { Scenario } from "./types";
import { cafePhrases } from "./cafe";
import { restaurantPhrases } from "./restaurant";
import { taxiPhrases } from "./taxi";
import { hotelPhrases } from "./hotel";
import { directionsPhrases } from "./directions";
import { pharmacyPhrases } from "./pharmacy";
import { smalltalkPhrases } from "./smalltalk";
import { boltPhrases } from "./bolt";
import { airbnbPhrases } from "./airbnb";
import { sintraPhrases } from "./sintra";
import { fortalezaPhrases } from "./fortaleza";
import { wineryPhrases } from "./winery";
import { lisboaPhrases } from "./lisboa";
import { beachPhrases } from "./beach";
import { lostPhrases } from "./lost";

export const SCENARIOS: Scenario[] = [
  // Trip-specific scenarios — see api/src/userContext.ts for the personal
  // context the personas reference.
  {
    id: "smalltalk",
    title: "Small talk",
    titlePt: "Conversa de circunstância",
    emoji: "💬",
    blurb: "Introduce yourself, work, family, your Portuguese journey, the trip.",
    phrases: smalltalkPhrases,
  },
  {
    id: "bolt",
    title: "Bolt ride",
    titlePt: "De Bolt",
    emoji: "🚗",
    blurb: "Airport to Estoril, around Cascais and Lisbon. Cashless small talk.",
    phrases: boltPhrases,
  },
  {
    id: "airbnb",
    title: "Airbnb check-in",
    titlePt: "Chegada ao Airbnb",
    emoji: "🏡",
    blurb: "Meeting the host in Estoril; keys, Wi-Fi, recommendations.",
    phrases: airbnbPhrases,
  },
  {
    id: "sintra",
    title: "Sintra palaces",
    titlePt: "Sintra",
    emoji: "🏰",
    blurb: "Tickets at Pena, the Moors' Castle, and Sintra-village treats.",
    phrases: sintraPhrases,
  },
  {
    id: "fortaleza",
    title: "Fortaleza do Guincho",
    titlePt: "Fortaleza do Guincho",
    emoji: "🥂",
    blurb: "Anniversary dinner, fine-dining etiquette, tasting menu.",
    phrases: fortalezaPhrases,
  },
  {
    id: "winery",
    title: "Winery tasting",
    titlePt: "Prova numa adega",
    emoji: "🍷",
    blurb: "Wine vocab, grape varieties, shipping bottles home.",
    phrases: wineryPhrases,
  },
  {
    id: "lisboa",
    title: "Lisboa sights",
    titlePt: "Lisboa",
    emoji: "🚋",
    blurb: "Tram 28, pastéis de Belém, miradouros, Fado, Alfama.",
    phrases: lisboaPhrases,
  },
  {
    id: "beach",
    title: "Beach day",
    titlePt: "Dia de praia",
    emoji: "🏖️",
    blurb: "Loungers, sun umbrella, lifeguard flags, beach bar.",
    phrases: beachPhrases,
  },
  {
    id: "lost",
    title: "Lost or stolen",
    titlePt: "Perdido ou roubado",
    emoji: "🚨",
    blurb: "Filing a police report, replacing a passport, calling the embassy.",
    phrases: lostPhrases,
  },

  // Generic everyday scenarios
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
  {
    id: "pharmacy",
    title: "Pharmacy",
    titlePt: "Farmácia",
    emoji: "💊",
    blurb: "Ask for medicine, describe symptoms, find a pharmacy on duty.",
    phrases: pharmacyPhrases,
  },
];

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
