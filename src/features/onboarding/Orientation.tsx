import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Compass, X } from "lucide-react";
import { DAILY_RATE, WITHDRAW_INTERVAL_DAYS } from "@/domain/tiers";
import { useLedger } from "@/hooks/useLedger";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Orientation banner.
 *
 * The quietest possible pointer at the first run introduction. It appears on
 * Home only while both things are true: the member has never finished
 * orientation, and they hold no positions. The moment either changes it
 * renders nothing, so it can never become furniture on an established
 * account.
 *
 * Completion lives in localStorage because it is a property of the account.
 * A dismissal is only a "not now", so it is session scoped: closing it clears
 * the banner for this visit without permanently burying the route.
 */

/** Set by the orientation route when the sequence is finished or skipped. */
export const ORIENTATION_KEY = "rgl_orientation_v1";
/** Session scoped "not now" for the banner itself. */
export const ORIENTATION_DISMISS_KEY = "rgl_orientation_dismissed";

function isComplete(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(ORIENTATION_KEY) !== null;
  } catch {
    return false;
  }
}

function isDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return sessionStorage.getItem(ORIENTATION_DISMISS_KEY) !== null;
  } catch {
    return false;
  }
}

export type OrientationProps = {
  className?: string;
};

export function Orientation({ className = "" }: OrientationProps) {
  const snap = useLedger();
  const reduce = useReducedMotion();
  const [hidden, setHidden] = useState(() => isComplete() || isDismissed());

  if (hidden || snap.positions.length > 0) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(ORIENTATION_DISMISS_KEY, "1");
    } catch {
      /* a blocked store only costs us the memory of this dismissal */
    }
    setHidden(true);
  };

  return (
    <motion.aside
      aria-label="Orientation"
      className={`panel-hi edge-light relative overflow-hidden p-4 sm:p-5 ${className}`}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : { duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--line-hi)] bg-[rgba(46,139,255,0.08)]">
          <Compass className="h-5 w-5 text-[var(--accent-hi)]" strokeWidth={1.7} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="eyebrow">New here</p>
          <h2 className="mt-1 text-[15px] font-semibold text-[var(--text-hi)]">
            Start with orientation
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-mid)]">
            Four short panels on how a vault accrues {(DAILY_RATE * 100).toFixed(0)}% of its
            principal a day with no end date, how the {WITHDRAW_INTERVAL_DAYS} day withdrawal window
            works, what a tier actually changes, and where everything lives. You can skip it at any
            point.
          </p>
          <Link to="/app/orientation" className="btn btn-secondary mt-3.5">
            Take orientation
          </Link>
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss orientation banner"
          className="btn btn-ghost -mr-1.5 -mt-1.5 shrink-0 px-2 py-2"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </motion.aside>
  );
}
