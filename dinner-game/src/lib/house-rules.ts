import type { DinnerFilters } from "@/lib/types";

/** Merge active house rules into a copy used for the recommendation request. */
export function buildFiltersForSpin(base: DinnerFilters): DinnerFilters {
  const next: DinnerFilters = {
    ...base,
    searchBoostTerms: [...base.searchBoostTerms],
    houseRules: [...base.houseRules],
  };
  if (next.houseRules.includes("wildcard")) return next;
  if (next.houseRules.includes("cheap")) {
    next.maxPriceLevel = Math.min(next.maxPriceLevel, 2) as DinnerFilters["maxPriceLevel"];
  }
  if (next.houseRules.includes("family")) {
    next.minRating = Math.max(next.minRating, 4);
  }
  if (next.houseRules.includes("fast") && !next.searchBoostTerms.includes("quick")) {
    next.searchBoostTerms.push("quick");
  }
  if (next.houseRules.includes("treat")) {
    next.minRating = Math.max(next.minRating, 4);
  }
  if (next.houseRules.includes("healthy") && !next.searchBoostTerms.includes("healthy")) {
    next.searchBoostTerms.push("healthy");
  }
  if (next.houseRules.includes("date_night")) {
    next.minRating = Math.max(next.minRating, 4);
    if (!next.searchBoostTerms.includes("romantic")) next.searchBoostTerms.push("romantic");
  }
  if (next.houseRules.includes("girls_night_out")) {
    next.minRating = Math.max(next.minRating, 4);
    if (!next.searchBoostTerms.includes("trendy")) next.searchBoostTerms.push("trendy");
  }
  if (next.houseRules.includes("solo_adventure")) {
    if (!next.searchBoostTerms.includes("cozy")) next.searchBoostTerms.push("cozy");
  }
  return next;
}
