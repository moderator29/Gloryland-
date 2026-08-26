import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Lock, Plus } from "lucide-react";
import type { Position, Snapshot } from "@/domain/ledger";
import { TIERS, dailyReward } from "@/domain/tiers";
import { money, fullDate, days } from "@/components/system/format";
import { MINIMUM_PLACEMENT, planFor } from "./plan";

/**
 * TopUp: what actually happens when a member wants to add capital.
 *
 * A running position has a fixed principal. It was set by the event that
 * opened the position and every figure that position produces follows from it,
 * so there is no such thing as topping one up. Capital added today opens a
 * second position that accrues beside the first, and this component says that
 * first and then shows both side by side.
 *
 * Nothing here writes to the ledger. The deposit flow owns that, and this
 * hands the amount to it on the query string so the figures a member read
 * here are the figures the form opens with.
 */

/**
 * Entry amounts offered as one tap.
 *
 * Every third rung, plus the two ends, because twenty buttons would be a price
 * list rather than a shortcut. `Tiers` carries the whole ladder.
 */
const ENTRY_SHORTCUTS = TIERS.filter(
  (t, i) => i === 0 || i === TIERS.length - 1 || i % 4 === 0,
).slice(0, 6);

export type TopUpProps = {
  snap: Snapshot;
  /** The running position in view. Defaults to the one that has run longest. */
  position?: Position;
  /** Amount the field opens with. */
  initialAmount?: number;
  className?: string;
};

export function TopUp({ snap, position, initialAmount, className = "" }: TopUpProps) {
  const [amount, setAmount] = useState(initialAmount ? String(initialAmount) : "");
  const value = Number(amount) || 0;
  const plan = useMemo(() => planFor(snap, value), [snap, value]);

  // Without an explicit position, the oldest running one is the one a member
  // is most likely asking about: it is the one they have been watching longest.
  const existing = useMemo(() => {
    if (position) return position;
    return [...snap.activePositions].sort((a, b) => a.startsAt - b.startsAt)[0] ?? null;
  }, [position, snap.activePositions]);

  return (
    <section className={`panel p-4 sm:p-5 ${className}`} aria-labelledby="topup-title">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-[rgba(46,139,255,0.07)]">
          <Lock className="h-4 w-4 text-[var(--accent-hi)]" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Adding capital</p>
          <h2 id="topup-title" className="mt-1 text-[15px] font-semibold text-[var(--text-hi)]">
            A new position, not a larger one
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-low)]">
            {existing ? (
              <>
                Your {existing.tier.name} vault opened {fullDate(existing.openedAt)} with{" "}
                <span className="tabular text-[var(--text)]">{money(existing.principal)}</span> and
                has been accruing {days(existing.daysElapsed)} days since. That principal was fixed
                the moment it opened and cannot be added to. Capital placed today opens a second
                position that accrues alongside it, and the first one carries on exactly as it
                stands.
              </>
            ) : (
              <>
                You have nothing running, so this would be your first position. A position holds a
                fixed principal from the day it opens, which is why capital added later always opens
                a new one rather than changing an old one.
              </>
            )}
          </p>
        </div>
      </div>

      {/* ── Amount ── */}
      <div className="mt-5">
        <label htmlFor="topup-amount" className="eyebrow">
          New position
        </label>
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-[var(--line-hi)] bg-[rgba(5,7,15,0.6)] px-4 py-3 focus-within:border-[var(--accent)]">
          <span className="text-lg text-[var(--text-low)]" aria-hidden="true">
            $
          </span>
          <input
            id="topup-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="0"
            className="metric w-full bg-transparent text-2xl outline-none placeholder:text-[var(--text-low)]"
          />
        </div>

        {/* Twenty rungs is more than a row of buttons can carry, so the shortcuts
            step through the ladder rather than listing every rung. The full
            ladder is one tap away on Tiers. */}
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {ENTRY_SHORTCUTS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setAmount(String(t.entry))}
              aria-pressed={value === t.entry}
              className={`min-h-[40px] rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${
                value === t.entry
                  ? "border-[rgba(46,139,255,0.5)] bg-[rgba(46,139,255,0.14)] text-[var(--accent-hi)]"
                  : "border-[var(--line)] text-[var(--text-mid)] hover:border-[var(--line-hi)]"
              }`}
            >
              {money(t.entry)}
            </button>
          ))}
        </div>

        {!plan.openable && (
          <p className="mt-3 text-xs text-[var(--text-low)]">
            {money(MINIMUM_PLACEMENT)} is the smallest position that can be opened, at{" "}
            {TIERS[0].name}.
          </p>
        )}
      </div>

      {/* ── What the new term does, and what the two together become ── */}
      {plan.openable && plan.tier && (
        <>
          <div className="inset mt-4 p-3.5">
            <div className="flex items-center justify-between gap-3">
              <p className="tag-micro">This position alone</p>
              <span className="chip chip-accent">{plan.tier.name}</span>
            </div>
            {/* Per day is the only figure the model can state on its own. The
                two beside it name the stretch they cover, because how long the
                position runs is the member's decision and not an assumption
                this panel may make for them. */}
            <dl className="mt-3 grid grid-cols-3 gap-3">
              <div className="min-w-0">
                <dt className="text-[11px] text-[var(--text-low)]">Per day</dt>
                <dd className="metric mt-1 text-base text-[var(--gain)]">{money(plan.daily, 2)}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[11px] text-[var(--text-low)]">Over four days</dt>
                <dd className="metric mt-1 text-base text-[var(--gain)]">
                  {money(plan.daily * 4, 2)}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[11px] text-[var(--text-low)]">Over thirty days</dt>
                <dd className="metric mt-1 text-base text-[var(--gain)]">
                  {money(plan.daily * 30)}
                </dd>
              </div>
            </dl>
            {plan.nextTier && (
              <p className="mt-3 text-[11px] leading-relaxed text-[var(--text-low)]">
                {money(plan.gapToNext)} more would place it at {plan.nextTier.name},{" "}
                {plan.nextTier.settlementHours}h settlement.{" "}
                <button
                  type="button"
                  onClick={() => setAmount(String(plan.nextTier?.entry ?? ""))}
                  className="font-semibold text-[var(--accent-hi)] underline-offset-4 hover:underline"
                >
                  Use {money(plan.nextTier.entry)}
                </button>
              </p>
            )}
          </div>

          <div className="ledger mt-4">
            {existing && (
              <div className="rail-row">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text-hi)]">
                    {existing.tier.name} vault, untouched
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--text-low)]">
                    {money(existing.principal)} · opened {fullDate(existing.openedAt)} ·{" "}
                    {days(existing.daysElapsed)} days accruing
                  </p>
                </div>
                <p className="metric shrink-0 text-right text-sm text-[var(--gain)]">
                  {money(existing.dailyReward, 2)}
                  <span className="text-[11px] font-normal text-[var(--text-low)]">/day</span>
                </p>
              </div>
            )}

            <div className="rail-row">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-medium text-[var(--text-hi)]">
                  <Plus className="h-3.5 w-3.5 text-[var(--accent-hi)]" aria-hidden="true" />
                  {plan.tier.name} vault, new position
                </p>
                <p className="mt-0.5 text-xs text-[var(--text-low)]">
                  {money(plan.amount)} · opens on confirmation · accrues from that instant
                </p>
              </div>
              <p className="metric shrink-0 text-sm text-[var(--gain)]">
                {money(plan.daily, 2)}
                <span className="text-[11px] font-normal text-[var(--text-low)]">/day</span>
              </p>
            </div>

            <div className="rail-row rail-row-gain">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--text-hi)]">Combined daily accrual</p>
                <p className="mt-0.5 text-xs text-[var(--text-low)]">
                  {money(plan.currentDaily, 2)} a day across what is already running
                </p>
              </div>
              <p className="metric shrink-0 text-base text-[var(--gain)]">
                {money(plan.combinedDaily, 2)}
              </p>
            </div>
          </div>
        </>
      )}

      <div className="mt-4">
        {plan.openable ? (
          <Link
            to={`/app/vaults/new?amount=${plan.amount}`}
            className="btn btn-primary w-full sm:w-auto"
          >
            Open a {money(plan.amount)} position
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : (
          <button type="button" className="btn btn-primary w-full sm:w-auto" disabled>
            Open a position
          </button>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-[var(--text-low)]">
          This plans only. Accrual starts when the deposit is confirmed in the vault flow, and the
          amount above is carried through to it.
        </p>
      </div>
    </section>
  );
}
