"use client";

import { FeaturedPickCard } from "@/components/FeaturedPickCard";
import type { RecommendationItem } from "@/lib/types";

function ToneCheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

interface GameRevealProps {
  options: RecommendationItem[];
  selected: RecommendationItem | null;
  isRevealing: boolean;
  compact?: boolean;
  staggerKey?: number;
  /** Shown above the featured card — what the game fixed vs decided */
  contextLine?: string;
  /** Quick-rule labels active for this spin (shown after spin with checkmarks) */
  toneLabels?: string[];
  /** Pulse the winning card after reveal */
  winnerPulse?: boolean;
  /** Dining mode label for vibe tag */
  vibeLabel?: string;
  /** Delivery / takeout / eat out style tag */
  serviceLabel?: string;
  /** Short line under “Tonight’s pick” */
  tagline?: string | null;
}

export function GameReveal({
  options,
  selected,
  isRevealing,
  compact,
  staggerKey = 0,
  contextLine,
  toneLabels = [],
  winnerPulse,
  vibeLabel = "Your vibe",
  serviceLabel,
  tagline,
}: GameRevealProps) {
  if (compact) {
    return (
      <section className="rounded-xl bg-transparent py-2 text-center">
        <p className="text-xs font-normal uppercase tracking-[0.14em] text-[var(--label-muted)]">Tonight&apos;s pick</p>
        {selected ? (
          <p className="mt-1 text-sm font-normal text-[var(--text)]">{selected.name}</p>
        ) : (
          <p className="mt-1 text-sm text-[var(--text-muted)]">Open the card to confirm</p>
        )}
        {selected && toneLabels.length > 0 ? (
          <p className="mt-1.5 text-[0.65rem] text-[var(--text-muted)]">
            Tone · {toneLabels.join(" · ")}
          </p>
        ) : null}
      </section>
    );
  }

  if (!options.length) {
    return (
      <section
        className="result-reveal-placeholder rounded-2xl border border-dashed border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-muted)_65%,transparent)] px-6 py-16 text-center"
        aria-label="Pick preview"
      >
        <p className="text-sm text-[var(--text-muted)] opacity-80">Ready when you are.</p>
      </section>
    );
  }

  const toneBlock =
    toneLabels.length > 0 ? (
      <div className="flex flex-col items-center gap-2.5" aria-label="Tone applied to this spin">
        <p className="text-[0.6rem] font-normal uppercase tracking-[0.16em] text-[var(--label-muted)]">
          Matched to your tone
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {toneLabels.map((label) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--select)] bg-[var(--select-muted)] px-3 py-1.5 text-xs font-normal text-[var(--select)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--select)_18%,transparent)]"
            >
              <ToneCheckIcon className="h-3.5 w-3.5 shrink-0 opacity-90" />
              {label}
            </span>
          ))}
        </div>
      </div>
    ) : null;

  const contextBlock =
    contextLine ? (
      <p className="text-center text-[0.65rem] font-normal uppercase tracking-[0.15em] text-[var(--label-muted)]">
        {contextLine}
      </p>
    ) : null;

  if (!selected) {
    return (
      <section className="space-y-4">
        {contextBlock}
        {toneBlock}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]/50 px-6 py-14 text-center">
          <p
            className={[
              "text-sm text-[var(--text-muted)]",
              isRevealing ? "reveal-pending-pulse" : "",
            ].join(" ")}
          >
            {isRevealing ? "Locking in your pick…" : "Almost there…"}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      {contextBlock}
      {toneBlock}
      <FeaturedPickCard
        item={selected}
        vibeLabel={vibeLabel}
        serviceLabel={serviceLabel}
        tagline={tagline}
        winnerPulse={winnerPulse}
        animKey={staggerKey}
      />
    </section>
  );
}
