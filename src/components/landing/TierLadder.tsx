import { Link } from "react-router-dom";
import { ArrowUpRight, ChevronRight, Timer } from "lucide-react";
import { CYCLE_DAYS, CYCLE_RETURN, TIERS, termReward } from "@/domain/tiers";
import { money } from "@/components/system/format";
import { Counter } from "./Counter";
import { TERM_RATE, TOP_TIER } from "./figures";
import { Stagger, StaggerItem } from "./Reveal";

/**
 * The ladder.
 *
 * Not a pricing table. Every rung carries the same rate, so a column grid
 * comparing prices would be lying about what actually changes between them.
 * It is drawn as a ledger instead: ruled rows behind an accent rail, with the
 * rate column repeating the identical figure six times, because the repetition
 * is the argument. Settlement is the column that moves.
 *
 * Every rung is a link to its own detail route, so the page hands a visitor
 * straight to the rung they were reading rather than to a generic sign up.
 */

const TOP = TOP_TIER.entry;

export function TierLadder() {
  return (
    <div>
      {/* The constant, stated once before the rows repeat it. */}
      <div className="panel-hi edge-light flex flex-wrap items-center justify-between gap-x-6 gap-y-4 p-5 sm:p-6">
        <div className="min-w-0">
          <p className="eyebrow">Rate at every rung</p>
          <p className="figure-lead mt-2 text-[var(--accent-hi)]">
            <Counter value={CYCLE_RETURN * 100} format={(n) => `${n.toFixed(0)}%`} />
          </p>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-[var(--text-mid)]">
          {TERM_RATE} over {CYCLE_DAYS} days, from {TIERS[0].name} at {money(TIERS[0].entry)} to{" "}
          {TOP_TIER.name} at {money(TOP)}. Climbing the ladder buys settlement speed and tooling. It
          does not buy a better number.
        </p>
      </div>

      <Stagger as="ol" className="ledger mt-6">
        {TIERS.map((tier, i) => {
          const last = i === TIERS.length - 1;
          const reach = (tier.entry / TOP) * 100;

          return (
            <StaggerItem as="li" key={tier.id} className="min-w-0">
              <Link
                to={`/app/tiers/${tier.id}`}
                className={`rail-row sheen group !items-start gap-3 sm:gap-4 ${
                  last ? "!border-b-0" : ""
                }`}
              >
                <span
                  aria-hidden="true"
                  className="metric mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--line)] bg-[rgba(46,139,255,0.07)] text-[13px] text-[var(--accent-hi)]"
                >
                  {tier.rank}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                    <span className="text-[15px] font-semibold text-[var(--text-hi)] sm:text-base">
                      {tier.name}
                    </span>
                    {/* The same chip on all six rows. The repetition is the point. */}
                    <span className="chip chip-accent tabular">{TERM_RATE} term</span>
                  </span>

                  <span className="mt-1 block text-xs text-[var(--text-low)]">
                    <span className="metric text-[var(--text-mid)]">from {money(tier.entry)}</span>
                    <span className="mx-1.5">&middot;</span>
                    {money(termReward(tier.entry))} at maturity on the entry amount
                  </span>

                  <span className="mt-1.5 hidden text-sm leading-relaxed text-[var(--text-mid)] sm:block">
                    {tier.blurb}
                  </span>

                  {/* Where the entry threshold sits against the top of the ladder. */}
                  <span
                    aria-hidden="true"
                    className="mt-3 block h-1 w-full overflow-hidden rounded-full bg-[rgba(5,7,15,0.7)]"
                  >
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${reach}%`,
                        background:
                          "linear-gradient(90deg, var(--accent-deep), var(--accent), var(--accent-soft))",
                      }}
                    />
                  </span>
                </span>

                <span className="flex shrink-0 items-center gap-3 pt-0.5 sm:gap-5">
                  <span className="text-right">
                    <span className="tag-micro">Settles</span>
                    <span className="metric mt-1 flex items-center justify-end gap-1.5 text-base sm:text-lg">
                      <Timer
                        className="h-3.5 w-3.5 text-[var(--text-low)]"
                        strokeWidth={1.9}
                        aria-hidden="true"
                      />
                      {tier.settlementHours}h
                    </span>
                  </span>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-[var(--text-low)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--accent-hi)]"
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </StaggerItem>
          );
        })}
      </Stagger>

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <Link to="/app/tiers/compare" className="btn btn-outline text-[13px]">
          Compare the rungs
          <ArrowUpRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </Link>
        <Link to="/app/tiers/match" className="btn btn-ghost text-[13px]">
          Find the rung that fits
        </Link>
      </div>

      <p className="mt-5 text-xs leading-relaxed text-[var(--text-low)]">
        Settlement figures are the targets the desk works to, measured from an approved withdrawal
        request. They are operational objectives, not contractual guarantees, and network conditions
        or review checks can extend them.
      </p>
    </div>
  );
}
