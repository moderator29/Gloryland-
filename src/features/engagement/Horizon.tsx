import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { CalendarClock } from "lucide-react";
import { DAY_MS, type Snapshot } from "@/domain/ledger";
import { WITHDRAW_INTERVAL_DAYS } from "@/domain/tiers";
import { Value } from "@/components/system/Value";
import { money, days as fmtDays, fullDate } from "@/components/system/format";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Countdown } from "./Countdown";

/**
 * Horizon: where the account sits in its withdrawal window.
 *
 * This rail used to plot the next ninety days of maturing capital. Nothing
 * matures now, so there is nothing to plot on that axis: a position accrues
 * until it is closed and no date arrives on its own. The one date the ledger
 * can still name is when cash may next leave the account, and that is what the
 * rail measures.
 *
 * It spans one interval: from the last withdrawal request to the moment the
 * next one is allowed, with now marked between them. A member who has never
 * requested a withdrawal is already at the far end of it, because the interval
 * measures the gap after a request and there is no gap before the first one.
 *
 * The figure beside it is available cash, which is what a request could
 * actually move. Nothing here quotes what an open position might be worth
 * later: that depends on how long it is left in place, which is the member's
 * decision and not a figure this rail may assume.
 */

export type HorizonProps = {
  snap: Snapshot;
  className?: string;
};

function clamp(n: number, lo: number, hi: number) {
  return n < lo ? lo : n > hi ? hi : n;
}

export function Horizon({ snap, className = "" }: HorizonProps) {
  const reduce = useReducedMotion();
  const now = Date.now();

  const open = snap.withdrawAllowed;
  const unlocksAt = snap.withdrawUnlocksAt;
  const from = snap.lastWithdrawAt ?? unlocksAt;
  const span = Math.max(1, unlocksAt - from);
  // Where now sits between the last request and the next window. An account
  // that has never requested one reads a full rail, because it is already at
  // the end of the interval rather than at the start of one.
  const progress = open ? 1 : clamp((now - from) / span, 0, 1);

  return (
    <section className={`panel p-4 sm:p-5 ${className}`} aria-labelledby="withdraw-window-title">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-[rgba(46,139,255,0.07)]">
          <CalendarClock
            className="h-4 w-4 text-[var(--accent-hi)]"
            strokeWidth={1.8}
            aria-hidden="true"
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Withdrawal window</p>
          <h3
            id="withdraw-window-title"
            className="mt-1 text-[15px] font-semibold text-[var(--text-hi)]"
          >
            {open ? "A request can be filed now" : <Countdown to={unlocksAt} />}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-low)]">
            {open ? (
              <>
                A withdrawal can be requested once every {WITHDRAW_INTERVAL_DAYS} days, and the
                window is open.{" "}
                {snap.available > 0 ? (
                  <>
                    <span className="tabular text-[var(--text)]">{money(snap.available, 2)}</span>{" "}
                    is available to move.
                  </>
                ) : (
                  "There is nothing in your balance to move yet."
                )}
              </>
            ) : (
              <>
                The last request was {fullDate(snap.lastWithdrawAt ?? now)}. The next one can be
                filed {fullDate(unlocksAt)}, which is {fmtDays((unlocksAt - now) / DAY_MS)} days
                away.
              </>
            )}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div
          className="relative h-1.5 overflow-hidden rounded-full bg-[var(--line)]"
          role="img"
          aria-label={
            open
              ? "The withdrawal window is open"
              : `Withdrawal window opens ${fullDate(unlocksAt)}`
          }
        >
          <motion.span
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              background: open
                ? "linear-gradient(90deg, var(--accent-soft), var(--gain))"
                : "linear-gradient(90deg, var(--accent-soft), var(--accent))",
            }}
            initial={reduce ? false : { width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            transition={reduce ? { duration: 0 } : { duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <div className="mt-2 flex justify-between gap-2 text-[11px] text-[var(--text-low)]">
          <span>{snap.lastWithdrawAt === null ? "No request filed" : "Last request"}</span>
          <span>{open ? "Open" : fullDate(unlocksAt)}</span>
        </div>
      </div>

      <dl className="ledger mt-4">
        <div className="rail-row">
          <dt className="min-w-0 flex-1 text-xs text-[var(--text-low)]">Available to withdraw</dt>
          <dd className="metric tabular shrink-0 text-sm">
            <Value value={snap.available} decimals={2} />
          </dd>
        </div>
        <div className="rail-row">
          <dt className="min-w-0 flex-1 text-xs text-[var(--text-low)]">Accruing right now</dt>
          <dd className="metric tabular shrink-0 text-sm text-[var(--gain)]">
            {money(snap.dailyRate, 2)} / day
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-[11px] leading-relaxed text-[var(--text-low)]">
        The interval is the same at every rung. Standing buys a faster settlement target on a
        request, never a more frequent one.
      </p>

      <Link to="/app/horizon" className="btn btn-ghost mt-3 !px-2.5 !py-1.5 !text-xs">
        See every window
      </Link>
    </section>
  );
}
