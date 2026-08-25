import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Sunrise } from "lucide-react";
import type { Snapshot } from "@/domain/ledger";
import { CYCLE_DAYS, CYCLE_RETURN, DAILY_RATE, TIERS } from "@/domain/tiers";
import { money } from "@/components/system/format";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * First Light: the introduction shown before a member's first placement.
 *
 * This is an explanation, not an offer. The predecessor to this panel promised
 * a bonus on a first deposit, which the ledger has no event for and therefore
 * could never pay. What is shown instead is the ordinary arithmetic every vault
 * follows, worked through at the Core entry so the member can see the shape of
 * a term before committing anything: principal, 1% of it per day, thirty days.
 *
 * It renders only while the ledger holds no positions at all.
 */

export type FirstLightProps = {
  snap: Snapshot;
  className?: string;
};

export function FirstLight({ snap, className = "" }: FirstLightProps) {
  const reduce = useReducedMotion();

  // Once anything has been placed, the introduction has served its purpose.
  if (snap.positions.length > 0) return null;

  const core = TIERS[0];
  const perDay = core.entry * DAILY_RATE;
  const termReward = core.entry * CYCLE_RETURN;
  const returned = core.entry + termReward;

  const steps: { label: string; value: string }[] = [
    { label: "You place", value: money(core.entry) },
    { label: `Each day for ${CYCLE_DAYS} days`, value: `${money(perDay, 2)} accrues` },
    { label: "Term reward", value: money(termReward) },
    { label: `At day ${CYCLE_DAYS}`, value: `${money(returned)} returned` },
  ];

  return (
    <motion.section
      className={`panel-hi edge-light p-4 sm:p-6 ${className}`}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      aria-labelledby="first-light-title"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-[var(--line-hi)] bg-[rgba(46,139,255,0.08)]">
          <Sunrise
            className="h-5 w-5 text-[var(--accent-hi)]"
            strokeWidth={1.7}
            aria-hidden="true"
          />
        </span>
        <div className="min-w-0">
          <p className="eyebrow">First light</p>
          <h3 id="first-light-title" className="display mt-0.5 text-lg sm:text-xl">
            How a vault works, before you open one
          </h3>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-[var(--text-low)]">
        A vault holds capital for a fixed {CYCLE_DAYS} day term. It accrues 1% of the principal
        every day, which is {(CYCLE_RETURN * 100).toFixed(0)}% across the full term, and the rate is
        the same at every tier. Here is that arithmetic at the {core.name} entry.
      </p>

      <ol className="ledger mt-4">
        {steps.map((s) => (
          <li key={s.label} className="rail-row">
            <span className="min-w-0 flex-1 text-sm text-[var(--text)]">{s.label}</span>
            <span className="metric shrink-0 text-sm text-[var(--text-hi)]">{s.value}</span>
          </li>
        ))}
      </ol>

      <p className="mt-3 text-xs leading-relaxed text-[var(--text-low)]">
        Worked at {money(core.entry)} for illustration. Your own term is worked from whatever you
        place. Capital is committed for the full {CYCLE_DAYS} days and the programme carries risk,
        which is set out in the terms.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link to="/app/vaults/new" className="btn btn-primary w-full sm:w-auto">
          Open your first vault
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <Link to="/app/tiers" className="btn btn-outline w-full sm:w-auto">
          See the tiers
        </Link>
      </div>
    </motion.section>
  );
}
