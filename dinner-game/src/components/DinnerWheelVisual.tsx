"use client";

/** Light wheel — 4 segments (blue, green, gold, soft neutral), airy rim + minimal hub. */
export function DinnerWheelVisual() {
  return (
    <svg viewBox="0 0 120 120" className="wheel-visual-svg" aria-hidden>
      <defs>
        <linearGradient id="wheelRim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f3f2ed" />
        </linearGradient>
        <linearGradient id="segBlue" x1="20%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="55%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="segGreen" x1="100%" y1="20%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="segGold" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="45%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="segNeutral" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5f4f0" />
          <stop offset="50%" stopColor="#e8e6e0" />
          <stop offset="100%" stopColor="#ddd9d0" />
        </linearGradient>
        <radialGradient id="wheelTexture" cx="50%" cy="38%" r="72%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.08)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <radialGradient id="hubLight" cx="32%" cy="28%" r="85%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#fffbf5" />
          <stop offset="100%" stopColor="#fef7e8" />
        </radialGradient>
        <radialGradient id="wheelEdgeShadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(0,0,0,0)" />
          <stop offset="62%" stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(17,24,39,0.06)" />
        </radialGradient>
        <radialGradient id="wheelFaceHighlight" cx="28%" cy="22%" r="58%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
          <stop offset="40%" stopColor="rgba(255,255,255,0.12)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <filter id="segLift" x="-8%" y="-8%" width="116%" height="116%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.8" floodColor="rgba(17,24,39,0.07)" />
        </filter>
      </defs>
      {/* Outer ring — light, soft depth */}
      <circle
        cx="60"
        cy="60"
        r="57"
        fill="url(#wheelRim)"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="1.25"
        style={{ filter: "drop-shadow(0 3px 8px rgba(17,24,39,0.06)) drop-shadow(0 1px 2px rgba(17,24,39,0.04))" }}
      />
      <circle cx="60" cy="60" r="53" fill="none" stroke="rgba(17,24,39,0.04)" strokeWidth="0.55" />
      {/* 4 segments @ 90° — pointer at top lands in first wedge at 0° rotation */}
      <g filter="url(#segLift)">
        <path d="M60 60 L60 8 A52 52 0 0 1 112 60 Z" fill="url(#segBlue)" />
        <path d="M60 60 L112 60 A52 52 0 0 1 60 112 Z" fill="url(#segGreen)" />
        <path d="M60 60 L60 112 A52 52 0 0 1 8 60 Z" fill="url(#segGold)" />
        <path d="M60 60 L8 60 A52 52 0 0 1 60 8 Z" fill="url(#segNeutral)" />
      </g>
      <circle cx="60" cy="60" r="50" fill="url(#wheelTexture)" pointerEvents="none" />
      <circle cx="60" cy="60" r="52" fill="url(#wheelEdgeShadow)" pointerEvents="none" />
      <circle cx="60" cy="60" r="51" fill="url(#wheelFaceHighlight)" pointerEvents="none" opacity="0.75" />
      <circle
        cx="60"
        cy="60"
        r="21"
        fill="url(#hubLight)"
        stroke="rgba(17,24,39,0.08)"
        strokeWidth="1"
        style={{ filter: "drop-shadow(0 2px 6px rgba(17,24,39,0.08))" }}
      />
      <text
        x="60"
        y="63.5"
        textAnchor="middle"
        fontSize="8"
        fill="#0f172a"
        fontWeight="600"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="0.14em"
      >
        SPIN
      </text>
    </svg>
  );
}
