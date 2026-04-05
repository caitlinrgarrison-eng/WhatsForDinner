"use client";

import type { CSSProperties } from "react";
import { ModeSlotVisual } from "@/components/ModeSlotVisual";
import type { DinnerMode, VibeSelection } from "@/lib/types";

const TILES: {
  choice: VibeSelection;
  title: string;
  hint: string;
  previewMode: DinnerMode;
}[] = [
  { choice: "eat_out", title: "Eat Out", hint: "Table time, full outing", previewMode: "eat_out" },
  { choice: "delivery", title: "Delivery", hint: "To your door", previewMode: "delivery" },
  { choice: "takeout", title: "Takeout", hint: "Grab and go", previewMode: "takeout" },
  { choice: "eat_home", title: "Eat at Home", hint: "Cook or assemble in", previewMode: "eat_home" },
  { choice: "surprise", title: "Surprise Me", hint: "We’ll pick the vibe", previewMode: "eat_out" },
];

interface VibeTilesProps {
  selected: VibeSelection | null;
  onSelect: (choice: VibeSelection) => void;
  isShuffling?: boolean;
  disabled?: boolean;
  pulseChoice?: VibeSelection | null;
}

export function VibeTiles({ selected, onSelect, isShuffling, disabled, pulseChoice }: VibeTilesProps) {
  return (
    <div
      className={["vibe-tiles", isShuffling ? "vibe-tiles--shuffling" : ""].filter(Boolean).join(" ")}
      role="radiogroup"
      aria-label="Start with the vibe"
    >
      {TILES.map((tile, index) => {
        const isSelected = selected === tile.choice;
        const isPulsing = pulseChoice === tile.choice;
        return (
          <button
            key={tile.choice}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled || isShuffling}
            onClick={() => onSelect(tile.choice)}
            style={{ "--vibe-stagger": index } as CSSProperties}
            className={[
              "vibe-tile",
              `vibe-tile--${tile.choice}`,
              isSelected ? "vibe-tile--selected" : "",
              isPulsing ? "vibe-tile--pick-pulse" : "",
              isShuffling ? "vibe-tile--shuffle-wiggle" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="vibe-tile__top">
              <div className="vibe-tile__icon flex justify-center [&_svg]:h-10 [&_svg]:w-10">
                <ModeSlotVisual mode={tile.previewMode} />
              </div>
            </div>
            <div className="vibe-tile__meta">
              <div className="vibe-tile__label">{tile.title}</div>
              <p className="vibe-tile__hint">{tile.hint}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
