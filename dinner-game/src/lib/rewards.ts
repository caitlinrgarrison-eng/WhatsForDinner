import type { DinnerMode, RecommendationItem, RewardState } from "@/lib/types";

const DEFAULT_REWARDS: RewardState = {
  totalXp: 0,
  streakDays: 0,
  lastDecisionDate: null,
  badges: [],
};

function toDateOnly(isoString: string): string {
  return new Date(isoString).toISOString().slice(0, 10);
}

function daysBetween(currentDate: string, previousDate: string): number {
  const current = new Date(`${currentDate}T00:00:00Z`);
  const previous = new Date(`${previousDate}T00:00:00Z`);
  return Math.round((current.getTime() - previous.getTime()) / 86400000);
}

function deriveBadges(state: RewardState): string[] {
  const badges = new Set(state.badges);
  if (state.streakDays >= 7) badges.add("Decider 7");
  if (state.streakDays >= 14) badges.add("No-Argument Week");
  if (state.totalXp >= 300) badges.add("Dinner Strategist");
  return Array.from(badges);
}

export function getDefaultRewards(): RewardState {
  return { ...DEFAULT_REWARDS, badges: [] };
}

export function applyDecisionRewards(input: {
  previous: RewardState;
  mode: DinnerMode;
  chosenItem: RecommendationItem;
  rerolled: boolean;
  nowIso?: string;
}): RewardState {
  const now = input.nowIso ? toDateOnly(input.nowIso) : toDateOnly(new Date().toISOString());
  const prev = input.previous;

  let streakDays = 1;
  if (prev.lastDecisionDate) {
    const gap = daysBetween(now, prev.lastDecisionDate);
    if (gap === 0) streakDays = prev.streakDays;
    else if (gap === 1) streakDays = prev.streakDays + 1;
  }

  let xpDelta = 10;
  if (!input.rerolled) xpDelta += 5;
  if (input.mode === "eat_home") xpDelta += 3;
  if (input.chosenItem.categories.length > 1) xpDelta += 2;

  const nextState: RewardState = {
    totalXp: prev.totalXp + xpDelta,
    streakDays,
    lastDecisionDate: now,
    badges: prev.badges,
  };
  nextState.badges = deriveBadges(nextState);
  return nextState;
}
