import { useState } from "react";
import { CYCLE_DAYS, TIERS, dailyReward, termReward } from "@/domain/tiers";
import { money } from "@/components/system/format";
import { Value } from "@/components/system/Value";
import { DAY_RATE, TERM_RATE, entryLabel } from "./figures";

/**
 * The term, worked through live.
 *
 * Not an illustration of a product: it is the product's own arithmetic, run
 * against a principal the visitor picks. Every figure comes from
 * `domain/tiers`, so this panel cannot drift away from what the portal will
 * actually compute, and the formula is printed above the result so the
 * numbers can be checked by hand rather than taken on trust.
 *
 * The sizes offered are the six entry thresholds, which keeps the control
 * honest: these are the amounts the ladder is actually built on.
 */

const SIZES = TIERS.map((t) => t.entry);

export function TermWorkedExample() {
  // Opening on the second rung rather than the first: it is a round number,
  // and it makes the per day figure legible without decimals doing the work.
  const [principal, setPrincipal] = useState(TIERS[1].entry);

  const perDay = dailyReward(principal);
  const reward = termReward(principal);
  const matured = principal + reward;

  return (
    <div className="inset p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h2 className="eyebrow">Work the term</h2>
        <p className="machine break-normal text-[11px] text-[var(--text-low)] sm:text-[12px]">
          principal &times; {DAY_RATE} &times; {CYCLE_DAYS} days = {TERM_RATE}
        </p>
      </div>

      <div
        role="group"
        aria-label="Position size"
        className="mt-4 grid grid-cols-3 gap-1.5 sm:grid-cols-6"
      >
        {SIZES.map((amount) => {
          const on = amount === principal;
          return (
            <button
              key={amount}
              type="button"
              aria-pressed={on}
              onClick={() => setPrincipal(amount)}
              className={`min-h-[36px] metric rounded-lg border py-2 text-[13px] transition-colors ${
                on
                  ? "border-[rgba(46,139,255,0.5)] bg-[rgba(46,139,255,0.16)] text-[var(--accent-hi)]"
                  : "border-[var(--line)] bg-[rgba(5,7,15,0.5)] text-[var(--text-mid)] hover:border-[var(--line-hi)] hover:text-[var(--text-hi)]"
              }`}
            >
              {entryLabel(amount)}
            </button>
          );
        })}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 lg:grid-cols-4">
        <Figure label="Principal" value={money(principal)} />
        <Figure label="Per day" value={money(perDay, 2)} />
        <Figure label={`Reward, day ${CYCLE_DAYS}`} value={money(reward)} tone="gain" />
        <div className="min-w-0">
          <dt className="tag-micro block min-h-[2.2em]">At maturity</dt>
          {/* Eases between sizes rather than snapping, and lands instantly
              under reduced motion, because Value gates on the same hook. */}
          <dd className="metric tabular mt-1 truncate text-xl text-[var(--accent-hi)] sm:text-2xl">
            <Value value={matured} />
          </dd>
        </div>
      </dl>

      <p className="mt-4 border-t border-[var(--line)] pt-3 text-[11px] leading-relaxed text-[var(--text-low)]">
        Arithmetic from the published term structure, applied to a principal you chose. It is not a
        forecast, not an offer, and not a guarantee that the amount will be paid.
      </p>
    </div>
  );
}

function Figure({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "gain";
}) {
  return (
    <div className="min-w-0">
      {/* Reserved height, because "Reward, day 30" wraps to two lines while
          "Per day" does not, and a ragged baseline reads as a broken grid. */}
      <dt className="tag-micro block min-h-[2.2em]">{label}</dt>
      <dd
        className={`metric tabular mt-1 truncate text-xl sm:text-2xl ${
          tone === "gain" ? "text-[var(--gain)]" : "text-[var(--text-hi)]"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
