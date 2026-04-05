export type DinnerMode = "eat_out" | "delivery" | "takeout" | "eat_home";

/** Vibe row: four dining modes plus in-row surprise */
export type VibeSelection = DinnerMode | "surprise";

export type PlayControlMode = "full_surprise" | "pick_vibe" | "pick_type" | "specific";

export type ProteinPreference =
  | "any"
  | "no_meat"
  | "chicken"
  | "beef"
  | "seafood"
  | "vegetarian";

export interface DinnerFilters {
  protein: ProteinPreference;
  cuisines: string[];
  minRating: number;
  maxPriceLevel: 4 | 3 | 2 | 1;
  maxDistanceMiles: number;
  openNow: boolean;
  goodForDinner: boolean;
  reservationsPreferred: boolean;
  /** Prefer places that offer delivery (Yelp transactions) */
  requireDelivery: boolean;
  /** Prefer places that offer pickup / takeout */
  requirePickup: boolean;
  /** Lightweight mood tags — applied in client + influence search */
  houseRules: string[];
  /** Extra Yelp search terms from house rules */
  searchBoostTerms: string[];
}

export type ReviewExampleSource = "google" | "yelp";

export interface ReviewExample {
  text: string;
  rating?: number;
  source: ReviewExampleSource;
  /** ISO timestamp or API-relative label */
  timeLabel?: string;
}

export interface RecommendationItem {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  priceLevel: 1 | 2 | 3 | 4;
  categories: string[];
  distanceMiles: number;
  locationLabel: string;
  reviewSnippet: string;
  source: "yelp" | "home_prompt";
  /** Optional Google Place id when Yelp results are enriched */
  googlePlaceId?: string;
  /** Optional Google Maps URL for quick launch */
  googleMapsUrl?: string;
  /** Official business website when known (prefer for general link-outs) */
  websiteUrl?: string;
  /** Yelp business page (use for review-specific links) */
  yelpBusinessUrl?: string;
  /** Yelp-hosted menu page when returned by the API */
  yelpMenuUrl?: string;
  /** Yelp aggregate rating when available */
  yelpRating?: number;
  yelpReviewCount?: number;
  /** Google aggregate rating when Places details are available */
  googleRating?: number;
  googleReviewCount?: number;
  /** Yelp CDN and/or proxied Google Place photo URLs */
  photoUrls?: string[];
  /** Recent review excerpts (newest first), tagged by source */
  reviewExamples?: ReviewExample[];
  /** Yelp: business offers delivery */
  isDeliveryAvailable?: boolean;
  /** Yelp: business offers pickup / order ahead */
  isPickupAvailable?: boolean;
}

/** Alternate rows for “Compare options” on the result card */
export type CompareAlternate = {
  item: RecommendationItem;
  reason: "Faster" | "Higher rated" | "Lower price";
  detail: string;
};

export interface RewardState {
  totalXp: number;
  streakDays: number;
  lastDecisionDate: string | null;
  badges: string[];
}

export interface UserSession {
  id: string;
  email: string;
  displayName: string;
}

export type RestaurantFeedback = "favorite" | "declined";

export interface UserFeedbackProfile {
  favoriteIds: string[];
  declinedIds: string[];
  favoriteNames: string[];
  declinedNames: string[];
}
