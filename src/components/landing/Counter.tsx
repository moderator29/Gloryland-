import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * A figure that counts to its value once, the first time it is seen.
 *
 * Once is deliberate. A number that re-runs every time it scrolls back into
 * view stops reading as a fact and starts reading as an animation, which is
 * the opposite of what a published rate is for. Under reduced motion the
 * final value is painted immediately and no frame loop is ever started.
 */
export function Counter({
  value,
  format,
  duration = 1100,
  className = "",
}: {
  value: number;
  /** Turns the in-flight number into the string on screen. */
  format: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (reduce) {
      setShown(value);
      return;
    }
    if (!inView) return;

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic: quick commitment, long settle, so the last digits land softly.
      setShown(value * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce, value, duration]);

  return (
    <span ref={ref} className={`tabular ${className}`}>
      {format(shown)}
    </span>
  );
}
