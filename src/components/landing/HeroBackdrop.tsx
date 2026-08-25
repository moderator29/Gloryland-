import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * The hero's atmosphere: a faint technical grid, a horizon glow and three
 * slow blue orbs that drift on long, unsynchronised cycles.
 *
 * Deliberately quiet — three large soft shapes rather than a particle field,
 * so it reads as depth rather than decoration. Purely presentational, so it
 * is hidden from assistive technology and never intercepts pointer events.
 */

const ORBS = [
  {
    size: 620,
    left: "-14%",
    top: "-22%",
    color: "rgba(46,139,255,0.30)",
    drift: { x: [0, 46, -18, 0], y: [0, -30, 24, 0] },
    duration: 26,
  },
  {
    size: 460,
    left: "58%",
    top: "-8%",
    color: "rgba(34,211,238,0.16)",
    drift: { x: [0, -38, 20, 0], y: [0, 34, -16, 0] },
    duration: 32,
  },
  {
    size: 540,
    left: "22%",
    top: "44%",
    color: "rgba(22,54,160,0.34)",
    drift: { x: [0, 30, -34, 0], y: [0, -22, 18, 0] },
    duration: 38,
  },
] as const;

export function HeroBackdrop() {
  const reduce = useReducedMotion();

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Technical grid, faded out toward the edges so it never reads as a table. */}
      <div
        className="absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(120,160,220,0.07) 1px, transparent 1px)," +
            "linear-gradient(to bottom, rgba(120,160,220,0.07) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(ellipse 80% 62% at 50% 32%, #000 30%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 62% at 50% 32%, #000 30%, transparent 78%)",
        }}
      />

      {/* Drifting orbs. */}
      {ORBS.map((orb, i) =>
        reduce ? (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: orb.size,
              height: orb.size,
              left: orb.left,
              top: orb.top,
              background: `radial-gradient(circle, ${orb.color} 0%, transparent 68%)`,
              filter: "blur(28px)",
            }}
          />
        ) : (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: orb.size,
              height: orb.size,
              left: orb.left,
              top: orb.top,
              background: `radial-gradient(circle, ${orb.color} 0%, transparent 68%)`,
              filter: "blur(28px)",
            }}
            animate={{ x: [...orb.drift.x], y: [...orb.drift.y] }}
            transition={{ duration: orb.duration, repeat: Infinity, ease: "easeInOut" }}
          />
        ),
      )}

      {/* Horizon: a single hairline of brand light where the hero ends. */}
      <div
        className="absolute inset-x-0 bottom-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(46,139,255,0.45) 35%, rgba(125,211,252,0.5) 50%, rgba(46,139,255,0.45) 65%, transparent)",
        }}
      />

      {/* Ground fade so the hero settles into the page below it. */}
      <div
        className="absolute inset-x-0 bottom-0 h-40"
        style={{ background: "linear-gradient(to bottom, transparent, var(--ink-000))" }}
      />
    </div>
  );
}
