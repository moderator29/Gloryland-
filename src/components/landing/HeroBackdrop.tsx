import { motion, useScroll, useTransform } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * The hero's atmosphere: a faint technical grid, three slow blue orbs on long
 * unsynchronised cycles, and a raking ray across the upper field.
 *
 * Two layers of movement, and they are different on purpose. The orbs drift
 * on their own clock so the page is never quite still, while the grid and the
 * ray are tied to scroll position, which is what gives the hero depth as it
 * leaves the screen. The hero sits at the top of the document, so page scroll
 * is the correct driver and no measurement of the section is needed.
 *
 * Purely presentational: hidden from assistive technology, inert to the
 * pointer, and completely static under reduced motion.
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
  const { scrollY } = useScroll();

  // Parallax: the grid falls behind the content, the field lifts, and the ray
  // slides across. Small ranges, because the point is depth, not spectacle.
  const gridY = useTransform(scrollY, [0, 900], [0, 130]);
  const gridFade = useTransform(scrollY, [0, 620], [0.55, 0.12]);
  const fieldY = useTransform(scrollY, [0, 900], [0, -70]);
  const rayX = useTransform(scrollY, [0, 900], ["0%", "26%"]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Technical grid, faded out toward the edges so it never reads as a table. */}
      <motion.div
        className="absolute inset-0"
        style={{
          opacity: reduce ? 0.55 : gridFade,
          y: reduce ? 0 : gridY,
          backgroundImage:
            "linear-gradient(to right, rgba(120,160,220,0.07) 1px, transparent 1px)," +
            "linear-gradient(to bottom, rgba(120,160,220,0.07) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(ellipse 80% 62% at 50% 32%, #000 30%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 62% at 50% 32%, #000 30%, transparent 78%)",
        }}
      />

      {/* A raking ray of brand light, the same angle as the glass stride. */}
      <motion.div
        className="absolute -inset-x-1/4 -top-1/3 h-[160%]"
        style={{
          x: reduce ? 0 : rayX,
          background:
            "linear-gradient(104deg, transparent 30%, rgba(125,211,252,0.055) 45%, transparent 60%)",
        }}
      />

      {/* Drifting orbs. */}
      <motion.div className="absolute inset-0" style={{ y: reduce ? 0 : fieldY }}>
        {ORBS.map((orb, i) => {
          const paint = {
            width: orb.size,
            height: orb.size,
            left: orb.left,
            top: orb.top,
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 68%)`,
            filter: "blur(28px)",
          };

          if (reduce) return <div key={i} className="absolute rounded-full" style={paint} />;

          return (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={paint}
              animate={{ x: [...orb.drift.x], y: [...orb.drift.y] }}
              transition={{ duration: orb.duration, repeat: Infinity, ease: "easeInOut" }}
            />
          );
        })}
      </motion.div>

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
