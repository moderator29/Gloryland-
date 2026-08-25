import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { CYCLE_DAYS, TIERS } from "@/domain/tiers";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Standards: the commitments the platform holds itself to.
 *
 * This replaces a predecessor strip that scrolled the names of publications as
 * though they were endorsements. None of them had endorsed anything. What
 * scrolls here instead is only what Rigel can be held to by reading its own
 * code: the log is append only, the rate does not vary by tier, settlement
 * targets are published per tier, and the risk is stated rather than buried.
 *
 * No outlet, partner or company is named, because none has said anything.
 */

export type StandardsProps = {
  /** Seconds for one full pass. Longer is calmer. */
  duration?: number;
  className?: string;
};

const FASTEST_SETTLEMENT = Math.min(...TIERS.map((t) => t.settlementHours));

const STANDARDS: string[] = [
  "Append only ledger",
  "Every figure derived from your own record",
  `One rate across every tier, 1% daily for ${CYCLE_DAYS} days`,
  `Settlement targets published, from ${FASTEST_SETTLEMENT} hours`,
  "Risk stated plainly, not buried",
  "No figure shown that the ledger cannot produce",
];

export function Standards({ duration = 44, className = "" }: StandardsProps) {
  const reduce = useReducedMotion();

  const items = STANDARDS.map((text, i) => (
    <span key={`${text}-${i}`} className="flex shrink-0 items-center gap-2 pr-8">
      <ShieldCheck
        className="h-3.5 w-3.5 shrink-0 text-[var(--accent-hi)]"
        strokeWidth={1.8}
        aria-hidden="true"
      />
      <span className="whitespace-nowrap text-xs font-medium text-[var(--text)]">{text}</span>
      <span className="h-1 w-1 shrink-0 rounded-full bg-[var(--line-hi)]" aria-hidden="true" />
    </span>
  ));

  // Reduced motion gets the same words, wrapped and still, with no scroller.
  if (reduce) {
    return (
      <section className={`panel px-4 py-3 ${className}`} aria-label="What Rigel holds itself to">
        <p className="eyebrow mb-2">What we hold ourselves to</p>
        <ul className="flex flex-wrap gap-x-4 gap-y-2">
          {STANDARDS.map((text) => (
            <li key={text} className="flex items-center gap-2">
              <ShieldCheck
                className="h-3.5 w-3.5 shrink-0 text-[var(--accent-hi)]"
                strokeWidth={1.8}
                aria-hidden="true"
              />
              <span className="text-xs font-medium text-[var(--text)]">{text}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section
      className={`panel relative overflow-hidden px-0 py-3 ${className}`}
      aria-label="What Rigel holds itself to"
    >
      <div className="no-bar flex overflow-hidden">
        <motion.div
          className="flex shrink-0"
          animate={{ x: ["0%", "-100%"] }}
          transition={{ duration, ease: "linear", repeat: Infinity }}
        >
          {items}
        </motion.div>
        {/* Second pass carries the loop across the seam. */}
        <motion.div
          className="flex shrink-0"
          animate={{ x: ["0%", "-100%"] }}
          transition={{ duration, ease: "linear", repeat: Infinity }}
          aria-hidden="true"
        >
          {items}
        </motion.div>
      </div>
      {/* Soft edges so words enter and leave rather than being cut. */}
      <span
        className="pointer-events-none absolute inset-y-0 left-0 w-8"
        style={{ background: "linear-gradient(90deg, var(--ink-100), transparent)" }}
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute inset-y-0 right-0 w-8"
        style={{ background: "linear-gradient(270deg, var(--ink-100), transparent)" }}
        aria-hidden="true"
      />
    </section>
  );
}
