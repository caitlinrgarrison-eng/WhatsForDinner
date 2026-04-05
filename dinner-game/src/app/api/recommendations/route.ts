import { NextRequest, NextResponse } from "next/server";
import { getHomePrompts } from "@/lib/home-prompts";
import { getUniform01, pickUniformRandomFrom, shuffleArray } from "@/lib/pick-random";
import type {
  DinnerFilters,
  DinnerMode,
  RecommendationItem,
  ReviewExample,
  UserFeedbackProfile,
} from "@/lib/types";

const YELP_SEARCH_ENDPOINT = "https://api.yelp.com/v3/businesses/search";
const GOOGLE_TEXT_SEARCH_ENDPOINT = "https://maps.googleapis.com/maps/api/place/textsearch/json";
const GOOGLE_DETAILS_ENDPOINT = "https://maps.googleapis.com/maps/api/place/details/json";
const MAX_GOOGLE_ENRICHMENTS = 8;
const MAX_REVIEW_EXAMPLES = 4;
const MAX_PHOTOS = 6;
const YELP_ENRICH_CONCURRENCY = 6;

function priceLevelFromYelp(price: string | undefined): 1 | 2 | 3 | 4 {
  const level = price?.length ?? 2;
  return Math.max(1, Math.min(4, level)) as 1 | 2 | 3 | 4;
}

function mapProteinToYelpTerms(protein: DinnerFilters["protein"]): string {
  switch (protein) {
    case "no_meat":
      return "vegetarian";
    case "chicken":
      return "chicken";
    case "beef":
      return "steak";
    case "seafood":
      return "seafood";
    case "vegetarian":
      return "vegetarian";
    default:
      return "dinner";
  }
}

function buildSearchTerm(filters: DinnerFilters): string {
  const parts = [
    mapProteinToYelpTerms(filters.protein),
    ...filters.cuisines,
    ...filters.searchBoostTerms,
    filters.goodForDinner ? "dinner" : "",
  ].filter(Boolean);
  return parts.join(" ").trim() || "dinner";
}

interface YelpBusiness {
  id: string;
  name: string;
  rating?: number;
  review_count?: number;
  price?: string;
  categories?: { title: string }[];
  distance?: number;
  location?: { display_address?: string[] };
  coordinates?: { latitude?: number; longitude?: number };
  transactions?: string[];
}

interface GoogleTextSearchResult {
  place_id?: string;
}

interface GoogleReview {
  text?: string;
  rating?: number;
  time?: number;
  relative_time_description?: string;
}

interface GooglePhotoRef {
  photo_reference?: string;
}

interface GooglePlaceDetails {
  place_id?: string;
  url?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  formatted_address?: string;
  price_level?: number;
  reviews?: GoogleReview[];
  photos?: GooglePhotoRef[];
}

interface YelpReviewApi {
  text?: string;
  rating?: number;
  time_created?: string;
}

interface YelpBusinessDetail {
  url?: string;
  yelp_menu_url?: string;
  photos?: string[];
  rating?: number;
  review_count?: number;
}

interface YelpReviewsResponse {
  reviews?: YelpReviewApi[];
}

interface YelpSearchResponse {
  businesses?: YelpBusiness[];
  error?: { code?: string; description?: string };
}

function mapYelpItemToRecommendation(item: YelpBusiness): RecommendationItem {
  const tx = item.transactions ?? [];
  return {
    id: item.id,
    name: item.name,
    rating: item.rating ?? 4,
    reviewCount: item.review_count ?? 0,
    priceLevel: priceLevelFromYelp(item.price),
    categories: (item.categories ?? []).map((c: { title: string }) => c.title),
    distanceMiles: Number(((item.distance ?? 0) / 1609.34).toFixed(1)),
    locationLabel: item.location?.display_address?.join(", ") ?? "Nearby",
    reviewSnippet: "Popular local pick from Yelp.",
    source: "yelp",
    isDeliveryAvailable: tx.includes("delivery"),
    isPickupAvailable: tx.includes("pickup"),
  };
}

function clampPriceLevel(value: number | undefined): 1 | 2 | 3 | 4 {
  const n = Math.round(value ?? 2);
  return Math.max(1, Math.min(4, n)) as 1 | 2 | 3 | 4;
}

function cleanReviewSnippet(text: string | undefined): string | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  return trimmed.length > 220 ? `${trimmed.slice(0, 217)}...` : trimmed;
}

function clipText(text: string, max: number): string {
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function googlePhotoProxyPath(photoReference: string): string {
  return `/api/place-photo?photo_reference=${encodeURIComponent(photoReference)}&maxwidth=640`;
}

function mergeReviewExamples(
  googleReviews: GoogleReview[] | undefined,
  yelpReviews: YelpReviewApi[] | undefined,
): ReviewExample[] {
  type Sortable = ReviewExample & { _sort: number };
  const combined: Sortable[] = [];

  for (const r of googleReviews ?? []) {
    const text = r.text?.trim();
    if (!text) continue;
    combined.push({
      text: clipText(text, 320),
      rating: r.rating,
      source: "google",
      timeLabel: r.relative_time_description,
      _sort: (r.time ?? 0) * 1000,
    });
  }
  for (const r of yelpReviews ?? []) {
    const text = r.text?.trim();
    if (!text) continue;
    const ts = r.time_created ? Date.parse(r.time_created) : 0;
    combined.push({
      text: clipText(text, 320),
      rating: r.rating,
      source: "yelp",
      timeLabel: r.time_created
        ? new Date(r.time_created).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
        : undefined,
      _sort: Number.isFinite(ts) ? ts : 0,
    });
  }

  combined.sort((a, b) => b._sort - a._sort);
  return combined.slice(0, MAX_REVIEW_EXAMPLES).map((entry) => ({
    text: entry.text,
    rating: entry.rating,
    source: entry.source,
    timeLabel: entry.timeLabel,
  }));
}

function mergePhotoLists(yelpPhotos: string[] | undefined, googlePhotoRefs: string[] | undefined): string[] | undefined {
  const yelp = (yelpPhotos ?? []).filter(Boolean).slice(0, 4);
  const google = (googlePhotoRefs ?? [])
    .filter(Boolean)
    .slice(0, 3)
    .map((ref) => googlePhotoProxyPath(ref));
  const merged = [...yelp, ...google].slice(0, MAX_PHOTOS);
  return merged.length ? merged : undefined;
}

async function fetchYelpBusinessDetail(
  businessId: string,
  apiKey: string,
): Promise<YelpBusinessDetail | null> {
  const res = await fetch(`https://api.yelp.com/v3/businesses/${encodeURIComponent(businessId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as YelpBusinessDetail & { error?: unknown };
  if ((data as { error?: unknown }).error) return null;
  return data;
}

async function fetchYelpReviews(businessId: string, apiKey: string): Promise<YelpReviewApi[]> {
  const res = await fetch(`https://api.yelp.com/v3/businesses/${encodeURIComponent(businessId)}/reviews`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = (await res.json()) as YelpReviewsResponse & { error?: unknown };
  if ((data as { error?: unknown }).error) return [];
  return data.reviews ?? [];
}

async function fetchGoogleDetailsForItem(args: {
  item: RecommendationItem;
  apiKey: string;
  locationText: string;
  latitude: string | null;
  longitude: string | null;
}): Promise<{
  item: RecommendationItem;
  googleReviews?: GoogleReview[];
  googlePhotoRefs?: string[];
}> {
  const { item, apiKey, locationText, latitude, longitude } = args;
  const query = [item.name, item.locationLabel || locationText].filter(Boolean).join(" ");
  const searchParams = new URLSearchParams({
    query,
    key: apiKey,
  });

  if (latitude && longitude) {
    searchParams.set("location", `${latitude},${longitude}`);
    searchParams.set("radius", "5000");
  }

  const searchRes = await fetch(`${GOOGLE_TEXT_SEARCH_ENDPOINT}?${searchParams.toString()}`, {
    cache: "no-store",
  });
  if (!searchRes.ok) return { item };
  const searchData = (await searchRes.json()) as { results?: GoogleTextSearchResult[] };
  const placeId = searchData.results?.[0]?.place_id;
  if (!placeId) return { item };

  const detailsParams = new URLSearchParams({
    place_id: placeId,
    fields: "place_id,url,website,rating,user_ratings_total,formatted_address,price_level,reviews,photos",
    key: apiKey,
  });
  const detailsRes = await fetch(`${GOOGLE_DETAILS_ENDPOINT}?${detailsParams.toString()}`, {
    cache: "no-store",
  });
  if (!detailsRes.ok) {
    return { item, googleReviews: undefined, googlePhotoRefs: undefined };
  }

  const detailsData = (await detailsRes.json()) as { result?: GooglePlaceDetails };
  const details = detailsData.result;
  if (!details) {
    return { item: { ...item, googlePlaceId: placeId } };
  }

  const googleSnippet = cleanReviewSnippet(details.reviews?.[0]?.text);
  const photoRefs = (details.photos ?? [])
    .map((p) => p.photo_reference)
    .filter((ref): ref is string => Boolean(ref));

  const nextItem: RecommendationItem = {
    ...item,
    googleRating: details.rating,
    googleReviewCount: details.user_ratings_total,
    priceLevel: details.price_level ? clampPriceLevel(details.price_level) : item.priceLevel,
    locationLabel: details.formatted_address ?? item.locationLabel,
    reviewSnippet: googleSnippet ?? item.reviewSnippet,
    googlePlaceId: details.place_id ?? placeId,
    googleMapsUrl: details.url,
    websiteUrl: details.website ?? item.websiteUrl,
  };

  return {
    item: nextItem,
    googleReviews: details.reviews,
    googlePhotoRefs: photoRefs,
  };
}

async function enrichRestaurantItem(args: {
  item: RecommendationItem;
  index: number;
  yelpApiKey: string;
  googleApiKey: string | undefined;
  locationText: string;
  latitude: string | null;
  longitude: string | null;
}): Promise<RecommendationItem> {
  const { item, index, yelpApiKey, googleApiKey, locationText, latitude, longitude } = args;

  const [yelpBiz, yelpRevList] = await Promise.all([
    fetchYelpBusinessDetail(item.id, yelpApiKey),
    fetchYelpReviews(item.id, yelpApiKey),
  ]);

  const base: RecommendationItem = {
    ...item,
    yelpBusinessUrl: yelpBiz?.url ?? item.yelpBusinessUrl,
    yelpMenuUrl: yelpBiz?.yelp_menu_url ?? item.yelpMenuUrl,
    yelpRating: yelpBiz?.rating ?? item.rating,
    yelpReviewCount: yelpBiz?.review_count ?? item.reviewCount,
    rating: yelpBiz?.rating ?? item.rating,
    reviewCount: yelpBiz?.review_count ?? item.reviewCount,
    photoUrls: mergePhotoLists(yelpBiz?.photos, undefined),
  };

  const useGoogle = Boolean(googleApiKey) && index < MAX_GOOGLE_ENRICHMENTS;
  if (!useGoogle) {
    const examples = mergeReviewExamples(undefined, yelpRevList);
    const snippet = examples[0]?.text ?? base.reviewSnippet;
    return {
      ...base,
      reviewExamples: examples.length ? examples : undefined,
      reviewSnippet: snippet,
    };
  }

  try {
    const { item: googleItem, googleReviews, googlePhotoRefs } = await fetchGoogleDetailsForItem({
      item: base,
      apiKey: googleApiKey!,
      locationText,
      latitude,
      longitude,
    });

    const examples = mergeReviewExamples(googleReviews, yelpRevList);
    const photos = mergePhotoLists(yelpBiz?.photos, googlePhotoRefs);
    const snippet = examples[0]?.text ?? googleItem.reviewSnippet;

    return {
      ...googleItem,
      yelpBusinessUrl: base.yelpBusinessUrl,
      yelpMenuUrl: base.yelpMenuUrl,
      yelpRating: base.yelpRating,
      yelpReviewCount: base.yelpReviewCount,
      rating: base.rating,
      reviewCount: base.reviewCount,
      photoUrls: photos,
      reviewExamples: examples.length ? examples : undefined,
      reviewSnippet: snippet,
    };
  } catch {
    const examples = mergeReviewExamples(undefined, yelpRevList);
    return {
      ...base,
      reviewExamples: examples.length ? examples : undefined,
      reviewSnippet: examples[0]?.text ?? base.reviewSnippet,
    };
  }
}

async function enrichWithYelpAndGoogle(args: {
  items: RecommendationItem[];
  locationText: string;
  latitude: string | null;
  longitude: string | null;
  yelpApiKey: string;
  googleApiKey: string | undefined;
}): Promise<RecommendationItem[]> {
  const { items, locationText, latitude, longitude, yelpApiKey, googleApiKey } = args;
  if (!items.length) return items;

  const results: RecommendationItem[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= items.length) break;
      try {
        results[i] = await enrichRestaurantItem({
          item: items[i],
          index: i,
          yelpApiKey,
          googleApiKey,
          locationText,
          latitude,
          longitude,
        });
      } catch {
        results[i] = items[i];
      }
    }
  }

  const n = Math.min(YELP_ENRICH_CONCURRENCY, items.length);
  await Promise.all(Array.from({ length: n }, () => worker()));
  return results;
}

async function fetchYelpBusinesses(args: {
  apiKey: string;
  params: URLSearchParams;
}): Promise<{ businesses: YelpBusiness[]; ok: boolean; error?: string }> {
  const response = await fetch(`${YELP_SEARCH_ENDPOINT}?${args.params.toString()}`, {
    headers: { Authorization: `Bearer ${args.apiKey}` },
    cache: "no-store",
  });
  let data: YelpSearchResponse;
  try {
    data = (await response.json()) as YelpSearchResponse;
  } catch {
    return { businesses: [], ok: false, error: `Yelp HTTP ${response.status}` };
  }
  if (data.error) {
    return {
      businesses: [],
      ok: false,
      error: data.error.description ?? data.error.code ?? "Yelp API error",
    };
  }
  if (!response.ok) {
    return {
      businesses: [],
      ok: false,
      error: `Yelp HTTP ${response.status}`,
    };
  }
  return { businesses: data.businesses ?? [], ok: true };
}

function passesMode(mode: DinnerMode, item: RecommendationItem): boolean {
  if (mode === "delivery") return Boolean(item.isDeliveryAvailable);
  if (mode === "takeout") return Boolean(item.isPickupAvailable);
  return true;
}

function passesFilterTransactions(filters: DinnerFilters, item: RecommendationItem): boolean {
  if (filters.requireDelivery && !item.isDeliveryAvailable) return false;
  if (filters.requirePickup && !item.isPickupAvailable) return false;
  return true;
}

function passesItemFilters(filters: DinnerFilters, item: RecommendationItem): boolean {
  return (
    item.rating >= filters.minRating &&
    item.distanceMiles <= filters.maxDistanceMiles &&
    item.priceLevel <= filters.maxPriceLevel &&
    passesFilterTransactions(filters, item)
  );
}

function filterHomeByCuisines(items: RecommendationItem[], cuisines: string[]): RecommendationItem[] {
  if (!cuisines.length) return items;
  const lower = cuisines.map((c) => c.toLowerCase());
  return items.filter((item) =>
    item.categories.some((cat) => lower.some((c) => cat.toLowerCase().includes(c))),
  );
}

function fallbackRecommendations(mode: DinnerMode): RecommendationItem[] {
  if (mode === "eat_home") return getHomePrompts();
  return [
    {
      id: "fallback-1",
      name: "Local Bistro Pick",
      rating: 4.5,
      reviewCount: 210,
      priceLevel: 2,
      categories: ["American", "Casual"],
      distanceMiles: 2.8,
      locationLabel: "Nearby",
      reviewSnippet: "Tasty comfort food and fast service.",
      source: "yelp",
      isDeliveryAvailable: true,
      isPickupAvailable: true,
    },
    {
      id: "fallback-2",
      name: "Neighborhood Thai Spot",
      rating: 4.6,
      reviewCount: 180,
      priceLevel: 2,
      categories: ["Thai", "Spicy"],
      distanceMiles: 3.4,
      locationLabel: "Nearby",
      reviewSnippet: "Great flavor and packaging for the ride home.",
      source: "yelp",
      isDeliveryAvailable: true,
      isPickupAvailable: true,
    },
    {
      id: "fallback-3",
      name: "Date Night Grill",
      rating: 4.7,
      reviewCount: 140,
      priceLevel: 3,
      categories: ["Steakhouse", "Dinner"],
      distanceMiles: 4.1,
      locationLabel: "Nearby",
      reviewSnippet: "Solid ambiance and consistently strong reviews.",
      source: "yelp",
      isDeliveryAvailable: false,
      isPickupAvailable: true,
    },
  ];
}

function fallbackRestaurantItems(mode: DinnerMode, filters: DinnerFilters): RecommendationItem[] {
  const base = fallbackRecommendations(mode === "eat_home" ? "eat_out" : mode);
  const modeMatched = base.filter((item) => passesMode(mode, item));
  const filterMatched = modeMatched.filter((item) => passesItemFilters(filters, item));
  if (filterMatched.length) return filterMatched;
  if (modeMatched.length) return modeMatched;
  return base;
}

/** Yelp returns the same “top” slice if sort/offset never change — vary both per request for fresher pools. */
function randomYelpPrimarySearchOptions(hasCoords: boolean): { sort_by: string; offset: string } {
  const sorts = hasCoords
    ? (["best_match", "rating", "review_count", "distance"] as const)
    : (["best_match", "rating", "review_count"] as const);
  const sort_by = pickUniformRandomFrom([...sorts]);
  const page = Math.floor(getUniform01() * 4);
  const offset = String(page * 20);
  return { sort_by, offset };
}

function randomYelpRelaxedSearchOptions(hasCoords: boolean): { sort_by: string; offset: string } {
  const sorts = hasCoords
    ? (["best_match", "rating", "review_count", "distance"] as const)
    : (["best_match", "rating", "review_count"] as const);
  const sort_by = pickUniformRandomFrom([...sorts]);
  const page = Math.floor(getUniform01() * 3);
  const offset = String(page * 20);
  return { sort_by, offset };
}

/** Reorders for display / tie-break feel; the client picks uniformly from the full `items` array for the final dinner choice. */
function rankByFeedbackBias(items: RecommendationItem[], feedback?: UserFeedbackProfile): RecommendationItem[] {
  if (!feedback) return items;
  const favoriteIds = new Set(feedback.favoriteIds);
  const declinedIds = new Set(feedback.declinedIds);
  const favoriteNames = new Set(feedback.favoriteNames.map((name) => name.toLowerCase()));
  const declinedNames = new Set(feedback.declinedNames.map((name) => name.toLowerCase()));

  const scored = items.map((item) => {
    let score = item.rating * 2 + Math.min(item.reviewCount / 250, 4);
    const loweredName = item.name.toLowerCase();

    if (favoriteIds.has(item.id)) score += 5;
    if (favoriteNames.has(loweredName)) score += 3;
    if (declinedIds.has(item.id)) score -= 6;
    if (declinedNames.has(loweredName)) score -= 4;

    return { item, score };
  });

  return scored.sort((a, b) => b.score - a.score).map((entry) => entry.item);
}

/** When there is no feedback profile, shuffle so the UI doesn’t always show the same Yelp order. */
function rankAndSurface(items: RecommendationItem[], feedback?: UserFeedbackProfile): RecommendationItem[] {
  const ranked = rankByFeedbackBias(items, feedback);
  return !feedback ? shuffleArray(ranked) : ranked;
}

export async function POST(request: NextRequest) {
  const { mode, filters, location, feedback } = (await request.json()) as {
    mode: DinnerMode;
    filters: DinnerFilters;
    location: string;
    feedback?: UserFeedbackProfile;
  };

  if (mode === "eat_home") {
    const home = filterHomeByCuisines(getHomePrompts(), filters.cuisines);
    const pool = home.length ? home : getHomePrompts();
    const narrowed = pool.filter((i) => passesItemFilters(filters, i));
    const list = narrowed.length ? narrowed : pool;
    return NextResponse.json({ items: shuffleArray(list) });
  }

  const apiKey = process.env.YELP_API_KEY;
  const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!location?.trim()) {
    return NextResponse.json({
      items: [],
      mock: false,
      message: "Enter a city, state, ZIP, or use current location to fetch local restaurant recommendations.",
    });
  }

  if (!apiKey) {
    return NextResponse.json({
      items: rankAndSurface(fallbackRestaurantItems(mode, filters), feedback),
      mock: true,
      message: "Using demo restaurant picks. Add YELP_API_KEY to enable live local recommendations.",
    });
  }

  const trimmed = location.trim();
  /** Yelp expects lat/lng as separate params; a "lat,lng" string is not a valid `location` value. */
  const coordMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  let latStr: string | null = null;
  let lngStr: string | null = null;
  if (coordMatch) {
    const lat = Number(coordMatch[1]);
    const lng = Number(coordMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      latStr = String(lat);
      lngStr = String(lng);
    }
  }

  const maxPriceLevel = Math.min(4, Math.max(1, filters.maxPriceLevel ?? 4));
  const hasCoords = latStr !== null && lngStr !== null;
  const primaryJitter = randomYelpPrimarySearchOptions(hasCoords);
  const relaxedJitter = randomYelpRelaxedSearchOptions(hasCoords);

  const params = new URLSearchParams({
    term: buildSearchTerm(filters),
    limit: "24",
    categories: "restaurants",
    price: ["1", "2", "3", "4"].slice(0, maxPriceLevel).join(","),
  });
  params.set("sort_by", primaryJitter.sort_by);
  params.set("offset", primaryJitter.offset);

  if (latStr !== null && lngStr !== null) {
    params.set("latitude", latStr);
    params.set("longitude", lngStr);
  } else {
    params.set("location", trimmed);
  }

  if (filters.openNow) {
    params.set("open_now", "true");
  }

  const relaxedParams = new URLSearchParams({
    term: "restaurants dinner",
    limit: "50",
    categories: "restaurants",
  });
  relaxedParams.set("sort_by", relaxedJitter.sort_by);
  relaxedParams.set("offset", relaxedJitter.offset);
  if (latStr !== null && lngStr !== null) {
    relaxedParams.set("latitude", latStr);
    relaxedParams.set("longitude", lngStr);
  } else {
    relaxedParams.set("location", trimmed);
  }

  const primary = await fetchYelpBusinesses({ apiKey, params });
  let businessPool = primary.businesses;

  // Broader Yelp query if the strict search errors, returns nothing, or is empty.
  if (!primary.ok || !businessPool.length) {
    const relaxed = await fetchYelpBusinesses({ apiKey, params: relaxedParams });
    if (relaxed.ok && relaxed.businesses.length) {
      businessPool = relaxed.businesses;
    } else if (!primary.ok) {
      const detail = primary.error ?? relaxed.error ?? "Unknown Yelp error";
      return NextResponse.json({
        items: rankAndSurface(fallbackRestaurantItems(mode, filters), feedback),
        mock: true,
        message: `Live lookup failed (${detail}). Showing demo picks for now.`,
      });
    }
  }

  let yelpItems: RecommendationItem[] = businessPool
    .map(mapYelpItemToRecommendation)
    .filter(
      (item: RecommendationItem) =>
        passesItemFilters(filters, item) && passesMode(mode, item),
    );

  // Keep results live and location-bound, but retry with broader Yelp params when strict filters produce none.
  if (!yelpItems.length) {
    const relaxed = await fetchYelpBusinesses({ apiKey, params: relaxedParams });
    if (relaxed.ok) {
      const relaxedMapped = relaxed.businesses.map(mapYelpItemToRecommendation);
      const strictModeMatch = relaxedMapped.filter((item) => passesMode(mode, item));
      yelpItems = strictModeMatch.length ? strictModeMatch : relaxedMapped;
    }
  }

  const items = await enrichWithYelpAndGoogle({
    items: yelpItems,
    locationText: trimmed,
    latitude: latStr,
    longitude: lngStr,
    yelpApiKey: apiKey,
    googleApiKey: googleApiKey,
  });

  return NextResponse.json({
    items: rankAndSurface(
      items.length ? items : fallbackRestaurantItems(mode, filters),
      feedback,
    ),
    mock: !items.length,
  });
}
