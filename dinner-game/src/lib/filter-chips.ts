import { getDefaultFilters } from "@/lib/storage";
import type { DinnerFilters } from "@/lib/types";

const PROTEIN_LABELS: Record<DinnerFilters["protein"], string> = {
  any: "Any",
  no_meat: "No meat",
  chicken: "Chicken",
  beef: "Beef",
  seafood: "Seafood",
  vegetarian: "Vegetarian",
};

const HOUSE_RULE_LABELS: Record<string, string> = {
  cheap: "Cheap eats",
  family: "Family friendly",
  fast: "Fast",
  treat: "Treat yourself",
  healthy: "Healthy-ish",
  wildcard: "Total wildcard",
};

const HOUSE_RULE_ORDER = ["cheap", "family", "fast", "treat", "healthy", "wildcard"] as const;

export type ActiveFilterChip = {
  id: string;
  label: string;
  clear: (prev: DinnerFilters) => DinnerFilters;
};

/** Active filter pills for the wheel row — labels align with FilterPanel / quick rules. */
export function getActiveFilterChips(f: DinnerFilters): ActiveFilterChip[] {
  const d = getDefaultFilters();
  const out: ActiveFilterChip[] = [];

  if (f.requireDelivery) {
    out.push({
      id: "dining-delivery",
      label: "Delivery",
      clear: (prev) => ({ ...prev, requireDelivery: false }),
    });
  }
  if (f.requirePickup) {
    out.push({
      id: "dining-takeout",
      label: "Takeout",
      clear: (prev) => ({ ...prev, requirePickup: false }),
    });
  }

  if (f.maxPriceLevel !== d.maxPriceLevel) {
    out.push({
      id: `price-${f.maxPriceLevel}`,
      label: "$".repeat(f.maxPriceLevel),
      clear: (prev) => ({ ...prev, maxPriceLevel: d.maxPriceLevel }),
    });
  }

  for (const c of [...f.cuisines].sort((a, b) => a.localeCompare(b))) {
    out.push({
      id: `cuisine-${c}`,
      label: c,
      clear: (prev) => ({ ...prev, cuisines: prev.cuisines.filter((x) => x !== c) }),
    });
  }

  if (f.openNow) {
    out.push({
      id: "open-now",
      label: "Open now",
      clear: (prev) => ({ ...prev, openNow: false }),
    });
  }
  if (f.goodForDinner) {
    out.push({
      id: "good-dinner",
      label: "Good for dinner",
      clear: (prev) => ({ ...prev, goodForDinner: false }),
    });
  }
  if (f.reservationsPreferred) {
    out.push({
      id: "reservations",
      label: "Reservations",
      clear: (prev) => ({ ...prev, reservationsPreferred: false }),
    });
  }

  if (f.protein !== d.protein) {
    out.push({
      id: `protein-${f.protein}`,
      label: PROTEIN_LABELS[f.protein],
      clear: (prev) => ({ ...prev, protein: d.protein }),
    });
  }

  if (f.minRating !== d.minRating) {
    out.push({
      id: "min-rating",
      label: `${f.minRating.toFixed(1)}+ stars`,
      clear: (prev) => ({ ...prev, minRating: d.minRating }),
    });
  }

  if (f.maxDistanceMiles !== d.maxDistanceMiles) {
    out.push({
      id: "distance",
      label: `Within ${f.maxDistanceMiles} mi`,
      clear: (prev) => ({ ...prev, maxDistanceMiles: d.maxDistanceMiles }),
    });
  }

  const orderIndex = (id: string) => {
    const i = (HOUSE_RULE_ORDER as readonly string[]).indexOf(id);
    return i === -1 ? 999 : i;
  };
  for (const hr of [...f.houseRules].sort((a, b) => orderIndex(a) - orderIndex(b))) {
    out.push({
      id: `house-${hr}`,
      label: HOUSE_RULE_LABELS[hr] ?? hr,
      clear: (prev) => ({ ...prev, houseRules: prev.houseRules.filter((x) => x !== hr) }),
    });
  }

  return out;
}
