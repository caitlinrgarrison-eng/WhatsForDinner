"use client";

import type { DinnerMode } from "@/lib/types";

/** Simple realistic-ish SVG icons instead of emoji for slot windows. */
export function ModeSlotVisual({ mode }: { mode: DinnerMode }) {
  if (mode === "eat_home") {
    return (
      <svg viewBox="0 0 48 48" className="slot-visual-svg" aria-hidden>
        <rect x="8" y="22" width="32" height="18" rx="2" fill="#e0eaf5" stroke="#8fafc4" strokeWidth="1" />
        <path d="M12 22 L24 10 L36 22" fill="none" stroke="#5a7a94" strokeWidth="2" strokeLinejoin="round" />
        <rect x="20" y="28" width="8" height="12" rx="1" fill="#2d6a4f" />
        <ellipse cx="24" cy="34" rx="6" ry="4" fill="#e8d48b" opacity="0.95" />
      </svg>
    );
  }
  if (mode === "delivery") {
    return (
      <svg viewBox="0 0 48 48" className="slot-visual-svg" aria-hidden>
        <rect x="6" y="18" width="22" height="16" rx="2" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.2" />
        <circle cx="14" cy="34" r="4" fill="#334155" />
        <circle cx="24" cy="34" r="4" fill="#334155" />
        <path d="M28 22 L38 14 L40 26 L30 26 Z" fill="#60a5fa" stroke="#1e40af" strokeWidth="1" />
        <path d="M32 18 L36 14" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (mode === "takeout") {
    return (
      <svg viewBox="0 0 48 48" className="slot-visual-svg" aria-hidden>
        <path
          d="M14 16 L34 16 L32 38 L16 38 Z"
          fill="#ffffff"
          stroke="#b9c8d6"
          strokeWidth="1.2"
        />
        <path d="M16 16 L18 12 L30 12 L32 16" fill="none" stroke="#5a7a94" strokeWidth="1.5" />
        <line x1="20" y1="22" x2="28" y2="30" stroke="#3b6b9e" strokeWidth="1.5" />
        <line x1="28" y1="22" x2="20" y2="30" stroke="#5cb88a" strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" className="slot-visual-svg" aria-hidden>
      <ellipse cx="24" cy="28" rx="16" ry="8" fill="#e0eaf5" stroke="#8fafc4" strokeWidth="1" />
      <ellipse cx="24" cy="26" rx="14" ry="6" fill="#f7f9fb" />
      <circle cx="18" cy="22" r="3" fill="#7eb8d4" />
      <circle cx="26" cy="20" r="2.5" fill="#6eb896" />
      <circle cx="30" cy="24" r="2" fill="#d4af37" />
      <rect x="10" y="14" width="28" height="4" rx="1" fill="#c5d6e6" />
    </svg>
  );
}
