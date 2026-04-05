const ANALYTICS_KEY = "dinner_game_analytics";

type AnalyticsBucket = Record<string, number>;

function loadBucket(): AnalyticsBucket {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(ANALYTICS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as AnalyticsBucket;
  } catch {
    return {};
  }
}

export function trackEvent(eventName: string): void {
  if (typeof window === "undefined") return;
  const bucket = loadBucket();
  bucket[eventName] = (bucket[eventName] ?? 0) + 1;
  window.localStorage.setItem(ANALYTICS_KEY, JSON.stringify(bucket));
}
