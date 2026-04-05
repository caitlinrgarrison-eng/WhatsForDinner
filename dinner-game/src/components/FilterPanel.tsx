"use client";

import type { DinnerFilters, DinnerMode, ProteinPreference } from "@/lib/types";

const PROTEIN_OPTIONS: { label: string; value: ProteinPreference }[] = [
  { label: "Any", value: "any" },
  { label: "No meat", value: "no_meat" },
  { label: "Chicken", value: "chicken" },
  { label: "Beef", value: "beef" },
  { label: "Seafood", value: "seafood" },
  { label: "Vegetarian", value: "vegetarian" },
];

const CUISINES = [
  "American",
  "Italian",
  "Mexican",
  "Chinese",
  "Japanese",
  "Indian",
  "Mediterranean",
  "Thai",
];

const FEATURES: { key: keyof Pick<DinnerFilters, "openNow" | "goodForDinner" | "reservationsPreferred">; label: string }[] = [
  { key: "openNow", label: "Open now" },
  { key: "goodForDinner", label: "Good for dinner" },
  { key: "reservationsPreferred", label: "Reservations" },
];

const DINING_CHIPS: { label: string; mode: DinnerMode; hint: string }[] = [
  { label: "Eat Out", mode: "eat_out", hint: "No delivery / pickup requirement" },
  { label: "Delivery", mode: "delivery", hint: "Offers delivery" },
  { label: "Takeout", mode: "takeout", hint: "Pickup / order ahead" },
];

interface FilterPanelProps {
  value: DinnerFilters;
  onChange: (next: DinnerFilters) => void;
  showActions?: boolean;
  onCancel?: () => void;
  onApply?: () => void;
  onClose?: () => void;
}

export function FilterPanel({
  value,
  onChange,
  showActions = false,
  onCancel,
  onApply,
  onClose,
}: FilterPanelProps) {
  const updateCuisines = (cuisine: string, checked: boolean) => {
    const cuisines = checked
      ? [...value.cuisines, cuisine]
      : value.cuisines.filter((c) => c !== cuisine);
    onChange({ ...value, cuisines });
  };

  const setDiningChip = (mode: DinnerMode) => {
    if (mode === "eat_out") {
      onChange({ ...value, requireDelivery: false, requirePickup: false });
      return;
    }
    if (mode === "delivery") {
      onChange({ ...value, requireDelivery: true, requirePickup: false });
      return;
    }
    if (mode === "takeout") {
      onChange({ ...value, requireDelivery: false, requirePickup: true });
    }
  };

  const diningSelection = (): DinnerMode => {
    if (value.requireDelivery) return "delivery";
    if (value.requirePickup) return "takeout";
    return "eat_out";
  };

  const chip = (active: boolean) =>
    [
      "rounded-full border px-3.5 py-2 text-xs font-normal transition duration-200 hover:scale-[1.02] active:scale-[0.99]",
      active
        ? "border-[var(--gold)] bg-[color-mix(in_srgb,var(--gold)_18%,transparent)] text-[var(--text)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--gold)_35%,transparent)]"
        : "border-[var(--border)] bg-[var(--drawer-chip)] text-[var(--text-muted)]",
    ].join(" ");

  return (
    <div className="flex h-full min-h-0 flex-col text-sm text-[var(--text)]">
      <div className="drawer-filter-scroll flex-1 space-y-7 px-4 pb-28 pt-5 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-medium tracking-tight text-[var(--text)]">Filters</h2>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Chips and toggles — nothing heavy.</p>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="drawer-close-btn rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-normal text-[var(--text-muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--text)]"
              aria-label="Close filters"
            >
              ✕
            </button>
          ) : null}
        </div>

        <div>
          <span className="mb-2 block text-[0.65rem] font-normal uppercase tracking-[0.15em] text-[var(--label-muted)]">
            Price
          </span>
          <div className="flex flex-wrap gap-2">
            {([1, 2, 3, 4] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => onChange({ ...value, maxPriceLevel: level })}
                className={chip(value.maxPriceLevel === level)}
              >
                {"$".repeat(level)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-2 block text-[0.65rem] font-normal uppercase tracking-[0.15em] text-[var(--label-muted)]">
            Dining mode
          </span>
          <p className="mb-2 text-[0.7rem] text-[var(--text-muted)]">Separate paths — delivery isn’t takeout.</p>
          <div className="flex flex-wrap gap-2">
            {DINING_CHIPS.map((c) => (
              <button
                key={c.mode}
                type="button"
                title={c.hint}
                onClick={() => setDiningChip(c.mode)}
                className={chip(diningSelection() === c.mode)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-2 block text-[0.65rem] font-normal uppercase tracking-[0.15em] text-[var(--label-muted)]">
            Dietary restrictions
          </span>
          <div className="flex flex-wrap gap-2">
            {PROTEIN_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChange({ ...value, protein: opt.value })}
                className={chip(value.protein === opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[0.65rem] font-normal uppercase tracking-[0.15em] text-[var(--label-muted)]">
            Category / cuisine
          </p>
          <div className="flex flex-wrap gap-2">
            {CUISINES.map((cuisine) => {
              const on = value.cuisines.includes(cuisine);
              return (
                <button
                  key={cuisine}
                  type="button"
                  onClick={() => updateCuisines(cuisine, !on)}
                  className={chip(on)}
                >
                  {cuisine}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className="mb-2 block text-[0.65rem] font-normal uppercase tracking-[0.15em] text-[var(--label-muted)]">
            Features
          </span>
          <div className="flex flex-wrap gap-2">
            {FEATURES.map((f) => {
              const on = value[f.key];
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => onChange({ ...value, [f.key]: !on })}
                  className={chip(on)}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="block rounded-2xl border border-[var(--border)] bg-[var(--drawer-chip)] p-4">
          <span className="text-[0.65rem] font-normal uppercase tracking-[0.15em] text-[var(--text-muted)]">
            Distance
          </span>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-xs text-[var(--text-muted)]">Max miles</span>
            <input
              type="number"
              min={1}
              max={30}
              value={value.maxDistanceMiles}
              onChange={(e) =>
                onChange({
                  ...value,
                  maxDistanceMiles: Math.max(1, Math.min(30, Number(e.target.value) || 1)),
                })
              }
              className="w-full max-w-[6rem] rounded-full border border-[var(--border)] bg-[var(--drawer-inset)] px-3 py-2 text-[var(--text)]"
            />
          </div>
        </label>

        <label className="block rounded-2xl border border-[var(--border)] bg-[var(--drawer-chip)] p-4">
          <span className="text-[0.65rem] font-normal uppercase tracking-[0.15em] text-[var(--text-muted)]">
            Stars at least
          </span>
          <input
            type="range"
            min={3}
            max={5}
            step={0.5}
            value={value.minRating}
            onChange={(e) => onChange({ ...value, minRating: Number(e.target.value) })}
            className="mt-3 w-full accent-[var(--gold)]"
          />
          <span className="mt-1 block text-center text-sm font-medium text-[var(--text)]">{value.minRating.toFixed(1)}+</span>
        </label>
      </div>

      {showActions ? (
        <div className="drawer-filter-footer border-t border-[var(--border)] bg-[var(--drawer-surface)] px-4 py-4 sm:px-6">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-[var(--border-strong)] px-6 py-3 text-sm font-normal text-[var(--text-muted)] transition hover:border-[var(--text-muted)] hover:text-[var(--text)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onApply}
              className="btn-primary-gradient rounded-full px-6 py-3 text-sm text-white transition"
            >
              Apply filters
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
