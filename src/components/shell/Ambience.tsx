import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Atmosphere behind the application: two slow blue orbs and a faint grid.
 * Fixed and pointer-transparent, and the drift is reduced on phones and
 * stopped entirely under reduced motion, since this is decoration that
 * should never cost a frame during interaction.
 */
export function Ambience() {
  const reduce = useReducedMotion();
  const mobile = useIsMobile();
  const still = reduce || mobile;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(120,160,220,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(120,160,220,0.045) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 90% 60% at 50% 0%, #000 20%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 90% 60% at 50% 0%, #000 20%, transparent 75%)",
        }}
      />
      <motion.div
        className="absolute -top-40 left-1/4 h-[34rem] w-[34rem] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(46,139,255,0.16), transparent 62%)" }}
        animate={still ? undefined : { x: [0, 70, 0], y: [0, 40, 0] }}
        transition={{ duration: 34, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-32 top-1/2 h-[28rem] w-[28rem] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(34,211,238,0.09), transparent 64%)" }}
        animate={still ? undefined : { x: [0, -60, 0], y: [0, -50, 0] }}
        transition={{ duration: 42, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
