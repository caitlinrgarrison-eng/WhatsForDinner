"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useRef, useState } from "react";
import type { CompareAlternate, DinnerMode, RecommendationItem } from "@/lib/types";

/** Google Maps / Business Profile URLs are not the restaurant's own site — prefer Yelp menu or biz page for menu CTA instead. */
function isGoogleOwnedVenueUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const h = u.hostname.toLowerCase();
    if (h === "g.page" || h.endsWith(".g.page")) return true;
    if (h === "maps.app.goo.gl" || h.endsWith(".maps.app.goo.gl")) return true;
    if (h.includes("google.") && (u.pathname.includes("/maps") || h.startsWith("business.google"))) return true;
    return false;
  } catch {
    return false;
  }
}

const easePremium = [0.22, 1, 0.36, 1] as const;

const cardRestShadow =
  "0 0 0 1px color-mix(in srgb, var(--gold) 10%, transparent), 0 4px 16px rgba(17, 24, 39, 0.06), 0 14px 38px rgba(17, 24, 39, 0.08)";

const cardGoldPulseShadow =
  "0 0 0 2px color-mix(in srgb, var(--gold) 30%, transparent), 0 4px 18px rgba(17, 24, 39, 0.07), 0 18px 48px rgba(17, 24, 39, 0.1), 0 0 44px color-mix(in srgb, var(--gold) 22%, transparent)";

export function FeaturedPickCard({
  item,
  mode,
  vibeLabel,
  serviceLabel,
  tagline,
  winnerPulse,
  isHomeMeal = false,
  animKey = 0,
  className = "",
  titleId: titleIdProp,
  onSpinAgain,
  canSpinAgain = true,
  onLockIn,
  isLockedToPick = false,
  isLockCelebrating = false,
  compareAlternates = [],
  bestAtLabel = "",
}: {
  item: RecommendationItem;
  mode?: DinnerMode;
  vibeLabel: string;
  /** Delivery / takeout / eat-out style (optional; shown when set) */
  serviceLabel?: string;
  tagline?: string | null;
  winnerPulse?: boolean;
  isHomeMeal?: boolean;
  animKey?: number;
  className?: string;
  /** Optional stable id for the title (e.g. dialog aria-labelledby) */
  titleId?: string;
  onSpinAgain?: () => void;
  canSpinAgain?: boolean;
  onLockIn?: () => void;
  isLockedToPick?: boolean;
  isLockCelebrating?: boolean;
  compareAlternates?: CompareAlternate[];
  /** Shown in compare panel: what the current pick leads on */
  bestAtLabel?: string;
}) {
  const genId = useId();
  const compareId = `${genId}-compare`;
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [showLockHint, setShowLockHint] = useState(false);
  const lockHintHideRef = useRef<number | null>(null);
  const titleId = titleIdProp ?? genId;

  useEffect(() => {
    if (!isLockCelebrating) return;
    if (lockHintHideRef.current) {
      clearTimeout(lockHintHideRef.current);
      lockHintHideRef.current = null;
    }
    const tShow = window.setTimeout(() => setShowLockHint(true), 0);
    lockHintHideRef.current = window.setTimeout(() => {
      setShowLockHint(false);
      lockHintHideRef.current = null;
    }, 2400) as number;
    return () => {
      clearTimeout(tShow);
    };
  }, [isLockCelebrating]);

  useEffect(() => {
    return () => {
      if (lockHintHideRef.current) clearTimeout(lockHintHideRef.current);
    };
  }, [item.id]);

  const cuisines = item.categories.slice(0, 3);
  const leadCuisine = cuisines[0] ?? "Dinner";
  const effectiveMode: DinnerMode = mode ?? (isHomeMeal ? "eat_home" : "eat_out");
  const normalizedVibe = vibeLabel && vibeLabel.toLowerCase() !== "curated" ? vibeLabel : "Casual";
  const modeTagLabel =
    effectiveMode === "eat_out"
      ? "Eat out"
      : effectiveMode === "delivery"
        ? "Delivery"
        : effectiveMode === "takeout"
          ? "Takeout"
          : "Eat at home";
  const contextTag = serviceLabel?.trim()
    ? serviceLabel.trim()
    : effectiveMode === "eat_out"
      ? normalizedVibe
      : effectiveMode === "delivery"
        ? "Fast"
        : effectiveMode === "takeout"
          ? "Quick pickup"
          : "Quick and easy";
  const modeEmoji =
    effectiveMode === "eat_out"
      ? "🍽️"
      : effectiveMode === "delivery"
        ? "🛵"
        : effectiveMode === "takeout"
          ? "🥡"
          : "🍳";
  const recipeSearchHref = `https://www.google.com/search?q=${encodeURIComponent(`${item.name} ${leadCuisine} recipe`)}`;
  const detailsFallbackHref = `https://www.google.com/search?q=${encodeURIComponent(`${item.name} ${item.locationLabel} details`)}`;
  const websiteHref = item.websiteUrl?.trim() || null;
  const websiteForMenu = websiteHref && !isGoogleOwnedVenueUrl(websiteHref) ? websiteHref : null;
  const yelpMenuHref = item.yelpMenuUrl?.trim() || null;
  const yelpReviewsHref = item.yelpBusinessUrl?.trim() || null;
  const roundedDistance = Math.max(0.1, Math.round(item.distanceMiles * 10) / 10);
  const estimatedDeliveryMins = Math.max(20, Math.min(55, Math.round(20 + item.distanceMiles * 7)));
  const estimatedPickupMins = Math.max(12, Math.min(35, Math.round(10 + item.distanceMiles * 5)));
  const ratingBits: string[] = [];
  if (item.yelpRating != null) {
    ratingBits.push(`Yelp ${item.yelpRating.toFixed(1)}★ (${(item.yelpReviewCount ?? item.reviewCount).toLocaleString()})`);
  }
  if (item.googleRating != null) {
    ratingBits.push(`Google ${item.googleRating.toFixed(1)}★ (${(item.googleReviewCount ?? 0).toLocaleString()})`);
  }
  const ratingSummaryShort = ratingBits.length ? ratingBits.join(" · ") : null;
  const showVenueExtras = effectiveMode !== "eat_home" && item.source === "yelp";
  const dishByCuisine: Record<string, string> = {
    italian: "cacio e pepe",
    mexican: "birria tacos",
    japanese: "tonkotsu ramen",
    chinese: "dan dan noodles",
    thai: "pad see ew",
    mediterranean: "chicken shawarma plate",
    indian: "butter chicken",
    american: "smash burger",
    "new american": "chef's seasonal special",
    french: "steak frites",
    seafood: "grilled salmon",
    steakhouses: "ribeye",
    "sushi bars": "chef's nigiri set",
    restaurants: "house favorite",
  };

  const cuisineKey = leadCuisine.toLowerCase();
  const fallbackDish = "house specialty";
  const recommendedDish = dishByCuisine[cuisineKey] ?? fallbackDish;
  const recommendationLabel =
    effectiveMode === "eat_home"
      ? `Top-rated ${leadCuisine} recipe`
      : recommendedDish === fallbackDish
        ? "house favorite"
        : recommendedDish;
  const recommendationHref =
    effectiveMode === "eat_home"
      ? `https://www.google.com/search?q=${encodeURIComponent(`best rated ${leadCuisine} recipe`)}`
      : `https://www.google.com/search?q=${encodeURIComponent(`${item.name} best dish ${recommendedDish}`)}`;
  const homeTitles = ["Kitchen main character", "Fridge raid, but elevated", "Chef era starts now", "Pantry plot twist"];
  const homeTitleSeed = [...item.name].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const homeTitle = homeTitles[homeTitleSeed % homeTitles.length];
  const eatOutTitles = [`${leadCuisine}, but make it a night`, `${leadCuisine} without the overthinking`, `${leadCuisine} and zero debate`];
  const deliveryTitles = [`${leadCuisine} to your doorstep`, `${leadCuisine} with couch privileges`, `${leadCuisine} on easy mode`];
  const takeoutTitles = [`${leadCuisine} grab-and-go`, `${leadCuisine} in and out`, `${leadCuisine} no-fuss pickup`];

  const playfulSubtitle =
    effectiveMode === "eat_home"
      ? null
      : effectiveMode === "eat_out"
        ? eatOutTitles[homeTitleSeed % eatOutTitles.length]
        : effectiveMode === "delivery"
          ? deliveryTitles[homeTitleSeed % deliveryTitles.length]
          : takeoutTitles[homeTitleSeed % takeoutTitles.length];

  const supportingLine =
    effectiveMode === "eat_out"
      ? roundedDistance <= 2
        ? "Close enough to count as effortless."
        : "A solid yes for tonight."
      : effectiveMode === "delivery"
        ? "Shows up hot. You stay horizontal."
        : effectiveMode === "takeout"
          ? "Ready in minutes. In and out."
          : item.reviewSnippet.length > 12
            ? "Built around what you already have."
            : "Quick, simple, delicious.";
  const whyThisPickSentence =
    effectiveMode === "eat_out"
      ? roundedDistance <= 2
        ? "Closest top-rated option nearby."
        : "Best nearby value for tonight."
      : effectiveMode === "delivery"
        ? "Fastest delivery in your current set."
        : effectiveMode === "takeout"
          ? "Quickest pickup in your current set."
          : "Pantry-friendly and low-friction tonight.";
  const quickReadSentence =
    effectiveMode === "eat_out"
      ? ratingSummaryShort
        ? `${ratingSummaryShort} · ~${roundedDistance.toFixed(1)} mi`
        : `Rated ${item.rating.toFixed(1)} stars, about ${roundedDistance.toFixed(1)} miles away.`
      : effectiveMode === "delivery"
        ? ratingSummaryShort
          ? `${ratingSummaryShort} · ~${estimatedDeliveryMins}-${estimatedDeliveryMins + 8} min delivery`
          : `Estimated ${estimatedDeliveryMins}-${estimatedDeliveryMins + 8} minute delivery.`
        : effectiveMode === "takeout"
          ? ratingSummaryShort
            ? `${ratingSummaryShort} · ~${estimatedPickupMins} min pickup · ${roundedDistance.toFixed(1)} mi`
            : `Ready in about ${estimatedPickupMins} minutes, ${roundedDistance.toFixed(1)} miles away.`
          : `Home-friendly ${leadCuisine} plan that keeps prep simple.`;

  const googleMapsHref = item.googleMapsUrl?.trim() || null;
  const noYelpSecondaryHref =
    effectiveMode === "eat_home"
      ? recipeSearchHref
      : googleMapsHref ?? websiteForMenu ?? yelpMenuHref ?? detailsFallbackHref;
  const noYelpSecondaryLabel =
    effectiveMode === "eat_home"
      ? "Recipe ideas"
      : googleMapsHref
        ? "Map & directions"
        : websiteForMenu
          ? "Official website"
          : yelpMenuHref
            ? "Menu on Yelp"
            : "Look up this place";
  const noYelpSecondaryLine =
    effectiveMode === "eat_home"
      ? `Search trusted ${leadCuisine} recipes that fit your night.`
      : googleMapsHref
        ? "Open in Maps — location, hours, and photos."
        : websiteForMenu
          ? "Menus, hours, and contact on their site."
          : yelpMenuHref
            ? "Yelp menu and order options when available."
            : quickReadSentence;

  const ctaLabel = effectiveMode === "eat_home" ? "Cook this tonight" : "Get this now";
  const ctaHref =
    effectiveMode === "eat_home"
      ? recipeSearchHref
      : websiteForMenu ?? yelpMenuHref ?? yelpReviewsHref ?? detailsFallbackHref;

  const comparePanelInner =
    compareAlternates.length > 0 ? (
      <div className="space-y-4">
        {bestAtLabel ? (
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--select)_28%,var(--border))] bg-[color-mix(in_srgb,var(--select-muted)_42%,white)] px-3 py-2.5">
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-[var(--label-muted)]">Your pick</p>
            <p className="mt-0.5 text-sm font-medium text-[var(--text)]">Best at: {bestAtLabel}</p>
          </div>
        ) : null}
        <ul className="space-y-3">
          {compareAlternates.map(({ item: alt, reason, detail }) => {
            const altRating = alt.yelpRating ?? alt.googleRating ?? alt.rating;
            const altDist = Math.max(0.1, Math.round(alt.distanceMiles * 10) / 10);
            return (
              <li
                key={alt.id}
                className="rounded-xl border border-[color-mix(in_srgb,var(--border)_65%,transparent)] bg-[var(--surface-card)] px-3 py-2.5"
              >
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[var(--primary)]">{reason}</p>
                <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{detail}</p>
                <p className="mt-1.5 text-sm font-semibold text-[var(--text)]">{alt.name}</p>
                <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                  {altRating.toFixed(1)}★ · {altDist.toFixed(1)} mi
                  {alt.priceLevel ? ` · ${"$".repeat(alt.priceLevel)}` : ""}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    ) : null;

  return (
    <div className={`featured-pick-stack featured-pick-stack--enter space-y-5 ${className}`}>
      {tagline ? (
        <p className="reveal-tagline reveal-tagline--strong text-center font-display text-base font-medium leading-relaxed text-[var(--text)] sm:text-lg">
          {tagline}
        </p>
      ) : null}

      <AnimatePresence>
        {showLockHint ? (
          <motion.p
            key="lock-hint"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.28, ease: easePremium }}
            className="text-center text-sm font-medium text-[color-mix(in_srgb,var(--text-muted)_88%,var(--text))]"
          >
            Locked in. Good choice.
          </motion.p>
        ) : null}
      </AnimatePresence>

      <motion.article
        key={`${item.id}-${animKey}`}
        initial={false}
        animate={
          isLockCelebrating
            ? { boxShadow: [cardRestShadow, cardGoldPulseShadow, cardRestShadow] }
            : false
        }
        transition={{ duration: 0.65, ease: easePremium, times: [0, 0.42, 1] }}
        className={[
          "featured-pick-card relative text-center sm:text-left",
          winnerPulse ? "featured-pick-card--celebrate" : "",
          isLockedToPick && !isLockCelebrating ? "featured-pick-card--committed" : "",
        ].join(" ")}
      >
        <span className="featured-pick-card__gold-accent" aria-hidden />
        <div
          className="absolute right-4 top-4 z-20 flex items-center gap-2"
          aria-hidden
        >
          <AnimatePresence>
            {isLockCelebrating ? (
              <motion.span
                key="lock-check"
                initial={{ opacity: 0, scale: 0.86 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.22, ease: easePremium }}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--gold)_40%,transparent)] bg-[color-mix(in_srgb,var(--surface-card)_92%,white)] text-[var(--gold)] shadow-sm"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l3 3 7-7" />
                </svg>
              </motion.span>
            ) : null}
          </AnimatePresence>
          <span
            className={[
              "inline-flex h-8 w-8 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--gold)_36%,transparent)] bg-[color-mix(in_srgb,var(--accent-gold-soft)_72%,white)] text-sm shadow-[0_4px_12px_rgba(15,23,42,0.08)]",
              isLockCelebrating ? "opacity-50" : "",
            ].join(" ")}
          >
            {modeEmoji}
          </span>
        </div>
        <div className="featured-pick-card__body--delayed">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[var(--label-muted)]">Your pick</p>
          <h3 id={titleId} className="featured-pick-card__title featured-pick-card__title--delayed mt-2 min-h-0 sm:min-h-0">
            {effectiveMode === "eat_home" ? homeTitle : item.name}
          </h3>
          {playfulSubtitle ? (
            <p className="mt-1.5 text-sm font-medium leading-snug text-[var(--text-muted)]">{playfulSubtitle}</p>
          ) : null}
          <p className="featured-pick-card__snippet mt-2 text-sm">{supportingLine}</p>
          <p className="mx-auto mt-2 max-w-md text-center text-[11px] leading-relaxed text-[var(--text-muted)] sm:mx-0 sm:text-left">
            You could keep this… or beat it.
          </p>
        </div>
        <div className="featured-pick-card__tags featured-pick-card__tags--delayed flex flex-wrap justify-center gap-2 sm:justify-start">
          <span className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-xs font-normal text-[var(--text-muted)]">
            {leadCuisine}
          </span>
          <span className="rounded-full border border-[color-mix(in_srgb,var(--gold)_42%,transparent)] bg-[color-mix(in_srgb,var(--accent-gold-soft)_70%,#ffffff)] px-3 py-1 text-xs font-medium text-[color-mix(in_srgb,var(--gold)_92%,#78350f)]">
            {contextTag}
          </span>
          <span className="hidden rounded-full border border-[color-mix(in_srgb,var(--gold)_42%,transparent)] bg-[color-mix(in_srgb,var(--accent-gold-soft)_70%,#ffffff)] px-3 py-1 text-xs font-medium text-[color-mix(in_srgb,var(--gold)_92%,#78350f)] sm:inline-flex">
            {modeTagLabel}
          </span>
        </div>
        {showVenueExtras && item.photoUrls?.length ? (
          <div className="featured-pick-card__body--delayed mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {item.photoUrls.map((url, i) => (
              <img
                key={`${url}-${i}`}
                src={url}
                alt={`${item.name} photo ${i + 1}`}
                className="h-24 w-32 shrink-0 rounded-lg border border-[color-mix(in_srgb,var(--border)_70%,transparent)] object-cover shadow-sm"
                loading="lazy"
              />
            ))}
          </div>
        ) : null}
        {showVenueExtras && item.reviewExamples?.length ? (
          <ul className="featured-pick-card__body--delayed mt-3 space-y-2.5 text-left">
            {item.reviewExamples.map((ex, i) => (
              <li
                key={`${ex.source}-${i}-${ex.text.slice(0, 24)}`}
                className="rounded-xl border border-[color-mix(in_srgb,var(--border)_78%,transparent)] bg-[color-mix(in_srgb,var(--surface-muted)_55%,white)] px-3 py-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-[var(--label-muted)]">
                    {ex.source === "google" ? "Google review" : "Yelp review"}
                  </span>
                  <span className="text-[0.65rem] text-[var(--text-muted)]">
                    {[ex.rating != null ? `${ex.rating.toFixed(1)}★` : null, ex.timeLabel].filter(Boolean).join(" · ")}
                  </span>
                </div>
                <p className="mt-1.5 text-sm leading-snug text-[var(--text)]">&ldquo;{ex.text}&rdquo;</p>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="featured-pick-card__body--delayed mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--border)_80%,transparent)] bg-[color-mix(in_srgb,var(--surface-muted)_72%,white)] px-3 py-2 text-left">
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-[var(--label-muted)]">Why this pick</p>
            <p className="mt-1 text-sm font-medium text-[var(--text)]">{whyThisPickSentence}</p>
          </div>
          {yelpReviewsHref ? (
            <a
              href={yelpReviewsHref}
              target="_blank"
              rel="noreferrer"
              className="group rounded-xl border border-[color-mix(in_srgb,var(--border)_80%,transparent)] bg-[color-mix(in_srgb,var(--surface-muted)_72%,white)] px-3 py-2 text-left transition hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] hover:bg-[color-mix(in_srgb,var(--surface-muted)_88%,white)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
              aria-label={`Yelp reviews for ${item.name} (opens in new tab)`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-[var(--label-muted)] transition group-hover:text-[var(--text)]">
                  Yelp reviews
                </p>
                <span
                  className="shrink-0 text-[0.7rem] font-medium text-[var(--primary)] transition group-hover:translate-x-[1px]"
                  aria-hidden
                >
                  ↗
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-[var(--text)]">{quickReadSentence}</p>
            </a>
          ) : (
            <a
              href={noYelpSecondaryHref}
              target="_blank"
              rel="noreferrer"
              className="group rounded-xl border border-[color-mix(in_srgb,var(--border)_80%,transparent)] bg-[color-mix(in_srgb,var(--surface-muted)_72%,white)] px-3 py-2 text-left transition hover:border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] hover:bg-[color-mix(in_srgb,var(--surface-muted)_88%,white)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
              aria-label={`${noYelpSecondaryLabel} for ${item.name} (opens in new tab)`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-[var(--label-muted)] transition group-hover:text-[var(--text)]">
                  {noYelpSecondaryLabel}
                </p>
                <span
                  className="shrink-0 text-[0.7rem] font-medium text-[var(--primary)] transition group-hover:translate-x-[1px]"
                  aria-hidden
                >
                  ↗
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-[var(--text)]">{noYelpSecondaryLine}</p>
            </a>
          )}
        </div>
        <a
          href={recommendationHref}
          target="_blank"
          rel="noreferrer"
          className="featured-pick-card__snippet--delayed mt-3 flex items-center justify-between gap-3 rounded-xl border border-[color-mix(in_srgb,var(--gold)_30%,var(--border))] bg-[linear-gradient(120deg,color-mix(in_srgb,var(--accent-gold-soft)_64%,white),color-mix(in_srgb,var(--accent-blue-soft)_26%,white))] px-3.5 py-2.5 text-left transition hover:-translate-y-[1px] hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
        >
          <div>
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--gold)_88%,#78350f)]">Popular order</p>
            <p className="mt-0.5 text-[0.98rem] font-semibold text-[var(--text)]">{recommendationLabel}</p>
          </div>
          <span
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--gold)_32%,transparent)] bg-[color-mix(in_srgb,var(--surface-card)_82%,white)] text-sm text-[var(--text)]"
            aria-hidden
          >
            ↗
          </span>
        </a>
        <div className="featured-pick-card__body--delayed mt-5 space-y-3">
          <motion.a
            href={ctaHref}
            target="_blank"
            rel="noreferrer"
            whileHover={{
              y: -2,
              boxShadow: "0 14px 34px color-mix(in srgb, var(--primary-to) 34%, transparent), 0 0 0 1px color-mix(in srgb, var(--primary-to) 28%, transparent)",
            }}
            transition={{ duration: 0.2, ease: easePremium }}
            className="btn-primary-gradient btn-primary-gradient--result-order btn-primary-gradient--reward-pulse flex w-full items-center justify-center rounded-2xl py-3.5 text-sm font-semibold text-white shadow-[0_10px_28px_color-mix(in_srgb,var(--primary-to)_30%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
          >
            {ctaLabel}
          </motion.a>
          <div className="grid grid-cols-3 gap-1.5 text-center sm:gap-2" role="group" aria-label="More actions">
            <motion.button
              type="button"
              disabled={!canSpinAgain}
              onClick={() => onSpinAgain?.()}
              whileTap={canSpinAgain ? { scale: 0.97 } : undefined}
              transition={{ duration: 0.12, ease: easePremium }}
              className={[
                "result-action-link group relative min-w-0 px-1 py-2 text-[12px] font-medium sm:text-[13px]",
                canSpinAgain
                  ? "text-[color-mix(in_srgb,var(--label-muted)_92%,var(--text))] hover:text-[var(--primary)]"
                  : "cursor-not-allowed opacity-40",
              ].join(" ")}
            >
              <span className="inline-flex items-center justify-center gap-1.5">
                <span
                  className="text-[1.05em] transition-[color,opacity] duration-200 group-hover:text-[var(--primary)] group-hover:opacity-100"
                  aria-hidden
                >
                  ↻
                </span>
                <span className="border-b border-transparent pb-px transition-[border-color,opacity] duration-200 group-hover:border-[var(--primary)] group-hover:opacity-100">
                  Try your luck again
                </span>
              </span>
            </motion.button>
            <motion.button
              type="button"
              id={compareId}
              disabled={compareAlternates.length === 0}
              aria-expanded={compareOpen || compareModalOpen}
              aria-haspopup="dialog"
              onClick={() => {
                if (compareAlternates.length === 0) return;
                if (typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches) {
                  setCompareModalOpen((o) => !o);
                  setCompareOpen(false);
                } else {
                  setCompareModalOpen(false);
                  setCompareOpen((o) => !o);
                }
              }}
              whileTap={compareAlternates.length ? { scale: 0.98 } : undefined}
              transition={{ duration: 0.12, ease: easePremium }}
              className={[
                "result-action-link min-w-0 px-1 py-2 text-[12px] font-medium sm:text-[13px]",
                compareAlternates.length
                  ? "text-[color-mix(in_srgb,var(--label-muted)_92%,var(--text))] hover:text-[var(--primary)]"
                  : "cursor-not-allowed opacity-40",
              ].join(" ")}
            >
              Compare options
            </motion.button>
            <motion.button
              type="button"
              disabled={isLockedToPick}
              onClick={() => onLockIn?.()}
              whileTap={!isLockedToPick ? { scale: 0.98 } : undefined}
              transition={{ duration: 0.12, ease: easePremium }}
              className={[
                "result-action-link min-w-0 px-1 py-2 text-[12px] font-medium sm:text-[13px]",
                isLockedToPick
                  ? "cursor-default text-[var(--select)]"
                  : "text-[color-mix(in_srgb,var(--label-muted)_92%,var(--text))] hover:text-[var(--primary)]",
              ].join(" ")}
            >
              {isLockedToPick ? "Locked ✓" : "Lock it in"}
            </motion.button>
          </div>
          {isLockedToPick ? (
            <p className="text-center text-[11px] font-medium text-[color-mix(in_srgb,var(--label-muted)_88%,var(--text))]">
              No more scrolling
            </p>
          ) : null}

          <AnimatePresence initial={false}>
            {compareOpen && compareAlternates.length > 0 ? (
              <motion.div
                key="compare-inline"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.24, ease: easePremium }}
                className="overflow-hidden"
              >
                <div
                  className="result-compare-panel rounded-2xl border border-[color-mix(in_srgb,var(--border)_75%,transparent)] bg-[color-mix(in_srgb,var(--surface-muted)_55%,white)] px-4 py-3.5 text-left"
                  role="region"
                  aria-label="Alternate options from this spin"
                  id={`${compareId}-panel`}
                >
                  <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-[var(--label-muted)]">Compare</p>
                  {comparePanelInner}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.article>

      <AnimatePresence>
        {compareModalOpen && compareAlternates.length > 0 ? (
          <motion.div
            key="compare-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${compareId}-modal-title`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: easePremium }}
            className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
          >
            <button
              type="button"
              className="absolute inset-0 border-0 bg-[var(--scrim)] p-0"
              aria-label="Close comparison"
              onClick={() => setCompareModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.24, ease: easePremium }}
              className="relative z-10 max-h-[min(78vh,520px)] w-full max-w-md overflow-y-auto rounded-2xl border border-[color-mix(in_srgb,var(--border)_75%,transparent)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-lift)]"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h4 id={`${compareId}-modal-title`} className="text-sm font-semibold text-[var(--text)]">
                  Compare options
                </h4>
                <button
                  type="button"
                  onClick={() => setCompareModalOpen(false)}
                  className="rounded-full px-2 py-1 text-xs font-medium text-[var(--primary)]"
                >
                  Close
                </button>
              </div>
              {comparePanelInner}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
