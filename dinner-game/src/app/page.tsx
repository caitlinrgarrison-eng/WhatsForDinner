"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { pickUniformRandomFrom } from "@/lib/pick-random";
import { FeaturedPickCard } from "@/components/FeaturedPickCard";
import { ShuffleReveal } from "@/components/ShuffleReveal";
import { applyDecisionRewards, getDefaultRewards } from "@/lib/rewards";
import {
  appendHistory,
  emptyFeedbackProfile,
  getDefaultFilters,
  loadFilters,
  loadUserFeedbackProfile,
  loadHistory,
  loadRewards,
  saveFilters,
  saveRewards,
} from "@/lib/storage";
import type {
  CompareAlternate,
  DinnerMode,
  DinnerFilters,
  RecommendationItem,
  UserFeedbackProfile,
  UserSession,
} from "@/lib/types";

const MODE_CARDS: { mode: DinnerMode; title: string; line: string; emoji: string }[] = [
  { mode: "eat_out", title: "Go out", line: "Somewhere worth leaving the house for", emoji: "🍽️" },
  { mode: "delivery", title: "Stay in", line: "Dinner shows up at your door", emoji: "🛵" },
  { mode: "takeout", title: "Grab & go", line: "Fast, easy, and on the way", emoji: "🥡" },
  { mode: "eat_home", title: "Cook something", line: "Use what you've got tonight", emoji: "🍳" },
];

/** Modes used when "Spin" picks randomly — exclude eat_home so Yelp/local results are used unless the user selects cook-at-home. */
const MODE_CARDS_SPIN_SURPRISE = MODE_CARDS.filter((c) => c.mode !== "eat_home");

const MODE_CTA_SUBLINE: Record<DinnerMode, string> = {
  eat_out: "Find a spot",
  delivery: "Order something",
  takeout: "Pick it up fast",
  eat_home: "Choose what to make",
};

const MOOD_CHIPS: { id: string; label: string; boost: string }[] = [
  { id: "cheap", label: "Cheap and easy", boost: "budget" },
  { id: "tired", label: "We're tired", boost: "easy" },
  { id: "family", label: "Family night", boost: "family" },
  { id: "fast", label: "Fast", boost: "quick" },
  { id: "treat", label: "Treat yourself", boost: "special" },
  { id: "healthy", label: "Healthy-ish", boost: "healthy" },
];

const CATEGORY_OPTIONS = [
  "New American",
  "Italian",
  "French",
  "Restaurants",
  "American",
  "Steakhouses",
  "Mexican",
  "Japanese",
  "Thai",
  "Mediterranean",
  "Chinese",
  "Indian",
  "Sushi Bars",
];
const FEATURE_OPTIONS = [
  { label: "Outdoor Seating", boost: "outdoor seating" },
  { label: "Good for Lunch", boost: "lunch" },
  { label: "Good for Kids", boost: "family friendly" },
  { label: "Good for Groups", boost: "good for groups" },
  { label: "Dogs Allowed", boost: "dogs allowed" },
  { label: "Full Bar", boost: "full bar" },
  { label: "Wheelchair Accessible", boost: "accessible" },
  { label: "Quiet", boost: "quiet" },
];
const DIETARY_OPTIONS: { label: string; boost: string; protein?: DinnerFilters["protein"] }[] = [
  { label: "Halal", boost: "halal" },
  { label: "Vegan", boost: "vegan", protein: "vegetarian" },
  { label: "Vegetarian", boost: "vegetarian", protein: "vegetarian" },
  { label: "Kosher", boost: "kosher" },
];
const DISTANCE_OPTIONS = [
  { label: "Bird's-eye View", miles: 25 },
  { label: "Driving (5 mi.)", miles: 5 },
  { label: "Biking (2 mi.)", miles: 2 },
  { label: "Walking (1 mi.)", miles: 1 },
  { label: "Within 4 blocks", miles: 0.5 },
] as const;
const SHUFFLE_STATUS_INTERVAL_MS = 420;
const DECIDE_MIN_SHUFFLE_MS = 1150;
const HERO_FOOD_TICKER = [
  "🌮 Tacos",
  "🍣 Sushi",
  "🍔 Burgers",
  "🍜 Ramen",
  "🍕 Pizza",
  "🍛 Curry",
  "🥗 Salads",
  "🍗 BBQ",
  "🥟 Dumplings",
  "🍝 Pasta",
  "🌯 Burritos",
  "🍤 Seafood",
];
const RESULT_PERSONALITY_LINES = ["Look at us, making decisions."];
const SESSION_KEYS = ["dinner_game_user_session", "whats_for_dinner_user_session", "user_session"];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function estMinutesForCompare(o: RecommendationItem, mode: DinnerMode | null): number {
  return mode === "delivery"
    ? Math.max(20, Math.min(55, Math.round(20 + o.distanceMiles * 7)))
    : mode === "takeout"
      ? Math.max(12, Math.min(35, Math.round(10 + o.distanceMiles * 5)))
      : o.distanceMiles;
}

function ratingOfItem(o: RecommendationItem): number {
  return o.yelpRating ?? o.googleRating ?? o.rating;
}

function buildCompareAlternates(
  selected: RecommendationItem,
  all: RecommendationItem[],
  mode: DinnerMode | null,
): CompareAlternate[] {
  const others = all.filter((o) => o.id !== selected.id);
  if (others.length === 0) return [];

  const estMins = (o: RecommendationItem) => estMinutesForCompare(o, mode);

  const fastest = [...others].sort((a, b) => estMins(a) - estMins(b))[0];
  const highestRated = [...others].sort((a, b) => ratingOfItem(b) - ratingOfItem(a))[0];
  const cheapest = [...others].sort((a, b) => a.priceLevel - b.priceLevel)[0];

  const detailFast = (o: RecommendationItem) => {
    const m = estMins(o);
    if (mode === "delivery") return `~${m}–${m + 8} min delivery`;
    if (mode === "takeout") return `~${m} min pickup`;
    return `${m.toFixed(1)} mi away`;
  };
  const detailRated = (o: RecommendationItem) => `${ratingOfItem(o).toFixed(1)}★ avg`;
  const detailPrice = (o: RecommendationItem) =>
    o.priceLevel ? `${"$".repeat(o.priceLevel)} · price` : "Price";

  const picks: CompareAlternate[] = [];
  const add = (item: RecommendationItem | undefined, reason: CompareAlternate["reason"], detail: string) => {
    if (!item) return;
    if (picks.some((p) => p.item.id === item.id)) return;
    picks.push({ item, reason, detail });
  };

  add(fastest, "Faster", detailFast(fastest));
  add(highestRated, "Higher rated", detailRated(highestRated));
  add(cheapest, "Lower price", detailPrice(cheapest));

  return picks.slice(0, 3);
}

function computeBestAtLabel(selected: RecommendationItem, all: RecommendationItem[], mode: DinnerMode | null): string {
  if (all.length < 2) return "";
  const estMins = (o: RecommendationItem) => estMinutesForCompare(o, mode);
  const ratingOf = (o: RecommendationItem) => ratingOfItem(o);

  const times = all.map(estMins);
  const ratings = all.map(ratingOf);
  const prices = all.map((o) => o.priceLevel);
  const minT = Math.min(...times);
  const maxR = Math.max(...ratings);
  const minP = Math.min(...prices);

  const t = estMins(selected);
  const r = ratingOf(selected);
  const p = selected.priceLevel;

  const countMinT = times.filter((x) => x === minT).length;
  if (t === minT && countMinT === 1) {
    return mode === "eat_out" ? "Closest in this set" : "Fastest in this set";
  }
  const countMaxR = ratings.filter((x) => x === maxR).length;
  if (r === maxR && countMaxR === 1) return "Highest rated in this set";
  const countMinP = prices.filter((x) => x === minP).length;
  if (p === minP && countMinP === 1) return "Best value in this set";

  if (t === minT) return mode === "eat_out" ? "Among the closest options" : "Among the fastest options";
  if (r === maxR) return "Among the highest rated";
  if (p === minP) return "Among the best value";
  return "Balanced pick for this set";
}

function loadSessionFromLocalStorage(): UserSession | null {
  if (typeof window === "undefined") return null;
  for (const key of SESSION_KEYS) {
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as Partial<UserSession>;
      if (parsed?.id && parsed?.email) {
        return {
          id: parsed.id,
          email: parsed.email,
          displayName: parsed.displayName ?? parsed.email.split("@")[0] ?? "Dinner friend",
        };
      }
    } catch {
      // no-op
    }
  }
  return null;
}

export default function Home() {
  const [mode, setMode] = useState<DinnerMode | null>(null);
  const [location, setLocation] = useState("");
  const [isLocationLocked, setIsLocationLocked] = useState(false);
  const [isAutoLocation, setIsAutoLocation] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filters, setFilters] = useState<DinnerFilters>(getDefaultFilters());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const [options, setOptions] = useState<RecommendationItem[]>([]);
  const [selected, setSelected] = useState<RecommendationItem | null>(null);
  const [history, setHistory] = useState<RecommendationItem[]>([]);
  const [rewards, setRewards] = useState(getDefaultRewards());
  const [isDeciding, setIsDeciding] = useState(false);
  const [shuffleStatusIndex, setShuffleStatusIndex] = useState(0);
  const [lockedPickId, setLockedPickId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [isMockData, setIsMockData] = useState(false);
  const [isLockCelebrating, setIsLockCelebrating] = useState(false);
  /** Briefly shows the previous result card fading out while shuffle runs (spin again). */
  const [spinAgainFade, setSpinAgainFade] = useState(false);
  const [surprisePulseMode, setSurprisePulseMode] = useState<DinnerMode | null>(null);
  const [session, setSession] = useState<UserSession | null>(null);
  const [feedbackProfile, setFeedbackProfile] = useState<UserFeedbackProfile>(emptyFeedbackProfile());
  const resultRef = useRef<HTMLElement | null>(null);
  const ctaModeFlashSkipRef = useRef(true);
  const [ctaModeFlash, setCtaModeFlash] = useState(false);

  useEffect(() => {
    setFilters(loadFilters());
    setRewards(loadRewards());
    setHistory(loadHistory());
    const loadedSession = loadSessionFromLocalStorage();
    setSession(loadedSession);
    setFeedbackProfile(loadedSession ? loadUserFeedbackProfile(loadedSession.id) : emptyFeedbackProfile());
  }, []);

  useEffect(() => {
    saveFilters(filters);
  }, [filters]);

  useEffect(() => {
    if (!isDeciding) {
      setShuffleStatusIndex(0);
      return;
    }
    const id = window.setInterval(() => {
      setShuffleStatusIndex((prev) => (prev + 1) % 3);
    }, SHUFFLE_STATUS_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [isDeciding]);

  useEffect(() => {
    if (!filtersOpen) {
      setDrawerVisible(false);
      return;
    }
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setDrawerVisible(true));
    });
    return () => cancelAnimationFrame(id);
  }, [filtersOpen]);

  useEffect(() => {
    if (!selected) return;
    window.setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 40);
  }, [selected]);

  useEffect(() => {
    const query = location.trim();
    if (!showSuggestions || query.length < 2 || isAutoLocation) {
      setLocationSuggestions([]);
      setIsSuggesting(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        setIsSuggesting(true);
        const res = await fetch(`/api/location-suggest?input=${encodeURIComponent(query)}`);
        const data = (await res.json()) as { suggestions?: string[] };
        if (cancelled) return;
        setLocationSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
      } catch {
        if (!cancelled) setLocationSuggestions([]);
      } finally {
        if (!cancelled) setIsSuggesting(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [location, showSuggestions, isAutoLocation]);

  useEffect(() => {
    if (ctaModeFlashSkipRef.current) {
      ctaModeFlashSkipRef.current = false;
      return;
    }
    setCtaModeFlash(true);
    const t = window.setTimeout(() => setCtaModeFlash(false), 620);
    return () => window.clearTimeout(t);
  }, [mode]);

  const selectedMoodLabels = useMemo(
    () => MOOD_CHIPS.filter((chip) => filters.houseRules.includes(chip.id)).map((chip) => chip.label),
    [filters.houseRules],
  );
  const resultPersonalityLine = useMemo(() => RESULT_PERSONALITY_LINES[0], []);
  const shuffleNamePool = useMemo(() => {
    const fromTicker = HERO_FOOD_TICKER.map((s) => s.replace(/^[^\s]+\s*/, "").trim());
    return [...CATEGORY_OPTIONS.slice(0, 8), ...MOOD_CHIPS.map((m) => m.label), ...fromTicker];
  }, []);
  const recentPick = history[0] ?? null;
  const recentPickCuisine = recentPick?.categories?.[0] ?? null;

  const closeFilters = () => {
    setDrawerVisible(false);
    window.setTimeout(() => setFiltersOpen(false), 300);
  };

  const surpriseMeAndDecide = () => {
    if (isDeciding) return;
    const card = pickUniformRandomFrom(MODE_CARDS);
    setMode(card.mode);
    setSurprisePulseMode(card.mode);
    window.setTimeout(() => setSurprisePulseMode(null), 520);
    void runDecision(card.mode);
  };

  const commitLocation = () => {
    const trimmed = location.trim();
    if (!trimmed) {
      setIsLocationLocked(false);
      setStatus("Enter a city, state, ZIP, or use your current location.");
      return;
    }
    setLocation(trimmed);
    setIsLocationLocked(true);
    setShowSuggestions(false);
    setStatus("Location secured and ready.");
  };

  const detectLocation = async () => {
    if (!navigator.geolocation) {
      setStatus(
        "This page needs https:// or localhost for GPS. Enter a city, state, or ZIP instead.",
      );
      return;
    }
    setStatus("Requesting your location… allow the browser prompt if you see one.");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const fallback = `${lat.toFixed(4)},${lng.toFixed(4)}`;
        setLocation(fallback);
        setIsLocationLocked(true);
        setIsAutoLocation(true);
        setShowSuggestions(false);
        setStatus("Looking up city name…");
        let display = fallback;
        try {
          const ctrl = new AbortController();
          const timeoutId = window.setTimeout(() => ctrl.abort(), 12000);
          const res = await fetch(
            `/api/reverse-geocode?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}`,
            { signal: ctrl.signal },
          ).finally(() => window.clearTimeout(timeoutId));
          const data = (await res.json()) as { label?: string | null };
          const label = data.label?.trim();
          if (label) {
            display = label;
            setLocation(label);
            setIsAutoLocation(false);
          }
        } catch {
          // keep coordinates already shown
        }
        const looksLikeLatLng = /^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(display.trim());
        setIsAutoLocation(looksLikeLatLng);
        setStatus("Location secured and ready.");
      },
      () => {
        setIsLocationLocked(false);
        setStatus("Location blocked or timed out. Enter city or ZIP, or allow location for this site.");
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 0 },
    );
  };

  const toggleMoodChip = (id: string, boostTerm: string) => {
    setFilters((prev) => {
      const isOn = prev.houseRules.includes(id);
      const nextRules = isOn ? prev.houseRules.filter((rule) => rule !== id) : [...prev.houseRules, id];
      const nextTerms = isOn
        ? prev.searchBoostTerms.filter((term) => term !== boostTerm)
        : [...prev.searchBoostTerms, boostTerm];
      return { ...prev, houseRules: nextRules, searchBoostTerms: nextTerms };
    });
  };

  const toggleCuisine = (cuisine: string) => {
    setFilters((prev) => {
      const isOn = prev.cuisines.includes(cuisine);
      const cuisines = isOn ? prev.cuisines.filter((c) => c !== cuisine) : [...prev.cuisines, cuisine];
      return { ...prev, cuisines };
    });
  };

  const toggleBoostTerm = (term: string) => {
    setFilters((prev) => {
      const isOn = prev.searchBoostTerms.includes(term);
      const searchBoostTerms = isOn ? prev.searchBoostTerms.filter((t) => t !== term) : [...prev.searchBoostTerms, term];
      return { ...prev, searchBoostTerms };
    });
  };

  const runDecision = async (modeOverride?: DinnerMode) => {
    const effectiveMode =
      modeOverride ??
      mode ??
      pickUniformRandomFrom(MODE_CARDS_SPIN_SURPRISE).mode;
    if (mode !== effectiveMode) setMode(effectiveMode);
    setStatus("");
    setIsDeciding(true);
    setSelected(null);
    setOptions([]);
    setLockedPickId(null);
    setIsLockCelebrating(false);

    try {
      const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
      const primaryData = (await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: effectiveMode,
          filters,
          location,
          feedback: session ? feedbackProfile : undefined,
        }),
      }).then((res) => res.json())) as { items?: RecommendationItem[]; mock?: boolean; message?: string };

      let items = (primaryData.items ?? []) as RecommendationItem[];
      let mockState = Boolean(primaryData.mock);
      let statusMessage = primaryData.message?.trim() ?? "";

      // If saved filters are too strict, retry once with relaxed defaults so the user always gets a pick.
      if (!items.length) {
        const relaxedFilters: DinnerFilters = {
          ...getDefaultFilters(),
          houseRules: filters.houseRules,
          searchBoostTerms: filters.searchBoostTerms,
        };
        const retryData = (await fetch("/api/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: effectiveMode,
            filters: relaxedFilters,
            location,
            feedback: session ? feedbackProfile : undefined,
          }),
        }).then((res) => res.json())) as { items?: RecommendationItem[]; mock?: boolean; message?: string };
        items = (retryData.items ?? []) as RecommendationItem[];
        mockState = Boolean(retryData.mock);
        if (retryData.message?.trim()) {
          statusMessage = retryData.message.trim();
        }
      }

      setOptions(items);
      setIsMockData(mockState);

      const elapsed = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
      if (elapsed < DECIDE_MIN_SHUFFLE_MS) {
        await delay(DECIDE_MIN_SHUFFLE_MS - elapsed);
      }

      if (!items.length) {
        setStatus(statusMessage || "No matches yet. Try changing cuisine or mood chips.");
        return;
      }

      const winner = pickUniformRandomFrom(items);
      setSelected(winner);
    } catch {
      setStatus("Couldn't decide right now. Try again.");
    } finally {
      setIsDeciding(false);
    }
  };

  const spinAgain = () => {
    if (options.length < 2 || !selected) return;
    setLockedPickId(null);
    setIsLockCelebrating(false);
    setSpinAgainFade(true);
    setIsDeciding(true);
    window.setTimeout(() => {
      const candidates = options.filter((item) => item.id !== selected.id);
      const pool = candidates.length ? candidates : options;
      setSelected(pickUniformRandomFrom(pool));
      setIsDeciding(false);
      setSpinAgainFade(false);
    }, DECIDE_MIN_SHUFFLE_MS);
  };

  const compareAlternates = useMemo(
    () => (selected ? buildCompareAlternates(selected, options, mode) : []),
    [selected, options, mode],
  );

  const bestAtLabel = useMemo(
    () => (selected && options.length >= 2 ? computeBestAtLabel(selected, options, mode) : ""),
    [selected, options, mode],
  );

  const commitPick = () => {
    if (!selected || !mode) return;
    if (lockedPickId === selected.id) return;
    const nextRewards = applyDecisionRewards({
      previous: rewards,
      mode,
      chosenItem: selected,
      rerolled: false,
    });
    setRewards(nextRewards);
    saveRewards(nextRewards);
    appendHistory(selected);
    setHistory(loadHistory());
    setLockedPickId(selected.id);
    setIsLockCelebrating(true);
    setStatus("Locked in. Enjoy tonight.");
    window.setTimeout(() => setIsLockCelebrating(false), 1200);
  };

  return (
    <div className="min-h-screen min-h-[100dvh] overflow-x-clip text-[var(--text-muted)]">
      <main className="mx-auto max-w-6xl pb-[max(7.5rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(2rem,env(safe-area-inset-top))] sm:pb-24 sm:pl-[max(2rem,env(safe-area-inset-left))] sm:pr-[max(2rem,env(safe-area-inset-right))] sm:pt-10">
        <div className="mb-7 sm:mb-8">
          <div className="flex flex-col gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--border)_85%,transparent)] bg-[color-mix(in_srgb,var(--surface-card)_96%,white)] px-4 py-3.5 shadow-[0_8px_28px_rgba(17,24,39,0.045)] sm:flex-row sm:items-center sm:gap-3 sm:rounded-full sm:px-3 sm:py-2.5 sm:pl-3.5 sm:pr-2.5">
            <form
              className="min-w-0 flex-1"
              onSubmit={(e) => {
                e.preventDefault();
                commitLocation();
              }}
            >
              <div className="min-w-0 space-y-2 sm:space-y-1.5">
                <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => void detectLocation()}
                    aria-label="Use my location"
                    title="Use my location"
                    className="btn-ghost inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--border)_70%,transparent)] bg-[color-mix(in_srgb,var(--surface-muted)_45%,white)] p-0 text-[var(--text)] shadow-[0_1px_2px_rgba(17,24,39,0.04)]"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-[1.05rem] w-[1.05rem]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 21s7-5.8 7-11a7 7 0 1 0-14 0c0 5.2 7 11 7 11Z" />
                      <circle cx="12" cy="10" r="2.5" />
                    </svg>
                  </button>
                  <div className="relative min-w-0 flex-1">
                    <input
                      value={location}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => {
                        window.setTimeout(() => setShowSuggestions(false), 120);
                      }}
                      onChange={(e) => {
                        setLocation(e.target.value);
                        setIsAutoLocation(false);
                        setIsLocationLocked(false);
                      }}
                      placeholder="City, state or ZIP"
                      className="h-10 w-full rounded-xl border border-[color-mix(in_srgb,var(--border)_55%,transparent)] bg-[color-mix(in_srgb,var(--surface-muted)_72%,white)] px-3.5 pr-11 text-sm text-[var(--text)] shadow-[inset_0_1px_2px_rgba(17,24,39,0.04)] placeholder:text-[color-mix(in_srgb,var(--text-muted)_75%,transparent)] focus:border-[var(--ring)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--ring)_35%,transparent)] sm:rounded-full"
                    />
                    <button
                      type="submit"
                      aria-label="Save location"
                      className="btn-ghost absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full p-0 text-sm leading-none"
                      style={
                        isLocationLocked
                          ? {
                              color: "var(--select)",
                              borderColor: "color-mix(in srgb, var(--select) 38%, var(--border))",
                              background: "color-mix(in srgb, var(--select) 10%, #ffffff)",
                            }
                          : undefined
                      }
                    >
                      ✓
                    </button>
                    {showSuggestions && (locationSuggestions.length > 0 || isSuggesting) ? (
                      <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-20 max-h-[min(16rem,45vh)] overflow-y-auto overflow-x-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-card)] shadow-[var(--shadow-soft)]">
                        {isSuggesting && !locationSuggestions.length ? (
                          <p className="px-3.5 py-2 text-xs text-[var(--label-muted)]">Finding places...</p>
                        ) : (
                          <ul className="py-1">
                            {locationSuggestions.map((suggestion) => (
                              <li key={suggestion}>
                                <button
                                  type="button"
                                  className="w-full px-3.5 py-2 text-left text-sm text-[var(--text)] hover:bg-[var(--surface-muted)]"
                                  onClick={() => {
                                    setLocation(suggestion);
                                    setIsAutoLocation(false);
                                    setIsLocationLocked(true);
                                    setShowSuggestions(false);
                                    setStatus("Location secured and ready.");
                                  }}
                                >
                                  {suggestion}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => setFiltersOpen(true)}
                    className="btn-ghost inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--border)_70%,transparent)] bg-[color-mix(in_srgb,var(--surface-muted)_45%,white)] p-0 text-[var(--text)] shadow-[0_1px_2px_rgba(17,24,39,0.04)] lg:hidden"
                    aria-label="Open menu, filters, and account"
                  >
                    <svg aria-hidden className="h-[1.15rem] w-[1.15rem]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M4 7h16M4 12h16M4 17h16" />
                    </svg>
                  </button>
                </div>
                {!isLocationLocked ? (
                  <p className="text-center text-[11px] leading-relaxed text-[var(--label-muted)] text-balance sm:pl-12 sm:text-left">
                    Set a location to get nearby restaurant picks.
                  </p>
                ) : null}
              </div>
            </form>
          </div>
          {!isDeciding && status ? (
            <p className="mt-2.5 px-1 text-xs text-[var(--text-muted)]" role="status" aria-live="polite">
              {status}
            </p>
          ) : null}
        </div>

        <div className="hero-decision-flow flex flex-col">
          <header className="hero-action-zone order-1 mb-4 text-center sm:mb-5">
            <h1 className="font-display text-[2.125rem] leading-[1.15] tracking-tight text-[var(--text)] sm:text-6xl sm:leading-none">
              Let&apos;s end dinner chaos.
            </h1>
            <p className="mx-auto mt-3 max-w-md text-[0.9375rem] leading-relaxed text-[var(--text-muted)] sm:mt-2.5 sm:leading-snug">
              You pick the vibe. We do the hard part.
            </p>
          </header>

          <section className="vibe-mode-panel order-3 mb-5 rounded-[1.45rem] border border-[color-mix(in_srgb,var(--border)_48%,white)] bg-[color-mix(in_srgb,var(--surface-card)_97%,white)] px-5 py-6 shadow-[0_8px_32px_rgba(17,24,39,0.032)] sm:order-2 sm:mb-6 sm:px-7 sm:py-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div className="min-w-0 text-center sm:text-left">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[color-mix(in_srgb,var(--primary-to)_55%,var(--text-muted))]">
                  <span className="sm:hidden">Want more control? </span>Pick your vibe
                </p>
                <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-[var(--text-muted)] sm:mx-0 sm:mt-1.5 sm:max-w-[20rem] sm:text-[0.8125rem]">
                  <span className="sm:hidden">Fine-tune mood, filters, or how you eat — or leave it as-is.</span>
                  <span className="hidden sm:inline">Choose a vibe, or skip it. We&apos;ll decide.</span>
                </p>
              </div>
              <div className="hidden shrink-0 flex-wrap items-start justify-end gap-x-2.5 gap-y-2.5 sm:flex">
                <div className="flex flex-col items-start gap-0.5">
                  <button
                    type="button"
                    onClick={surpriseMeAndDecide}
                    disabled={isDeciding}
                    className="surprise-chip surprise-chip--lead group inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--primary-to)_34%,var(--border))] bg-[color-mix(in_srgb,var(--primary-to)_10%,white)] px-3.5 py-1.5 text-[11px] font-semibold tracking-wide text-[color-mix(in_srgb,var(--primary-to)_88%,var(--text))] shadow-[0_2px_10px_color-mix(in_srgb,var(--primary-to)_14%,transparent)] transition hover:border-[color-mix(in_srgb,var(--primary-to)_48%,var(--border))] hover:bg-[color-mix(in_srgb,var(--primary-to)_14%,white)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary-to)_38%,transparent)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-55"
                  >
                    <span aria-hidden className="surprise-chip__spark text-[0.85rem] transition-transform duration-300 ease-out group-hover:-rotate-12 group-hover:scale-110">
                      ✦
                    </span>
                    Surprise me
                  </button>
                  <span className="pl-1 text-[10px] font-medium leading-tight text-[color-mix(in_srgb,var(--label-muted)_88%,transparent)]">
                    Vibe + dinner in one tap
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFiltersOpen(true)}
                  className="surprise-chip inline-flex items-center gap-1.5 self-start rounded-full border border-[color-mix(in_srgb,var(--primary-to)_24%,var(--border))] bg-[color-mix(in_srgb,var(--primary-to)_6%,white)] px-3.5 py-1.5 text-[11px] font-semibold tracking-wide text-[color-mix(in_srgb,var(--primary-to)_82%,var(--text))] shadow-[0_1px_4px_color-mix(in_srgb,var(--primary-to)_8%,transparent)] transition hover:border-[color-mix(in_srgb,var(--primary-to)_38%,var(--border))] hover:bg-[color-mix(in_srgb,var(--primary-to)_10%,white)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary-to)_38%,transparent)] focus-visible:ring-offset-2"
                  aria-label="Open filters: cuisine, price, distance, dietary, and more"
                >
                  <span className="inline-flex h-[0.85rem] w-[0.85rem] shrink-0 items-center justify-center text-[color-mix(in_srgb,var(--primary-to)_90%,var(--text))]" aria-hidden>
                    <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="4" x2="4" y1="21" y2="14" />
                      <line x1="4" x2="4" y1="10" y2="3" />
                      <line x1="12" x2="12" y1="21" y2="12" />
                      <line x1="12" x2="12" y1="8" y2="3" />
                      <line x1="20" x2="20" y1="21" y2="16" />
                      <line x1="20" x2="20" y1="12" y2="3" />
                      <line x1="2" x2="6" y1="14" y2="14" />
                      <line x1="10" x2="14" y1="8" y2="8" />
                      <line x1="18" x2="22" y1="16" y2="16" />
                    </svg>
                  </span>
                  Tune it
                </button>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:hidden">
              <button
                type="button"
                onClick={surpriseMeAndDecide}
                disabled={isDeciding}
                className="surprise-chip surprise-chip--lead group inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--primary-to)_34%,var(--border))] bg-[color-mix(in_srgb,var(--primary-to)_10%,white)] px-4 py-3 text-xs font-semibold tracking-wide text-[color-mix(in_srgb,var(--primary-to)_88%,var(--text))] shadow-[0_2px_10px_color-mix(in_srgb,var(--primary-to)_14%,transparent)] transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary-to)_38%,transparent)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-55"
              >
                <span aria-hidden className="text-[0.95rem] transition-transform duration-300 ease-out group-hover:-rotate-12 group-hover:scale-110">
                  ✦
                </span>
                Surprise me
              </button>
              <p className="text-center text-[10px] font-medium leading-snug text-[color-mix(in_srgb,var(--label-muted)_90%,transparent)]">
                One tap: random vibe, then tonight&apos;s pick.
              </p>
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="surprise-chip inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--primary-to)_24%,var(--border))] bg-[color-mix(in_srgb,var(--primary-to)_6%,white)] px-4 py-3 text-xs font-semibold tracking-wide text-[color-mix(in_srgb,var(--primary-to)_82%,var(--text))] shadow-[0_1px_4px_color-mix(in_srgb,var(--primary-to)_8%,transparent)] transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary-to)_38%,transparent)] focus-visible:ring-offset-2"
                aria-label="Open filters: cuisine, price, distance, dietary, and more"
              >
                <span className="inline-flex h-[0.9rem] w-[0.9rem] shrink-0 items-center justify-center text-[color-mix(in_srgb,var(--primary-to)_90%,var(--text))]" aria-hidden>
                  <svg viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" x2="4" y1="21" y2="14" />
                    <line x1="4" x2="4" y1="10" y2="3" />
                    <line x1="12" x2="12" y1="21" y2="12" />
                    <line x1="12" x2="12" y1="8" y2="3" />
                    <line x1="20" x2="20" y1="21" y2="16" />
                    <line x1="20" x2="20" y1="12" y2="3" />
                    <line x1="2" x2="6" y1="14" y2="14" />
                    <line x1="10" x2="14" y1="8" y2="8" />
                    <line x1="18" x2="22" y1="16" y2="16" />
                  </svg>
                </span>
                Tune it
              </button>
            </div>
            <p className="mt-4 hidden text-[11px] leading-snug text-[color-mix(in_srgb,var(--label-muted)_88%,transparent)] sm:mt-3.5 sm:block">
              Fine tune anytime — set preferences when you want more control.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-4 text-left sm:mt-5 sm:grid-cols-4 sm:gap-3.5">
              {MODE_CARDS.map((card) => {
                const active = mode === card.mode;
                const pulsing = surprisePulseMode === card.mode;
                return (
                  <button
                    key={`mode-${card.mode}`}
                    type="button"
                    onClick={() => setMode(card.mode)}
                    aria-pressed={active}
                    className={[
                      "mode-vibe-card group rounded-[1rem] border px-3.5 py-3.5 text-left transition duration-200 will-change-transform sm:px-3.5 sm:py-3.5",
                      `mode-vibe-card--${card.mode}`,
                      active ? "mode-vibe-card--selected" : "",
                      pulsing ? "mode-vibe-card--pulse" : "",
                    ].join(" ")}
                  >
                    <p className="text-[0.9375rem] font-semibold leading-tight text-[var(--text)] transition-colors group-hover:text-[var(--text)]">
                      <span className="mr-1.5 inline-block transition-transform duration-200 group-hover:scale-110" aria-hidden>
                        {card.emoji}
                      </span>
                      {card.title}
                    </p>
                    <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-muted)] group-hover:text-[color-mix(in_srgb,var(--text-muted)_92%,var(--text))] sm:mt-1.5 sm:leading-snug">
                      {card.line}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="hero-vibe-bridge order-4 mx-auto mb-3 hidden max-w-3xl sm:order-3 sm:mb-3 sm:block" aria-hidden />

          <div className="hero-cta-wrap order-2 mx-auto mb-6 max-w-3xl text-center sm:order-4 sm:mb-10">
          <div className="relative mx-auto w-full max-w-md px-0 sm:px-0">
            <span
              className={[
                "decide-cta__pulse-ring pointer-events-none absolute inset-[-6px] z-0 rounded-full",
                ctaModeFlash ? "decide-cta__pulse-ring--on" : "",
              ].join(" ")}
              aria-hidden
            />
            <button
              type="button"
              onClick={() => void runDecision()}
              disabled={isDeciding}
              className={[
                "btn-primary-gradient decide-cta relative z-[1] inline-flex w-full max-w-full items-center justify-center rounded-full px-5 py-[1.05rem] text-lg font-bold sm:px-10",
                "min-h-[3.95rem]",
                isDeciding ? "decide-button--loading pointer-events-none" : "",
                mode && !isDeciding ? "decide-cta--vibe-ready" : "",
              ].join(" ")}
            >
            <span className="decide-cta__label-wrap">
              <span className="decide-cta__label">{isDeciding ? "Making the call…" : "Decide dinner"}</span>
              {!isDeciding ? (
                <AnimatePresence mode="wait">
                  <motion.span
                    key={mode ?? "skip"}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 0.94, y: 0 }}
                    exit={{ opacity: 0, y: -3 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className={[
                      "decide-cta__subline",
                      mode ? "decide-cta__subline--vibe decide-cta__subline--mode" : "decide-cta__subline--hint",
                    ].join(" ")}
                  >
                    {mode ? MODE_CTA_SUBLINE[mode] : "We'll pick a mode if you skip"}
                  </motion.span>
                </AnimatePresence>
              ) : null}
            </span>
            </button>
          </div>
          <p className="mt-2 text-center text-[0.68rem] font-semibold tracking-[0.08em] text-[var(--label-muted)]">
            ~1 second of anticipation. Then you eat.
          </p>
          <div className="food-ticker-shell food-ticker-shell--support mx-auto mt-2 max-w-3xl">
            <div className="food-ticker-track" aria-label="Popular food options" aria-live="off">
              {[...HERO_FOOD_TICKER, ...HERO_FOOD_TICKER].map((chip, idx) => (
                <span key={`${chip}-${idx}`} className="food-ticker-pill">
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>
        </div>

        <section
          ref={selected ? resultRef : null}
          className={[
            "flow-panel mt-2",
            selected ? "result-reveal-moment result-reveal-moment--win" : "",
          ].join(" ")}
        >
          {isDeciding ? (
            <div className="relative mx-auto max-w-4xl">
              <ShuffleReveal
                active
                candidateNames={options.length > 0 ? options.map((o) => o.name) : shuffleNamePool}
                statusIndex={shuffleStatusIndex}
              />
              {spinAgainFade && selected ? (
                <motion.div
                  className="pointer-events-none absolute left-0 right-0 top-0 z-20 mx-auto w-full max-w-4xl"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                  onAnimationComplete={() => setSpinAgainFade(false)}
                >
                  <div className="result-unified-shell relative overflow-hidden rounded-3xl border border-[color-mix(in_srgb,var(--gold)_34%,var(--border))] bg-[var(--surface-card)] shadow-[var(--shadow-lift)]">
                    <div className="result-reward-glow pointer-events-none absolute inset-0 rounded-3xl" aria-hidden />
                    <div className="glow-ambient-ring pointer-events-none absolute inset-0 rounded-3xl" />
                    <div className="relative z-10 px-5 py-7 sm:px-8 sm:py-9">
                      <p className="text-center text-[0.65rem] uppercase tracking-[0.16em] text-[var(--label-muted)]">
                        Tonight&apos;s decision
                      </p>
                      <p className="mt-3 text-center text-[1.05rem] font-medium text-[var(--text-muted)]">Dinner handled.</p>
                      <p className="mt-3 text-center text-sm text-[color-mix(in_srgb,var(--label-muted)_74%,transparent)]">
                        {resultPersonalityLine}
                      </p>
                      <div className="mt-7">
                        <FeaturedPickCard
                          key={selected.id}
                          item={selected}
                          mode={mode ?? undefined}
                          vibeLabel={selectedMoodLabels[0] ?? "Curated"}
                          isHomeMeal={mode === "eat_home"}
                          compareAlternates={[]}
                          bestAtLabel=""
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </div>
          ) : selected ? (
            <div className="result-unified-shell relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-[color-mix(in_srgb,var(--gold)_34%,var(--border))] bg-[var(--surface-card)] shadow-[var(--shadow-lift)]">
              <div className="result-reward-glow pointer-events-none absolute inset-0 rounded-3xl" aria-hidden />
              <div className="glow-ambient-ring pointer-events-none absolute inset-0 rounded-3xl" />
              <div className="relative z-10 px-5 py-7 sm:px-8 sm:py-9">
                <p className="text-center text-[0.65rem] uppercase tracking-[0.16em] text-[var(--label-muted)]">Tonight&apos;s decision</p>
                <p className="mt-3 text-center text-[1.05rem] font-medium text-[var(--text-muted)]">Dinner handled.</p>
                <p className="mt-3 text-center text-sm text-[color-mix(in_srgb,var(--label-muted)_74%,transparent)]">{resultPersonalityLine}</p>
                <div className="mt-7">
                  <FeaturedPickCard
                    key={selected.id}
                    item={selected}
                    mode={mode ?? undefined}
                    vibeLabel={selectedMoodLabels[0] ?? "Curated"}
                    winnerPulse
                    isHomeMeal={mode === "eat_home"}
                    onSpinAgain={spinAgain}
                    canSpinAgain={options.length >= 2}
                    onLockIn={commitPick}
                    isLockedToPick={lockedPickId === selected.id}
                    isLockCelebrating={isLockCelebrating}
                    compareAlternates={compareAlternates}
                    bestAtLabel={bestAtLabel}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[1.25rem] border border-[color-mix(in_srgb,var(--border)_86%,white)] bg-[color-mix(in_srgb,var(--surface-card)_94%,var(--surface-muted))] px-5 pb-14 pt-11 text-center shadow-[0_10px_24px_rgba(17,24,39,0.03)] sm:px-8 sm:pb-16 sm:pt-12">
              <div className="pointer-events-none absolute -bottom-6 left-1/2 z-0 h-36 w-[26rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.28),rgba(251,191,36,0.08)_45%,transparent_76%)] blur-[34px]" />
              <div className="pointer-events-none absolute -bottom-4 left-[34%] z-0 h-40 w-[18rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(168,85,247,0.28),rgba(168,85,247,0.1)_40%,transparent_76%)] blur-[34px]" />
              <div className="pointer-events-none absolute -bottom-4 left-[66%] z-0 h-40 w-[18rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(244,114,182,0.25),rgba(244,114,182,0.09)_40%,transparent_76%)] blur-[34px]" />
              <p className="relative z-10 text-[0.67rem] font-semibold uppercase tracking-[0.16em] text-[var(--primary-to)]">Ready when you are</p>
              <p className="relative z-10 mt-4 font-display text-[2.1rem] leading-[1.12] text-[var(--text)] sm:text-[3rem]">
                Hit decide. We&apos;ll handle the drama.
              </p>
              <p className="relative z-10 mt-2.5 text-[0.97rem] font-medium text-[color-mix(in_srgb,var(--text-muted)_92%,white)]">
                One clear action. A quick shuffle. A real pick.
              </p>
              <div className="relative z-10 mx-auto mt-10 w-[min(78%,25rem)] rounded-[1.05rem] border border-[color-mix(in_srgb,var(--border)_76%,transparent)] bg-[color-mix(in_srgb,var(--surface-card)_96%,white)] px-5 py-5 shadow-[0_12px_28px_rgba(17,24,39,0.06)] sm:mt-12">
                <div className="h-3 w-40 rounded-full bg-[color-mix(in_srgb,var(--text-muted)_10%,transparent)] blur-[0.2px]" />
                <div className="mt-3 h-2.5 w-[92%] rounded-full bg-[color-mix(in_srgb,var(--text-muted)_10%,transparent)]" />
                <div className="mt-2 h-2.5 w-[64%] rounded-full bg-[color-mix(in_srgb,var(--text-muted)_8%,transparent)]" />
              </div>
            </div>
          )}
        </section>

        {isMockData ? (
          <p className="mx-auto mt-3 max-w-lg text-center text-xs text-[var(--text-muted)]">
            Running on demo picks right now. Add Yelp credentials for real local spots.
          </p>
        ) : null}

        <section className="mt-14 border-t border-[color-mix(in_srgb,var(--border)_45%,transparent)] pt-9">
          <h4 className="font-display text-center text-lg text-[var(--text)]">Recent wins</h4>
          <ul className="mx-auto mt-6 grid max-w-3xl gap-3">
            {history.slice(0, 6).length ? (
              history.slice(0, 6).map((item, idx) => (
                <li key={`${item.id}-${idx}`} className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] px-4 py-3 text-sm">
                  <span className="text-[var(--text)]">{item.name}</span>
                  <span> · {item.categories.join(", ")}</span>
                </li>
              ))
            ) : (
              <li className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] py-10 text-center text-sm">
                No picks locked yet. Your next win is one decision away.
              </li>
            )}
          </ul>
        </section>
      </main>

      {filtersOpen ? (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Tune your dinner search">
          <button type="button" className="filter-drawer-backdrop absolute inset-0 border-0 bg-[var(--scrim)] p-0" onClick={closeFilters} />
          <aside
            className={[
              "filter-drawer-sheet filter-drawer-sheet--left absolute left-0 top-0 h-full w-full max-w-md border-r border-[var(--border)]",
              drawerVisible ? "filter-drawer-sheet--open" : "",
            ].join(" ")}
          >
            <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-[var(--surface-card)] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pb-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="font-display text-lg text-[var(--text)]">Tune it</h3>
                <button type="button" onClick={closeFilters} className="btn-ghost rounded-full px-3 py-1.5 text-xs">
                  Close
                </button>
              </div>

              <div className="mb-5">
                <p className="mb-2 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[var(--label-muted)]">Account</p>
                <button
                  type="button"
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--primary-to)_28%,var(--border))] bg-[color-mix(in_srgb,var(--primary-to)_9%,white)] px-4 text-sm font-semibold text-[var(--text)] shadow-[0_1px_2px_rgba(17,24,39,0.04)] transition hover:bg-[color-mix(in_srgb,var(--primary-to)_12%,white)]"
                >
                  Log in / Sign up
                </button>
              </div>

              <div className="mb-4 flex flex-wrap items-center gap-2.5">
                <input
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    setIsAutoLocation(false);
                  }}
                  placeholder="ZIP or city"
                  className="w-full rounded-full border border-[var(--border)] bg-[var(--surface-card)] px-4 py-2.5 text-sm text-[var(--text)] focus:border-[var(--ring)] focus:outline-none"
                />
                <button type="button" onClick={() => void detectLocation()} className="btn-ghost rounded-full px-4 py-2 text-xs">
                  Use current location
                </button>
                <span className="text-xs text-[var(--label-muted)]">{isAutoLocation ? "Using current location." : "Manual location."}</span>
              </div>

              <div className="mb-5 border-b border-[color-mix(in_srgb,var(--border)_60%,transparent)] pb-4">
                <p className="mb-2 text-sm font-semibold text-[var(--text)]">Vibe</p>
                <p className="mb-3 text-xs text-[var(--label-muted)]">Mood chips weight your search—pick what fits tonight.</p>
                <div className="flex flex-wrap gap-2.5">
                  {MOOD_CHIPS.map((chip) => {
                    const on = filters.houseRules.includes(chip.id);
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleMoodChip(chip.id, chip.boost)}
                        className={[
                          "rounded-full border px-3.5 py-2 text-xs transition duration-200 hover:-translate-y-[1px]",
                          on
                            ? "border-[var(--select)] bg-[var(--select-muted)] text-[var(--select)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--select)_22%,transparent)]"
                            : "border-[var(--border)] bg-[var(--surface-card)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-soft)]",
                        ].join(" ")}
                      >
                        {chip.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-5 border-b border-[color-mix(in_srgb,var(--border)_60%,transparent)] pb-4">
                <p className="mb-2 text-sm font-semibold text-[var(--text)]">Price</p>
                <div className="inline-flex overflow-hidden rounded-full border border-[var(--border)]">
                  {([1, 2, 3, 4] as const).map((level) => {
                    const on = filters.maxPriceLevel === level;
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setFilters((prev) => ({ ...prev, maxPriceLevel: level }))}
                        className={[
                          "min-w-[2.6rem] border-r border-[var(--border)] px-3 py-1.5 text-xs last:border-r-0",
                          on ? "bg-[var(--select-muted)] text-[var(--text)]" : "bg-[var(--surface-card)] text-[var(--text-muted)]",
                        ].join(" ")}
                      >
                        {"$".repeat(level)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-5 border-b border-[color-mix(in_srgb,var(--border)_60%,transparent)] pb-4">
                <p className="mb-2 text-sm font-semibold text-[var(--text)]">Suggested</p>
                <div className="space-y-1.5">
                  {[
                    { label: "Open Now", checked: filters.openNow, onToggle: () => setFilters((prev) => ({ ...prev, openNow: !prev.openNow })) },
                    {
                      label: "Reservations",
                      checked: filters.reservationsPreferred,
                      onToggle: () => setFilters((prev) => ({ ...prev, reservationsPreferred: !prev.reservationsPreferred })),
                    },
                    {
                      label: "Offers Delivery",
                      checked: filters.requireDelivery,
                      onToggle: () => setFilters((prev) => ({ ...prev, requireDelivery: !prev.requireDelivery, requirePickup: false })),
                    },
                    {
                      label: "Offers Takeout",
                      checked: filters.requirePickup,
                      onToggle: () => setFilters((prev) => ({ ...prev, requirePickup: !prev.requirePickup, requireDelivery: false })),
                    },
                    {
                      label: "Good for Dinner",
                      checked: filters.goodForDinner,
                      onToggle: () => setFilters((prev) => ({ ...prev, goodForDinner: !prev.goodForDinner })),
                    },
                  ].map((item) => (
                    <label key={item.label} className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-muted)]">
                      <input type="checkbox" checked={item.checked} onChange={item.onToggle} className="h-4 w-4 accent-[var(--select)]" />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-5 border-b border-[color-mix(in_srgb,var(--border)_60%,transparent)] pb-4">
                <p className="mb-2 text-sm font-semibold text-[var(--text)]">Dietary Restrictions</p>
                <div className="flex flex-wrap gap-2">
                  {DIETARY_OPTIONS.map((opt) => {
                    const on = filters.searchBoostTerms.includes(opt.boost);
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => {
                          toggleBoostTerm(opt.boost);
                          if (opt.protein) {
                            setFilters((prev) => ({ ...prev, protein: on ? "any" : opt.protein ?? "any" }));
                          }
                        }}
                        className={[
                          "rounded-full border px-3.5 py-1.5 text-xs transition",
                          on
                            ? "border-[var(--select)] bg-[var(--select-muted)] text-[var(--select)]"
                            : "border-[var(--border)] bg-[var(--surface-card)] text-[var(--text-muted)]",
                        ].join(" ")}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-5 border-b border-[color-mix(in_srgb,var(--border)_60%,transparent)] pb-4">
                <p className="mb-2 text-sm font-semibold text-[var(--text)]">Category</p>
                <div className="flex flex-wrap gap-2">
                  {(showAllCategories ? CATEGORY_OPTIONS : CATEGORY_OPTIONS.slice(0, 6)).map((cuisine) => {
                    const on = filters.cuisines.includes(cuisine);
                    return (
                      <button
                        key={cuisine}
                        type="button"
                        onClick={() => toggleCuisine(cuisine)}
                        className={[
                          "rounded-full border px-3.5 py-1.5 text-xs transition",
                          on
                            ? "border-[var(--gold)] bg-[color-mix(in_srgb,var(--gold)_10%,white)] text-[var(--text)]"
                            : "border-[var(--border)] bg-[var(--surface-card)] text-[var(--text-muted)]",
                        ].join(" ")}
                      >
                        {cuisine}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="mt-2 text-xs font-semibold text-[var(--primary-to)]"
                  onClick={() => setShowAllCategories((prev) => !prev)}
                >
                  {showAllCategories ? "See less" : "See all"}
                </button>
              </div>

              <div className="mb-5 border-b border-[color-mix(in_srgb,var(--border)_60%,transparent)] pb-4">
                <p className="mb-2 text-sm font-semibold text-[var(--text)]">Features</p>
                <div className="space-y-1.5">
                  {(showAllFeatures ? FEATURE_OPTIONS : FEATURE_OPTIONS.slice(0, 6)).map((feature) => {
                    const on = filters.searchBoostTerms.includes(feature.boost);
                    return (
                      <label key={feature.label} className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-muted)]">
                        <input type="checkbox" checked={on} onChange={() => toggleBoostTerm(feature.boost)} className="h-4 w-4 accent-[var(--select)]" />
                        <span>{feature.label}</span>
                      </label>
                    );
                  })}
                </div>
                <button type="button" className="mt-2 text-xs font-semibold text-[var(--primary-to)]" onClick={() => setShowAllFeatures((prev) => !prev)}>
                  {showAllFeatures ? "See less" : "See all"}
                </button>
              </div>

              <div className="mb-5 border-b border-[color-mix(in_srgb,var(--border)_60%,transparent)] pb-4">
                <p className="mb-2 text-sm font-semibold text-[var(--text)]">Distance</p>
                <div className="space-y-1.5">
                  {DISTANCE_OPTIONS.map((option) => (
                    <label key={option.label} className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-muted)]">
                      <input
                        type="radio"
                        name="distance-filter"
                        checked={filters.maxDistanceMiles === option.miles}
                        onChange={() => setFilters((prev) => ({ ...prev, maxDistanceMiles: option.miles }))}
                        className="h-4 w-4 accent-[var(--select)]"
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-5 border-t border-[var(--border)] pt-4">
                <button type="button" onClick={() => setFilters(getDefaultFilters())} className="btn-ghost rounded-full px-4 py-2 text-xs">
                  Reset filters
                </button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
