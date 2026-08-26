import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Check, Layers } from "lucide-react";
import type { Snapshot } from "@/domain/ledger";
import { DAILY_RATE, TIERS } from "@/domain/tiers";
import { money } from "@/components/system/format";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { MINIMUM_PLACEMENT, TOP_TIER, ladderSteps, planFor } from "./plan";

/**
 * Ladder: the rungs still above the member, priced honestly.
 *
 * Every rung earns the same rate, so this is not a list of better returns. It
 * is a list of what each rung costs to reach and what it changes when you get
 * there, which is settlement speed and access. The capital figure on each row
 * is the real gap against lifetime contribution, raised to the smallest
 * position that can actually be opened when the gap is smaller than that, and
 * the row says so rather than naming an amount the deposit form would reject.
 */

export type LadderProps = {
  snap: Snapshot;
  className?: string;
};

function Standing({ snap }: { snap: Snapshot }) {
  const tier = snap.tier;
  return (
    <div className="inset flex flex-wrap items-center justify-between gap-x-5 gap-y-2.5 p-3.5">
      <div className="min-w-0">
        <p className="tag-micro">Your rung</p>
        <p className="mt-1.5 flex items-center gap-2 text-[15px] font-semibold text-[var(--text-hi)]">
          <span
            className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[var(--accent)] bg-[var(--accent)]"
            aria-hidden="true"
          >
            <Check className="h-3 w-3 text-[#04101f]" strokeWidth={3.5} />
          </span>
          {tier ? tier.name : "Unranked"}
        </p>
      </div>
      <div className="text-right">
        <p className="tag-micro">Contributed</p>
        <p className="metric mt-1.5 text-sm">{money(snap.standing)}</p>
      </div>
      <div className="text-right">
        <p className="tag-micro">Settlement</p>
        <p className="metric mt-1.5 text-sm">
          {tier ? `${tier.settlementHours}h` : `${TIERS[0].settlementHours}h at ${TIERS[0].name}`}
        </p>
      </div>
    </div>
  );
}

export function Ladder({ snap, className = "" }: LadderProps) {
  const reduce = useReducedMotion();
  const steps = ladderSteps(snap);

  // Standing is measured on lifetime contribution, which only ever rises, so
  // an empty step list means the top rung is held rather than merely reached.
  const atTop = steps.length === 0;
  const top = planFor(snap, TOP_TIER.entry);

  return (
    <section className={`panel p-4 sm:p-5 ${className}`} aria-labelledby="ladder-title">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-[rgba(46,139,255,0.07)]">
          <Layers
            className="h-4 w-4 text-[var(--accent-hi)]"
            strokeWidth={1.8}
            aria-hidden="true"
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Ladder</p>
          <h2 id="ladder-title" className="mt-1 text-[15px] font-semibold text-[var(--text-hi)]">
            {atTop ? "You hold the top rung" : "What the next rungs cost"}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-low)]">
            Every rung earns the same {(DAILY_RATE * 100).toFixed(0)}% of principal a day. Climbing
            buys faster settlement and deeper access, never a better rate.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <Standing snap={snap} />
      </div>

      {atTop ? (
        <div className="mt-4">
          <p className="text-sm leading-relaxed text-[var(--text-low)]">
            {TOP_TIER.name} is the last rung, and standing is measured on lifetime contribution, so
            it stays yours. Further capital does not buy a higher rate because there is not one. It
            buys accrual: a position at {money(TOP_TIER.entry)} adds{" "}
            <span className="tabular text-[var(--gain)]">{money(top.daily, 2)}</span> a day, for as
            long as you leave it in place, taking your combined daily accrual to{" "}
            <span className="tabular text-[var(--gain)]">{money(top.combinedDaily, 2)}</span>.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="chip chip-accent">{TOP_TIER.settlementHours}h settlement held</span>
            <span className="chip">Same rate on every rung</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to={`/app/vaults/new?amount=${TOP_TIER.entry}`} className="btn btn-primary">
              Open another position
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link to={`/app/tiers/${TOP_TIER.id}`} className="btn btn-outline">
              What {TOP_TIER.name} includes
            </Link>
          </div>
        </div>
      ) : (
        <ol className="ledger mt-4">
          {steps.map((step, i) => (
            <motion.li
              key={step.tier.id}
              className="rail-row flex-col items-stretch gap-3 sm:flex-row sm:items-center"
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduce ? { duration: 0 } : { duration: 0.3, delay: i * 0.04, ease: "easeOut" }
              }
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1.5">
                  <Link
                    to={`/app/tiers/${step.tier.id}`}
                    className="text-sm font-semibold text-[var(--text-hi)] underline-offset-4 hover:text-[var(--accent-hi)] hover:underline"
                  >
                    {step.tier.name}
                  </Link>
                  <span className="tabular text-xs text-[var(--text-low)]">
                    entry {money(step.tier.entry)}
                  </span>
                  <span className="chip">{step.tier.settlementHours}h settlement</span>
                </div>

                <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">
                  <div className="min-w-0">
                    <dt className="tag-micro">From here</dt>
                    <dd className="metric mt-1 text-sm">{money(step.placement)}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="tag-micro">That earns daily</dt>
                    <dd className="metric mt-1 text-sm text-[var(--gain)]">
                      {money(step.daily, 2)}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="tag-micro">Your daily then</dt>
                    <dd className="metric mt-1 text-sm text-[var(--gain)]">
                      {money(step.combinedDaily, 2)}
                    </dd>
                  </div>
                </dl>

                {step.roundedUp && (
                  <p className="mt-2.5 text-[11px] leading-relaxed text-[var(--text-low)]">
                    The gap to {step.tier.name} is {money(step.gap)}, but {money(MINIMUM_PLACEMENT)}{" "}
                    is the smallest position that can be opened, so that is what this places.
                  </p>
                )}
              </div>

              <Link
                to={`/app/vaults/new?amount=${step.placement}`}
                className="btn btn-secondary shrink-0 sm:min-w-[10rem]"
                aria-label={`Place ${money(step.placement)} toward ${step.tier.name}`}
              >
                Place {money(step.placement)}
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </motion.li>
          ))}
        </ol>
      )}
    </section>
  );
}
