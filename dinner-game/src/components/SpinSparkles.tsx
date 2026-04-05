"use client";

import { useMemo } from "react";

/** Subtle gold/white sparkle burst while the wheel is spinning — festive, not carnival. */
export function SpinSparkles({ active, burstId }: { active: boolean; burstId: number }) {
  const particles = useMemo(() => {
    if (!active) return [];
    const n = 20;
    return Array.from({ length: n }, (_, i) => ({
      key: `${burstId}-${i}`,
      left: 12 + Math.random() * 76,
      top: 12 + Math.random() * 76,
      delay: Math.random() * 0.35,
      size: 2 + Math.random() * 3,
      driftX: (Math.random() - 0.5) * 28,
      driftY: -40 - Math.random() * 50,
    }));
  }, [active, burstId]);

  if (!active || particles.length === 0) return null;

  return (
    <div className="spin-sparkles" aria-hidden>
      {particles.map((p) => (
        <span
          key={p.key}
          className="spin-sparkles__bit"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            animationDelay: `${p.delay}s`,
            ["--drift-x" as string]: `${p.driftX}px`,
            ["--drift-y" as string]: `${p.driftY}px`,
          }}
        />
      ))}
    </div>
  );
}
