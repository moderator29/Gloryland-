import { useRef, useState } from "react";
import { motion, useAnimationFrame, useMotionValue } from "framer-motion";
import { Pause, Play, ShieldCheck } from "lucide-react";
import { DAILY_RATE, TIERS, WITHDRAW_INTERVAL_DAYS } from "@/domain/tiers";
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
  /**
   * Roughly how many seconds one pass takes. It sets a pace rather than a
   * duration now: the strip is driven per frame so it can be stopped and
   * resumed without jumping back to the start, and a per frame scroller works
   * in pixels a second. PASS_PX is the width of one pass at the default six
   * items, so the default reads at the speed it always did.
   */
  duration?: number;
  className?: string;
};

/** Approximate width of one pass, in pixels. See `duration`. */
const PASS_PX = 1400;

const FASTEST_SETTLEMENT = Math.min(...TIERS.map((t) => t.settlementHours));

const STANDARDS: string[] = [
  "Append only ledger",
  "Every figure derived from your own record",
  `One rate across every tier, ${(DAILY_RATE * 100).toFixed(0)}% of principal a day`,
  `Withdrawals open every ${WITHDRAW_INTERVAL_DAYS} days, on every rung`,
  `Settlement targets published, from ${FASTEST_SETTLEMENT} hours`,
  "Risk stated plainly, not buried",
  "Every figure of yours derived, anything illustrative labelled",
];

export function Standards({ duration = 44, className = "" }: StandardsProps) {
  const reduce = useReducedMotion();

  // WCAG 2.2.2: anything that moves for longer than five seconds needs a way
  // to stop it, and a way a keyboard can reach. Three inputs stop this strip:
  // the pointer, focus landing anywhere inside it, and the explicit control in
  // the header, which is the one that satisfies the criterion.
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [stopped, setStopped] = useState(false);
  const paused = hovered || focused || stopped;

  const x = useMotionValue(0);
  const track = useRef<HTMLDivElement>(null);

  useAnimationFrame((_, delta) => {
    // The hook has to sit above the reduced motion return below, so the still
    // branch never attaches the track and this bails on the first line.
    if (paused || reduce) return;
    // Half the track is one pass: the second copy exists to carry the seam.
    const run = (track.current?.scrollWidth ?? 0) / 2;
    if (run <= 0) return;
    let next = x.get() - (delta / 1000) * (PASS_PX / duration);
    if (next <= -run) next += run;
    x.set(next);
  });

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
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <div className="mb-2 flex items-center gap-3 px-4">
        <p className="eyebrow min-w-0 truncate">What we hold ourselves to</p>
        <span aria-hidden="true" className="hairline" />
        <button
          type="button"
          className="min-h-[36px] btn btn-ghost shrink-0 !py-1.5 !text-[11px]"
          aria-pressed={stopped}
          onClick={() => setStopped((v) => !v)}
        >
          {stopped ? (
            <Play className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          ) : (
            <Pause className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          )}
          {stopped ? "Resume" : "Pause"}
        </button>
      </div>

      <div className="no-bar overflow-hidden">
        <motion.div ref={track} style={{ x }} className="flex w-max">
          <div className="flex shrink-0">{items}</div>
          {/* Second pass carries the loop across the seam. */}
          <div className="flex shrink-0" aria-hidden="true">
            {items}
          </div>
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
