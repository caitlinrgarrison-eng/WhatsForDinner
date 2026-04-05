import { getDefaultRewards } from "@/lib/rewards";
import type { DinnerFilters, RecommendationItem, RestaurantFeedback, RewardState, UserFeedbackProfile } from "@/lib/types";

const FILTERS_KEY = "dinner_game_filters";
const REWARDS_KEY = "dinner_game_rewards";
const HISTORY_KEY = "dinner_game_history";
const FEEDBACK_KEY = "dinner_game_feedback_profiles";

export function getDefaultFilters(): DinnerFilters {
  return {
    protein: "any",
    cuisines: [],
    minRating: 3.5,
    maxPriceLevel: 4,
    maxDistanceMiles: 15,
    openNow: false,
    goodForDinner: false,
    reservationsPreferred: false,
    requireDelivery: false,
    requirePickup: false,
    houseRules: [],
    searchBoostTerms: [],
  };
}

function migrateFilters(raw: Record<string, unknown> | null): DinnerFilters {
  const d = getDefaultFilters();
  if (!raw || typeof raw !== "object") return d;

  const cuisines = Array.isArray(raw.cuisines) ? (raw.cuisines as string[]) : d.cuisines;
  const houseRules = Array.isArray(raw.houseRules) ? (raw.houseRules as string[]) : d.houseRules;
  const searchBoostTerms = Array.isArray(raw.searchBoostTerms)
    ? (raw.searchBoostTerms as string[])
    : d.searchBoostTerms;

  const maxPrice = raw.maxPriceLevel;
  const maxPL =
    maxPrice === 1 || maxPrice === 2 || maxPrice === 3 || maxPrice === 4 ? maxPrice : d.maxPriceLevel;

  return {
    protein: typeof raw.protein === "string" ? (raw.protein as DinnerFilters["protein"]) : d.protein,
    cuisines,
    minRating: typeof raw.minRating === "number" ? raw.minRating : d.minRating,
    maxPriceLevel: maxPL,
    maxDistanceMiles:
      typeof raw.maxDistanceMiles === "number" ? raw.maxDistanceMiles : d.maxDistanceMiles,
    openNow: typeof raw.openNow === "boolean" ? raw.openNow : d.openNow,
    goodForDinner: typeof raw.goodForDinner === "boolean" ? raw.goodForDinner : d.goodForDinner,
    reservationsPreferred:
      typeof raw.reservationsPreferred === "boolean"
        ? raw.reservationsPreferred
        : d.reservationsPreferred,
    requireDelivery:
      typeof raw.requireDelivery === "boolean" ? raw.requireDelivery : d.requireDelivery,
    requirePickup: typeof raw.requirePickup === "boolean" ? raw.requirePickup : d.requirePickup,
    houseRules,
    searchBoostTerms,
  };
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function dedupe(list: string[]): string[] {
  return Array.from(new Set(list.map((item) => item.trim()).filter(Boolean)));
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export function loadFilters(): DinnerFilters {
  const parsed = readJson<Record<string, unknown> | null>(FILTERS_KEY, null);
  return migrateFilters(parsed);
}

export function saveFilters(filters: DinnerFilters): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
}

export function loadRewards(): RewardState {
  return readJson(REWARDS_KEY, getDefaultRewards());
}

export function saveRewards(rewards: RewardState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REWARDS_KEY, JSON.stringify(rewards));
}

export function loadHistory(): RecommendationItem[] {
  return readJson(HISTORY_KEY, [] as RecommendationItem[]);
}

export function appendHistory(choice: RecommendationItem): void {
  const history = loadHistory();
  const next = [choice, ...history].slice(0, 20);
  if (typeof window === "undefined") return;
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

export function emptyFeedbackProfile(): UserFeedbackProfile {
  return {
    favoriteIds: [],
    declinedIds: [],
    favoriteNames: [],
    declinedNames: [],
  };
}

function readAllFeedbackProfiles(): Record<string, UserFeedbackProfile> {
  return readJson<Record<string, UserFeedbackProfile>>(FEEDBACK_KEY, {});
}

export function loadUserFeedbackProfile(userId: string | null): UserFeedbackProfile {
  if (!userId) return emptyFeedbackProfile();
  const all = readAllFeedbackProfiles();
  return all[userId] ?? emptyFeedbackProfile();
}

export function saveRestaurantFeedback(args: {
  userId: string;
  item: RecommendationItem;
  feedback: RestaurantFeedback;
}): UserFeedbackProfile {
  const { userId, item, feedback } = args;
  const all = readAllFeedbackProfiles();
  const current = all[userId] ?? emptyFeedbackProfile();
  const itemName = normalizeName(item.name);
  let next: UserFeedbackProfile;

  if (feedback === "favorite") {
    next = {
      favoriteIds: dedupe([...current.favoriteIds, item.id]),
      favoriteNames: dedupe([...current.favoriteNames, itemName]),
      declinedIds: current.declinedIds.filter((id) => id !== item.id),
      declinedNames: current.declinedNames.filter((name) => name !== itemName),
    };
  } else {
    next = {
      favoriteIds: current.favoriteIds.filter((id) => id !== item.id),
      favoriteNames: current.favoriteNames.filter((name) => name !== itemName),
      declinedIds: dedupe([...current.declinedIds, item.id]),
      declinedNames: dedupe([...current.declinedNames, itemName]),
    };
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(FEEDBACK_KEY, JSON.stringify({ ...all, [userId]: next }));
  }
  return next;
}
