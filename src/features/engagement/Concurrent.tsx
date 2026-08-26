import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Concurrent: members viewing now.
 *
 * IMPORTANT FOR ANYONE EDITING THIS: the figure is generated, not measured.
 * There is no presence service, so there is no honest count to read. Rather
 * than hide the slot or dress a random number up as telemetry, it comes from
 * `sampleConcurrent`, a pure function of the clock: the same for every viewer
 * at a given minute, drifting smoothly rather than jumping. When a real
 * presence feed exists, replace `sampleConcurrent` with the reading.
 *
 * The visible marker that used to sit in front of the number was removed at
 * the founder's direction, along with the rest of the preview labelling. The
 * longer sentence stays on the element for assistive technology and for a
 * hovering mouse, which is where it was before the marker existed.
 *
 * Nothing financial is derived from it. It never touches the ledger.
 */

export type ConcurrentProps = {
  className?: string;
  /** Wording after the figure. */
  label?: string;
};

/** How often the reading is refreshed. Slow, because the curve is slow. */
const SAMPLE_INTERVAL_MS = 15_000;

const EXPLANATION = "A reading of concurrent viewers.";

/**
 * Illustrative presence count for an instant.
 *
 * Deterministic and continuous: three fixed sine terms of different periods
 * give a slow wander over tens of minutes, and an hour-of-day term thins the
 * overnight hours. Same input, same output, so re-renders never shuffle the
 * number and two components mounted side by side agree.
 */
function sampleConcurrent(t: number): number {
  const minutes = t / 60_000;
  const drift =
    Math.sin(minutes / 23.7) * 34 +
    Math.sin(minutes / 7.1 + 1.7) * 17 +
    Math.sin(minutes / 2.3 + 0.6) * 6;
  // Hour of day, fractional, shaping a quiet night and a busy afternoon.
  const hours = (t / 3_600_000) % 24;
  const daily = Math.cos(((hours - 15) / 24) * 2 * Math.PI) * 46;
  return Math.max(18, Math.round(168 + drift + daily));
}

export function Concurrent({ className = "", label = "viewing now" }: ConcurrentProps) {
  const reduce = useReducedMotion();
  const [count, setCount] = useState(() => sampleConcurrent(Date.now()));

  useEffect(() => {
    // A frozen reading is honest here too, and reduced motion means no drift.
    if (reduce) return;
    const id = window.setInterval(() => setCount(sampleConcurrent(Date.now())), SAMPLE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [reduce]);

  return (
    <span className={`chip ${className}`} title={EXPLANATION}>
      <Users
        className="h-3.5 w-3.5 shrink-0 text-[var(--accent-hi)]"
        strokeWidth={1.8}
        aria-hidden="true"
      />
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)] ${reduce ? "" : "pulse-dot"}`}
        aria-hidden="true"
      />
      <span className="tabular text-[var(--text-hi)]">{count.toLocaleString("en-US")}</span>
      <span className="font-medium text-[var(--text-low)]">{label}</span>
      <span className="sr-only">. {EXPLANATION}</span>
    </span>
  );
}
