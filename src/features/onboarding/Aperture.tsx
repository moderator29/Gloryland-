import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Wordmark } from "@/components/brand/Mark";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Aperture: the opening reveal, named for the mark.
 *
 * Six blades sweep in over a dark field, close on the wordmark, and open
 * again. It is a signature, not a loading screen, so it is bound by three
 * rules: it runs once per session, it is skipped outright under reduced
 * motion, and it removes itself on a fixed timer that no animation callback
 * can outlive. Any key or any tap ends it early.
 */

/** Session scoped, so a reload inside the same visit goes straight to work. */
export const APERTURE_KEY = "rgl_aperture_v1";

/** Blade sweep, hold, and open. Kept comfortably under a second and a half. */
const SWEEP_MS = 1150;
const FADE_MS = 200;
const TOTAL_MS = SWEEP_MS + FADE_MS;

const RADIUS = 96;
const OPEN_OFFSET = 118;

const rad = (deg: number) => (deg * Math.PI) / 180;
const point = (deg: number) =>
  `${(50 + RADIUS * Math.cos(rad(deg))).toFixed(2)} ${(50 + RADIUS * Math.sin(rad(deg))).toFixed(2)}`;

/**
 * Six wedges that tile the full disc when they sit at the centre, drawn from
 * geometry so the seams stay exact at any viewport size.
 */
const BLADES = Array.from({ length: 6 }, (_, i) => {
  const axis = i * 60 - 90;
  const half = 31;
  return {
    d: `M 50 50 L ${point(axis - half)} L ${point(axis + half)} Z`,
    dx: OPEN_OFFSET * Math.cos(rad(axis)),
    dy: OPEN_OFFSET * Math.sin(rad(axis)),
  };
});

export type ApertureProps = {
  /** Skip the reveal without touching session storage, for embedded previews. */
  disabled?: boolean;
};

export function Aperture({ disabled = false }: ApertureProps) {
  const reduce = useReducedMotion();
  const [show, setShow] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(APERTURE_KEY) === null;
    } catch {
      return false;
    }
  });

  const active = show && !reduce && !disabled;

  useEffect(() => {
    if (!active) return;
    try {
      sessionStorage.setItem(APERTURE_KEY, "1");
    } catch {
      /* without a store it simply plays again next visit */
    }

    const end = () => setShow(false);
    // The timer is the contract: the overlay is gone by TOTAL_MS whatever the
    // animation does, so it can never hold the page hostage.
    const timer = window.setTimeout(end, TOTAL_MS);
    window.addEventListener("keydown", end);
    window.addEventListener("pointerdown", end);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", end);
      window.removeEventListener("pointerdown", end);
    };
  }, [active]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed inset-0 z-[120] grid place-items-center overflow-hidden bg-[var(--ink-000)]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: FADE_MS / 1000, ease: "easeOut" }}
          role="presentation"
          aria-hidden="true"
        >
          <Wordmark size={26} stacked tagline className="relative z-0 opacity-90" />

          <svg
            viewBox="0 0 100 100"
            className="pointer-events-none absolute h-[min(88vw,26rem)] w-[min(88vw,26rem)]"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="rgl-aperture-blade" x1="0" y1="0" x2="0.6" y2="1">
                <stop offset="0%" stopColor="var(--accent-soft)" />
                <stop offset="45%" stopColor="var(--accent)" />
                <stop offset="100%" stopColor="var(--accent-deep)" />
              </linearGradient>
            </defs>
            {BLADES.map((b, i) => (
              <motion.path
                key={i}
                d={b.d}
                fill="url(#rgl-aperture-blade)"
                initial={{ x: b.dx, y: b.dy, opacity: 0.95 }}
                animate={{ x: [b.dx, 0, 0, b.dx], y: [b.dy, 0, 0, b.dy] }}
                transition={{
                  duration: SWEEP_MS / 1000,
                  times: [0, 0.34, 0.56, 1],
                  ease: [0.65, 0, 0.35, 1],
                }}
              />
            ))}
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
