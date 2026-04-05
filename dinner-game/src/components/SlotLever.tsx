"use client";

interface SlotLeverProps {
  pulled: boolean;
  disabled?: boolean;
  onClick: () => void;
}

/** Realistic casino-style one-arm lever (SVG). */
export function SlotLever({ pulled, disabled, onClick }: SlotLeverProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "slot-lever-btn group relative flex shrink-0 flex-col items-center justify-end outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      ].join(" ")}
      aria-label={disabled ? "Spinning…" : "Pull the lever"}
    >
      <svg
        className={["slot-lever-svg", pulled ? "slot-lever-svg--pulled" : ""].join(" ")}
        viewBox="0 0 56 132"
        width="56"
        height="132"
        aria-hidden
      >
        <defs>
          <linearGradient id="slotLeverChrome" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="35%" stopColor="#e2e8f0" />
            <stop offset="70%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
          <linearGradient id="slotLeverStem" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e5e7eb" />
            <stop offset="50%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#d1d5db" />
          </linearGradient>
          <radialGradient id="slotLeverKnob" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="45%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </radialGradient>
          <filter id="slotLeverShadow" x="-20%" y="-10%" width="140%" height="130%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#111827" floodOpacity="0.12" />
          </filter>
        </defs>
        {/* Pivot housing — bolted to cabinet */}
        <rect x="14" y="6" width="30" height="16" rx="3" fill="#e5e7eb" stroke="#cbd5e1" strokeWidth="1" />
        <circle cx="22" cy="14" r="2" fill="#9ca3af" />
        <circle cx="36" cy="14" r="2" fill="#9ca3af" />
        {/* Rotating arm + stem + knob */}
        <g className="slot-lever-arm">
          <path
            d="M 28 22 L 28 88"
            stroke="url(#slotLeverStem)"
            strokeWidth="10"
            strokeLinecap="round"
            filter="url(#slotLeverShadow)"
          />
          <line
            x1="28"
            y1="22"
            x2="40"
            y2="30"
            stroke="url(#slotLeverChrome)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <circle cx="28" cy="96" r="14" fill="url(#slotLeverKnob)" stroke="#d97706" strokeWidth="1" />
          <ellipse cx="24" cy="90" rx="4" ry="3" fill="white" opacity="0.35" />
        </g>
      </svg>
      <span className="mt-1 text-center text-[10px] font-normal uppercase tracking-[0.14em] text-[var(--slot-footnote)]">
        Yank it
      </span>
    </button>
  );
}
