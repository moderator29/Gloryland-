import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * ScrollRail: a hairline of brand light along the top edge that tracks how far
 * through the page you are.
 *
 * It writes straight to the element's transform inside a frame callback rather
 * than through state, because a progress bar that re-renders React on every
 * scroll event is a progress bar that makes the page it measures feel slower.
 * Scroll and resize only ever schedule one frame at a time.
 */

export type ScrollRailProps = {
  /** Thickness in pixels. */
  height?: number;
  /** Which edge it sits on. */
  position?: "top" | "bottom";
  className?: string;
};

export function ScrollRail({ height = 2, position = "top", className = "" }: ScrollRailProps) {
  const reduce = useReducedMotion();
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduce) return;

    let frame = 0;

    const measure = () => {
      frame = 0;
      const el = bar.current;
      if (!el) return;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      el.style.transform = `scaleX(${progress})`;
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [reduce]);

  if (reduce) return null;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-x-0 z-[45] ${
        position === "top" ? "top-0" : "bottom-0"
      } ${className}`}
      style={{ height }}
    >
      <div
        ref={bar}
        className="h-full w-full origin-left"
        style={{
          transform: "scaleX(0)",
          background:
            "linear-gradient(90deg, var(--accent-deep), var(--accent) 55%, var(--accent-soft))",
          boxShadow: "0 0 12px -2px rgba(46, 139, 255, 0.75)",
        }}
      />
    </div>
  );
}
