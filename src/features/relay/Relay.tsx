import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Info, Repeat, Zap } from "lucide-react";
import { toast } from "sonner";
import {
  armRelay,
  disarmRelay,
  fireRelay,
  type Position,
  type Relay as RelayState,
  type RelayMode,
  type Snapshot,
} from "@/domain/ledger";
import { CYCLE_DAYS, DAILY_RATE } from "@/domain/tiers";
import { money, fullDate, days } from "@/components/system/format";
import { Status } from "@/components/system/ui";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { playTap, playTierChord } from "@/lib/sound";

/**
 * Relay: a standing instruction on one position.
 *
 * Accrual stops dead at day 30, and a matured term that nobody has touched
 * earns nothing while it waits. A relay turns noticing, deciding and acting
 * into a decision made once.
 *
 * Two rules keep it honest, and both are stated on the panel rather than in a
 * footnote. It writes to the ledger without asking again, so the first arm
 * carries an explicit confirmation. And it fires when the member next opens
 * the product after maturity, never before and never backdated, because
 * stamping the events at the maturity date would fabricate accrual for days
 * the capital actually sat still.
 */

const CONFIRMED_KEY = "rgl_relay_confirmed_v1";

function hasConfirmed(): boolean {
  try {
    return localStorage.getItem(CONFIRMED_KEY) === "1";
  } catch {
    return false;
  }
}

function remember() {
  try {
    localStorage.setItem(CONFIRMED_KEY, "1");
  } catch {
    /* the confirmation simply shows again next time */
  }
}

export type RelayPanelProps = {
  position: Position;
  relay?: RelayState;
  className?: string;
};

export function RelayPanel({ position, relay, className = "" }: RelayPanelProps) {
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<RelayMode>(relay?.mode ?? "full");
  const [confirming, setConfirming] = useState(false);

  const armed = relay?.armed === true;
  const full = position.principal + position.claimable;
  const carry = mode === "full" ? full : position.principal;
  const nextMatures = Date.now() + CYCLE_DAYS * 86_400_000;

  const arm = () => {
    if (!armed && !hasConfirmed() && !confirming) {
      setConfirming(true);
      return;
    }
    remember();
    setConfirming(false);
    armRelay(position.id, mode);
    playTap();
    toast.success("Relay armed", {
      description: `At maturity, ${money(carry)} carries into a new ${CYCLE_DAYS} day term.`,
    });
  };

  const disarm = () => {
    disarmRelay(position.id);
    toast.message("Relay disarmed", {
      description: "This term will settle to your balance and stay there.",
    });
  };

  return (
    <section className={`panel edge-light p-5 ${className}`}>
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--line-hi)] bg-[rgba(46,139,255,0.1)]">
          <Repeat
            className="h-4 w-4 text-[var(--accent-hi)]"
            strokeWidth={1.9}
            aria-hidden="true"
          />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[15px] font-semibold text-[var(--text-hi)]">Relay</h2>
            {armed && <Status kind="accruing" />}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-low)]">
            {armed
              ? `Armed. When this term matures on ${fullDate(position.maturesAt)}, its capital carries straight into a new one.`
              : `A matured term earns nothing while it waits. Arm a relay and it carries itself into the next term instead.`}
          </p>
        </div>
      </div>

      {!armed && (
        <div
          role="radiogroup"
          aria-label="What the relay carries"
          className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          {(
            [
              {
                id: "full" as const,
                label: "Principal and reward",
                figure: full,
                note: "Everything goes back to work.",
              },
              {
                id: "principal" as const,
                label: "Principal only",
                figure: position.principal,
                note: `${money(position.claimable, 2)} claimed to your balance.`,
              },
            ] as const
          ).map((opt) => {
            const active = mode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setMode(opt.id)}
                className={`min-h-[44px] rounded-xl border p-3 text-left transition-colors ${
                  active
                    ? "border-[var(--accent)] bg-[rgba(46,139,255,0.1)]"
                    : "border-[var(--line)] bg-[rgba(5,7,15,0.45)] hover:border-[var(--line-hi)]"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-[var(--text-hi)]">{opt.label}</span>
                  {active && (
                    <Check
                      className="ml-auto h-3.5 w-3.5 text-[var(--accent-hi)]"
                      strokeWidth={2.4}
                      aria-hidden="true"
                    />
                  )}
                </span>
                <span className="metric tabular mt-1.5 block text-base text-[var(--text-hi)]">
                  {money(opt.figure)}
                </span>
                <span className="mt-0.5 block text-[11px] text-[var(--text-low)]">{opt.note}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* The arithmetic for one term, from this position's own figures. A
          member should be able to check the promise against the numbers. */}
      <dl className="ledger mt-4">
        <div className="rail-row">
          <dt className="min-w-0 flex-1 text-xs text-[var(--text-low)]">Carries</dt>
          <dd className="metric tabular shrink-0 text-sm">{money(carry)}</dd>
        </div>
        <div className="rail-row">
          <dt className="min-w-0 flex-1 text-xs text-[var(--text-low)]">Accrues per day</dt>
          <dd className="metric tabular shrink-0 text-sm text-[var(--gain)]">
            {money(carry * DAILY_RATE, 2)}
          </dd>
        </div>
        <div className="rail-row">
          <dt className="min-w-0 flex-1 text-xs text-[var(--text-low)]">Releases</dt>
          <dd className="tabular shrink-0 text-sm text-[var(--text-hi)]">
            {money(carry * (1 + DAILY_RATE * CYCLE_DAYS))} on {fullDate(nextMatures)}
          </dd>
        </div>
      </dl>

      <AnimatePresence initial={false}>
        {confirming && (
          <motion.div
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduce ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: reduce ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="inset mt-4 flex items-start gap-2.5 p-3.5">
              <Info
                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warn)]"
                strokeWidth={1.9}
                aria-hidden="true"
              />
              <p className="text-xs leading-relaxed text-[var(--text)]">
                A relay writes to your ledger without asking again. It fires the next time you open
                Rigel after this term matures, never before and never backdated. If you change your
                mind, the new position can be settled immediately.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {armed ? (
          <button type="button" onClick={disarm} className="btn btn-ghost min-h-[44px]">
            Disarm relay
          </button>
        ) : (
          <button type="button" onClick={arm} className="btn btn-primary min-h-[44px]">
            {confirming ? "Yes, arm it" : "Arm relay"}
          </button>
        )}
        {confirming && (
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="btn btn-ghost min-h-[44px]"
          >
            Cancel
          </button>
        )}
      </div>
    </section>
  );
}

/* ── the due band ───────────────────────────────────────────────────────── */

export type RelayDueProps = {
  snap: Snapshot;
  className?: string;
};

/**
 * Shown when a relay is armed and its term has matured but it has not run,
 * which happens when a member turned automatic firing off. It names what the
 * delay costs per day rather than nagging.
 */
export function RelayDue({ snap, className = "" }: RelayDueProps) {
  if (snap.relaysDue.length === 0) return null;
  const n = snap.relaysDue.length;

  const fireAll = () => {
    let fired = 0;
    for (const relay of snap.relaysDue) {
      const position = snap.positions.find((p) => p.id === relay.positionId);
      if (!position) continue;
      fireRelay(relay, position);
      fired++;
    }
    if (fired > 0) {
      playTierChord(snap.tier?.id ?? "core");
      toast.success(fired === 1 ? "Relay fired" : `${fired} relays fired`, {
        description: `${money(snap.relayCarry)} carried into new terms.`,
      });
    }
  };

  const worst = snap.relaysDue.reduce((a, b) => (a.overdueDays > b.overdueDays ? a : b));

  return (
    <section className={`panel edge-light flex flex-wrap items-center gap-4 p-4 ${className}`}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--line-hi)] bg-[rgba(251,191,36,0.1)]">
        <Zap className="h-4 w-4 text-[var(--warn)]" strokeWidth={1.9} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--text-hi)]">
          {n === 1 ? "A relay is waiting to run" : `${n} relays are waiting to run`}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-low)]">
          {money(snap.relayCarry)} has been sitting still for {days(worst.overdueDays)} days, which
          is {money(snap.relayForgoneDaily, 2)} a day not accruing.
        </p>
      </div>
      <button type="button" onClick={fireAll} className="btn btn-primary min-h-[44px] shrink-0">
        Fire now
      </button>
    </section>
  );
}
