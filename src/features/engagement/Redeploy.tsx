import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowUpRight, Wallet } from "lucide-react";
import type { Snapshot } from "@/domain/ledger";
import { CYCLE_DAYS, DAILY_RATE, TIERS, tierForAmount } from "@/domain/tiers";
import { money } from "@/components/system/format";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Redeploy: idle cash, and what it would open.
 *
 * Every figure comes straight from the snapshot. `snap.available` is settled
 * cash the ledger says is sitting still, the tier is whichever rung that exact
 * amount clears, and the term reward is that amount at the same 1% daily rate
 * every vault pays. Nothing is added to make the prompt more attractive, and
 * the panel disappears entirely when there is nothing idle to place.
 */

export type RedeployProps = {
  snap: Snapshot;
  className?: string;
};

export function Redeploy({ snap, className = "" }: RedeployProps) {
  const reduce = useReducedMotion();
  const idle = snap.available;
  const entry = TIERS[0].entry;

  // Below the first entry there is no vault to open, so there is no prompt.
  if (idle < entry) return null;

  // Whole dollars, so the amount named here is the amount the form receives.
  const placeable = Math.floor(idle);
  const tier = tierForAmount(placeable) ?? TIERS[0];
  const termReward = placeable * DAILY_RATE * CYCLE_DAYS;

  return (
    <motion.section
      className={`panel edge-light p-4 sm:p-5 ${className}`}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : { duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      aria-labelledby="redeploy-title"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-[rgba(46,139,255,0.07)]">
          <Wallet
            className="h-4 w-4 text-[var(--accent-hi)]"
            strokeWidth={1.8}
            aria-hidden="true"
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Idle capital</p>
          <h3 id="redeploy-title" className="mt-1 text-[15px] font-semibold text-[var(--text-hi)]">
            <span className="tabular">{money(idle, 2)}</span> is sitting still
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-low)]">
            Placed today at <span className="tabular text-[var(--text)]">{money(placeable)}</span>,
            it opens a {tier.name} vault and returns{" "}
            <span className="tabular text-[var(--gain)]">{money(termReward, 2)}</span> over the{" "}
            {CYCLE_DAYS} day term. Cash that is not deployed accrues nothing.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="chip chip-accent">
              {tier.name} entry {money(tier.entry)}
            </span>
            <span className="chip">1% daily for {CYCLE_DAYS} days</span>
          </div>

          <Link
            to={`/app/vaults/new?amount=${placeable}&source=balance`}
            className="btn btn-primary mt-4 w-full sm:w-auto"
          >
            Redeploy {money(placeable)}
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </motion.section>
  );
}
