import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { money } from "./format";

/**
 * A number that animates to its target.
 *
 * Used for figures that change while the page is open (accruing rewards,
 * portfolio value). Eases toward the new value rather than snapping, and
 * renders the final value immediately when reduced motion is requested.
 */
export function Value({
  value,
  decimals = 0,
  currency = true,
  className = "",
  duration = 700,
}: {
  value: number;
  decimals?: number;
  currency?: boolean;
  className?: string;
  duration?: number;
}) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const raf = useRef(0);

  useEffect(() => {
    if (reduce) {
      setShown(value);
      return;
    }
    const start = performance.now();
    const a = from.current;
    const b = value;
    if (a === b) return;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutExpo: fast commit, soft landing
      const e = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setShown(a + (b - a) * e);
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else from.current = b;
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration, reduce]);

  useEffect(() => {
    from.current = shown;
  }, [shown]);

  const text = currency
    ? money(shown, decimals)
    : shown.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

  return <span className={`tabular ${className}`}>{text}</span>;
}
