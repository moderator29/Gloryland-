import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * A hairline that draws itself in from the left when it is scrolled to.
 *
 * It scales rather than animating width, so the whole thing stays on the
 * compositor and never triggers layout on the section beneath it. Purely
 * decorative, so it is invisible to assistive technology, and under reduced
 * motion it is simply already drawn.
 */
export function DrawRule({
  className = "",
  delay = 0,
  duration = 0.9,
}: {
  className?: string;
  delay?: number;
  duration?: number;
}) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <span aria-hidden="true" className={`rule-glow block w-full ${className}`} />;
  }

  return (
    <span aria-hidden="true" className={`block w-full overflow-hidden ${className}`}>
      <motion.span
        className="rule-glow block w-full origin-left"
        initial={{ scaleX: 0, opacity: 0 }}
        whileInView={{ scaleX: 1, opacity: 1 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      />
    </span>
  );
}
