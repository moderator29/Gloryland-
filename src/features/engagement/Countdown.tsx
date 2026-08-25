import { useEffect, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Countdown: a live read of the time left until a timestamp.
 *
 * The only input is the target instant, which callers take from the ledger
 * (a position's `maturesAt`), so this component cannot invent a date. It ticks
 * once per second, clears its interval on unmount, and holds a single frozen
 * reading when reduced motion is requested rather than repainting every
 * second. Past the target it reads "Matured" and stops.
 */

export type CountdownProps = {
  /** Target instant in epoch milliseconds. */
  to: number;
  /** Drop the day segment once inside a day, for tight spaces. */
  compact?: boolean;
  /** Word shown once the target has passed. */
  doneLabel?: string;
  className?: string;
};

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function segments(remaining: number) {
  const total = Math.max(0, Math.floor(remaining / 1000));
  return {
    days: Math.floor(total / 86_400),
    hours: Math.floor(total / 3_600) % 24,
    minutes: Math.floor(total / 60) % 60,
    seconds: total % 60,
  };
}

/** "12d 04:33:21", or "04:33:21" inside the final day. */
function format(remaining: number, compact: boolean): string {
  const { days, hours, minutes, seconds } = segments(remaining);
  const clock = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  if (days === 0) return clock;
  return compact ? `${days}d ${pad(hours)}h` : `${days}d ${clock}`;
}

export function Countdown({
  to,
  compact = false,
  doneLabel = "Matured",
  className = "",
}: CountdownProps) {
  const reduce = useReducedMotion();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    // Frozen under reduced motion: the reading taken at mount stands.
    if (reduce) return;
    if (to <= Date.now()) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      // Nothing left to count once the target has passed.
      if (t >= to) window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
  }, [to, reduce]);

  const remaining = to - now;

  if (remaining <= 0) {
    return <span className={`tabular ${className}`}>{doneLabel}</span>;
  }

  return (
    <span className={`tabular ${className}`} aria-live="off">
      {format(remaining, compact)}
    </span>
  );
}
