import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Sunrise } from "lucide-react";
import type { Snapshot } from "@/domain/ledger";
import { DAILY_RATE, TIERS, WITHDRAW_INTERVAL_DAYS, rewardOver } from "@/domain/tiers";
import { money } from "@/components/system/format";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * First Light: the introduction shown before a member's first placement.
 *
 * This is an explanation, not an offer. The predecessor to this panel promised
 * a bonus on a first deposit, which the ledger has no event for and therefore
 * could never pay. What is shown instead is the ordinary arithmetic every vault
 * follows, worked through at the Core entry so the member can see the shape of
 * it before committing anything: principal, the published fraction of it per
 * day, and no end date.
 *
 * The worked rows name the stretch they cover. There is no term, so a total has
 * to say how many days it is a total of, or it is a figure the product cannot
 * derive.
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

  const steps: { label: string; value: string }[] = [
    { label: "You place", value: money(core.entry) },
    { label: "Every day it stays there", value: `${money(perDay, 2)} accrues` },
    {
      label: `After ${WITHDRAW_INTERVAL_DAYS} days, when a withdrawal can be requested`,
      value: `${money(rewardOver(core.entry, WITHDRAW_INTERVAL_DAYS), 2)} accrued`,
    },
    { label: "After thirty days", value: `${money(rewardOver(core.entry, 30))} accrued` },
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
        A vault accrues {(DAILY_RATE * 100).toFixed(0)}% of its principal every day it is left in
        place. There is no term and no maturity, so how much it accrues depends on how long you
        leave it there, and the rate is the same at every tier. Here is that arithmetic at the{" "}
        {core.name} entry.
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
        Worked at {money(core.entry)} for illustration, over stretches of days chosen to show the
        shape. Your own figures are worked from whatever you place and from however long you leave
        it. Capital is at risk. Rates are targets, not guarantees.
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
