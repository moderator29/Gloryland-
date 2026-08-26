import { useEffect, useState } from "react";

/**
 * Countdown: a live read of the time left until a timestamp.
 *
 * The only input is the target instant, which callers take from the ledger
 * (a position's `maturesAt`), so this component cannot invent a date. It ticks
 * once per second, clears its interval on unmount, and past the target it
 * reads "Matured" and stops.
 *
 * It used to freeze under reduced motion, which meant a member who prefers
 * reduced motion watched a stopped clock for as long as they stayed on the
 * page. Reduced motion is a request about animation, and a figure changing to
 * a new true value is not animation: nothing here eases, tweens or moves, the
 * text is simply replaced. So the tick runs regardless of the preference and
 * stops only where it earns nothing, which is a hidden tab.
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
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (to <= Date.now()) return;

    let id = 0;
    const stop = () => {
      if (id) window.clearInterval(id);
      id = 0;
    };
    const start = () => {
      stop();
      id = window.setInterval(() => {
        const t = Date.now();
        setNow(t);
        // Nothing left to count once the target has passed.
        if (t >= to) stop();
      }, 1000);
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else {
        // Catch up in one step rather than counting back through the gap.
        setNow(Date.now());
        start();
      }
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [to]);

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
