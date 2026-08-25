import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Scroll-reveal primitives for the public site.
 *
 * Everything here is deliberately small: content rises a few pixels and
 * settles once. It never repeats, never loops, and collapses to a plain
 * <div> when the visitor has asked for reduced motion.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

/** A single element that reveals when it scrolls into view. */
export function Reveal({
  children,
  className = "",
  delay = 0,
  y = 16,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  as?: "div" | "section" | "li" | "header";
}) {
  const reduce = useReducedMotion();
  const Tag = motion[as] as typeof motion.div;

  if (reduce) {
    const Plain = as as "div";
    return <Plain className={className}>{children}</Plain>;
  }

  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </Tag>
  );
}

const containerVariants: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

/**
 * Container that staggers its `<StaggerItem>` children into view.
 * Use for card grids, ladders and step lists.
 */
export function Stagger({
  children,
  className = "",
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "ul" | "ol";
}) {
  const reduce = useReducedMotion();
  const Tag = motion[as] as typeof motion.div;

  if (reduce) {
    const Plain = as as "div";
    return <Plain className={className}>{children}</Plain>;
  }

  return (
    <Tag
      className={className}
      variants={containerVariants}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.2 }}
    >
      {children}
    </Tag>
  );
}

/** One child of a `<Stagger>`. */
export function StaggerItem({
  children,
  className = "",
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "li";
}) {
  const reduce = useReducedMotion();
  const Tag = motion[as] as typeof motion.div;

  if (reduce) {
    const Plain = as as "div";
    return <Plain className={className}>{children}</Plain>;
  }

  return (
    <Tag className={className} variants={itemVariants}>
      {children}
    </Tag>
  );
}
