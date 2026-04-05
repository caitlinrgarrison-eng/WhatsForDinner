"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

const STATUS_LINES = [
  "Narrowing it down...",
  "This one's interesting...",
  "Almost there...",
];

const FALLBACK_NAMES = [
  "That corner bistro",
  "The usual spot",
  "Something new",
  "Tonight's wildcard",
  "A solid maybe",
];

export function ShuffleReveal({
  active,
  candidateNames,
  statusIndex,
}: {
  active: boolean;
  /** Names to flash as near-misses (from API or placeholders) */
  candidateNames: string[];
  /** Rotating index into STATUS_LINES */
  statusIndex: number;
}) {
  const names = useMemo(() => {
    const merged = [...candidateNames, ...FALLBACK_NAMES];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const n of merged) {
      const t = n.trim();
      if (t.length < 2 || seen.has(t.toLowerCase())) continue;
      seen.add(t.toLowerCase());
      out.push(t);
      if (out.length >= 8) break;
    }
    while (out.length < 4) out.push(FALLBACK_NAMES[out.length % FALLBACK_NAMES.length]);
    return out;
  }, [candidateNames]);

  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!active) {
      setTick(0);
      return;
    }
    const id = window.setInterval(() => {
      setTick((t) => t + 1);
    }, 140);
    return () => window.clearInterval(id);
  }, [active]);

  if (!active) return null;

  const line = STATUS_LINES[statusIndex % STATUS_LINES.length];
  const cardCount = 4;
  const displayNames = Array.from({ length: cardCount }, (_, i) => names[(tick + i) % names.length]);

  return (
    <div className="shuffle-reveal mx-auto flex max-w-md flex-col items-center py-6" aria-live="polite" aria-busy="true">
      <p className="shuffle-reveal__status text-center text-sm font-medium text-[var(--text-muted)]">{line}</p>
      <div className="shuffle-reveal__stack relative mt-6 h-[12rem] w-full max-w-[18rem]">
        {displayNames.map((name, i) => {
          const layer = cardCount - 1 - i;
          const baseRot = -5 + layer * 3.5;
          const yStack = layer * 6;
          const xNudge = (i % 2 === 0 ? -1 : 1) * 3;
          return (
            <div
              key={i}
              className={`shuffle-reveal__layer shuffle-reveal__layer--${i}`}
              style={
                {
                  "--shuffle-z": layer + 1,
                  "--shuffle-rot": `${baseRot}deg`,
                  "--shuffle-y": `${yStack}px`,
                  "--shuffle-x": `${xNudge}px`,
                } as CSSProperties
              }
            >
              <div className="shuffle-reveal__card rounded-2xl border border-[color-mix(in_srgb,var(--border)_82%,white)] bg-[var(--surface)] px-4 py-4 text-center shadow-[0_12px_32px_rgba(17,24,39,0.08)]">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--label-muted)]">Maybe...</p>
                <p className="mt-2 font-display text-lg font-semibold leading-snug text-[var(--text)] line-clamp-2">{name}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
