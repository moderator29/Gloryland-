import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Clock, Gift, Repeat, Wallet, X } from "lucide-react";
import type { Snapshot } from "@/domain/ledger";
import { money, days } from "@/components/system/format";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { daysAway, deriveAway, markSeen, readLastSeen, type AwayItem } from "./away";

/**
 * The catch up, shown once when a member comes back after a real absence.
 *
 * It is deliberately not a notification centre. There is no unread state, no
 * history and nothing to dismiss item by item, because none of that could be
 * true without a server: every line here is derived from the ledger at the
 * moment it renders. Close it and it is gone, and it will not reappear until
 * the next real absence turns up something new.
 *
 * The timestamp is stamped when the digest is closed rather than on mount, so
 * arriving does not erase the thing the member arrived to find out.
 */

const ICONS = {
  relayDue: Repeat,
  window: Clock,
  claimable: Gift,
  idle: Wallet,
} as const;

export type AwayDigestProps = {
  snap: Snapshot;
  className?: string;
};

export function AwayDigest({ snap, className = "" }: AwayDigestProps) {
  const reduce = useReducedMotion();
  // Read once. Re-reading on every ledger tick would make the digest vanish
  // the moment anything else stamps the timestamp.
  const [lastSeen] = useState(readLastSeen);
  const [closed, setClosed] = useState(false);

  const away = useMemo(() => deriveAway(snap, lastSeen), [snap, lastSeen]);

  // A member with nothing to catch up on still counts as having been here, so
  // the next absence measures from now rather than from months ago.
  useEffect(() => {
    if (!away.show) markSeen();
  }, [away.show]);

  const close = () => {
    markSeen();
    setClosed(true);
  };

  if (!away.show || closed) return null;

  const gap = daysAway(away.gapMs);

  return (
    <AnimatePresence>
      <motion.section
        className={`glass p-5 sm:p-6 ${className}`}
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? undefined : { opacity: 0, y: -8 }}
        transition={{ duration: reduce ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
        aria-labelledby="away-heading"
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="eyebrow">While you were away</p>
            <h2 id="away-heading" className="display mt-1 text-lg sm:text-xl">
              {gap === 1 ? "Since yesterday" : `Over ${gap} days`}
            </h2>
            {away.accruedWhileAway >= 0.01 && (
              <p className="mt-1.5 text-sm text-[var(--text-low)]">
                Your open terms accrued{" "}
                <span className="tabular font-semibold text-[var(--gain)]">
                  {money(away.accruedWhileAway, 2)}
                </span>{" "}
                while you were gone.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Dismiss this summary"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--text-low)] transition-colors hover:bg-[rgba(120,160,220,0.08)] hover:text-[var(--text-hi)]"
          >
            <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <ul className="ledger mt-4">
          {away.items.map((item) => (
            <Row key={`${item.kind}-${item.to}`} item={item} onAct={close} />
          ))}
        </ul>

        {/* The honest limit, stated once. A member who expected an email
            should find out here why one never came. */}
        <p className="mt-4 border-t border-[var(--line)] pt-3 text-[11px] leading-relaxed text-[var(--text-low)]">
          Nothing was sent to you while you were away. This build has no server that could push a
          message, so the product tells you what changed when you next open it instead of pretending
          to have reached you.
        </p>
      </motion.section>
    </AnimatePresence>
  );
}

function Row({ item, onAct }: { item: AwayItem; onAct: () => void }) {
  const Icon = ICONS[item.kind];
  const urgent = item.kind === "relayDue" || item.kind === "window";

  return (
    <li className="rail-row">
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${
          urgent
            ? "border-[var(--line-hi)] bg-[rgba(251,191,36,0.1)]"
            : "border-[var(--line)] bg-[rgba(46,139,255,0.08)]"
        }`}
      >
        <Icon
          className={`h-4 w-4 ${urgent ? "text-[var(--warn)]" : "text-[var(--accent-hi)]"}`}
          strokeWidth={1.9}
          aria-hidden="true"
        />
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold text-[var(--text-hi)]">
          {item.title}
          {item.amount !== undefined && (
            <span className="metric tabular text-[var(--text-hi)]">{money(item.amount)}</span>
          )}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-low)]">{item.body}</p>
        {item.waitingDays !== undefined &&
          item.waitingDays >= 1 &&
          item.costPerDay !== undefined && (
            <p className="mt-1 text-xs text-[var(--warn)]">
              Waiting {days(item.waitingDays)} days, at {money(item.costPerDay, 2)} a day not
              accruing.
            </p>
          )}
      </div>

      <Link to={item.to} onClick={onAct} className="btn btn-outline shrink-0 !py-2 !text-xs">
        {item.action}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </li>
  );
}
