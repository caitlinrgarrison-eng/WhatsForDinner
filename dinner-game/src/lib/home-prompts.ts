import type { RecommendationItem } from "@/lib/types";

const HOME_PROMPTS: RecommendationItem[] = [
  {
    id: "home-1",
    name: "Pasta Night Challenge",
    rating: 4.7,
    reviewCount: 0,
    priceLevel: 2,
    categories: ["Italian", "Comfort"],
    distanceMiles: 0,
    locationLabel: "At Home",
    reviewSnippet: "Creamy or tomato? Pick one and race the clock.",
    source: "home_prompt",
  },
  {
    id: "home-2",
    name: "Taco Tuesday Remix",
    rating: 4.8,
    reviewCount: 0,
    priceLevel: 2,
    categories: ["Mexican", "Quick"],
    distanceMiles: 0,
    locationLabel: "At Home",
    reviewSnippet: "Build-your-own tacos with a spicy challenge round.",
    source: "home_prompt",
  },
  {
    id: "home-3",
    name: "Stir Fry Speed Run",
    rating: 4.6,
    reviewCount: 0,
    priceLevel: 1,
    categories: ["Asian", "Healthy"],
    distanceMiles: 0,
    locationLabel: "At Home",
    reviewSnippet: "Use what you have and finish in under 25 minutes.",
    source: "home_prompt",
  },
];

export function getHomePrompts() {
  return HOME_PROMPTS;
}
