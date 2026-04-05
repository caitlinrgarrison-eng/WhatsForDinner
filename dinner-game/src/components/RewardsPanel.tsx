import type { RewardState } from "@/lib/types";

interface RewardsPanelProps {
  rewards: RewardState;
}

export function RewardsPanel({ rewards }: RewardsPanelProps) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
      <h2 className="font-display text-base font-medium text-[var(--text)]">Progress</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm font-normal text-[var(--text)]">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 shadow-[var(--shadow-soft)]">
          <p className="text-[0.6rem] font-normal uppercase tracking-wider text-[var(--label-muted)]">XP</p>
          <p className="text-lg">{rewards.totalXp}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 shadow-[var(--shadow-soft)]">
          <p className="text-[0.6rem] font-normal uppercase tracking-wider text-[var(--label-muted)]">Streak</p>
          <p className="text-lg">{rewards.streakDays}d</p>
        </div>
      </div>
      <div className="mt-4">
        <p className="text-[0.6rem] font-normal uppercase tracking-wider text-[var(--text-muted)]">Badges</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {rewards.badges.length ? (
            rewards.badges.map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-[var(--gold)] bg-[var(--gold-muted)] px-3 py-1 text-xs font-normal text-[var(--text)]"
              >
                {badge}
              </span>
            ))
          ) : (
            <span className="text-xs font-normal text-[var(--text-muted)]">Badges appear as you lock picks.</span>
          )}
        </div>
      </div>
    </section>
  );
}
