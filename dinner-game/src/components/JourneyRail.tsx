"use client";

/** Progress that reads as a journey (waypoints), not numbered form steps. */
export function JourneyRail({ waypoint }: { waypoint: 0 | 1 | 2 }) {
  const stops = [
    { id: "setup", label: "Setup" },
    { id: "spin", label: "The draw" },
    { id: "tonight", label: "Tonight" },
  ] as const;

  const fillPct = waypoint === 0 ? 8 : waypoint === 1 ? 50 : 100;

  return (
    <div className="journey-rail" aria-hidden>
      <div className="journey-rail__track">
        <div className="journey-rail__glow" style={{ width: `${fillPct}%` }} />
      </div>
      <div className="journey-rail__stops">
        {stops.map((stop, i) => {
          const lit = i <= waypoint;
          const pulse = i === waypoint;
          return (
            <span
              key={stop.id}
              className={[
                "journey-rail__stop",
                lit ? "journey-rail__stop--lit" : "",
                pulse ? "journey-rail__stop--pulse" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="journey-rail__dot" />
              <span className="journey-rail__label">{stop.label}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
