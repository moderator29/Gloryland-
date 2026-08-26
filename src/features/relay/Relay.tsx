import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Info, Repeat, TriangleAlert, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  armRelay,
  disarmRelay,
  fireRelay,
  RELAY_MIN_DAYS,
  type Position,
  type Relay as RelayState,
  type RelayMode,
  type Snapshot,
} from "@/domain/ledger";
import { DAILY_RATE, dailyReward } from "@/domain/tiers";
import { money, fullDate, days } from "@/components/system/format";
import { Status } from "@/components/system/ui";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { playTap, playTierChord } from "@/lib/sound";

/**
 * Relay: a standing instruction on one position.
 *
 * A position accrues for as long as it is left in place, so nothing about it
 * ever stops. What does sit still is the reward: accrual runs on principal
 * alone, so reward that has accrued and not been folded back in earns nothing
 * at all. A relay is the standing instruction that fixes that, and a member
 * arms it once rather than deciding every day.
 *
 * Two rules keep it honest, and both are stated on the panel rather than in a
 * footnote. It writes to the ledger without asking again. And it fires when the
 * member next opens the product, never before and never backdated, because
 * stamping the events earlier would fabricate accrual on capital that was not
 * yet in the new position.
 *
 * Those two sentences used to appear once per browser, ever: they were gated on
 * the first arm confirmation, so a member arming their second relay months
 * later saw nothing. The disclosure is now permanent and unconditional, armed
 * or not, and the extra confirmation on a first arm sits on top of it rather
 * than instead of it.
 *
 * What this panel deliberately does not show is a series. Under the published
 * rate a repeated fold compounds to figures that are arithmetic rather than
 * anything anyone will receive, and a panel leading with one would be selling.
 * The rate, what this fold moves, and what the position accrues afterwards are
 * all facts the ledger can produce. Anything past that is a projection.
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

const DAILY_PCT = `${(DAILY_RATE * 100).toFixed(0)}%`;
const EASE = [0.22, 1, 0.36, 1] as const;

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
  const compounds = mode === "full";
  // What the instruction moves, and what the position accrues afterwards. Both
  // read off this position's own figures rather than an assumed run of days.
  const moves = compounds ? position.principal + position.claimable : position.claimable;
  const principalAfter = compounds ? position.principal + position.claimable : position.principal;
  const dailyAfter = dailyReward(principalAfter);

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
      description: compounds
        ? `Reward will be folded into principal, ${money(moves)} at today's figures.`
        : `Reward will be claimed to your balance, ${money(moves, 2)} at today's figures.`,
    });
  };

  const disarm = () => {
    disarmRelay(position.id);
    toast.message("Relay disarmed", {
      description: "This position keeps accruing exactly as it is.",
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
              ? `Armed. It next has a whole day of reward to act on ${fullDate(
                  relay?.firesAt ?? position.startsAt,
                )}, and runs the next time you open Rigel after that.`
              : `Reward accrues on principal alone, so reward sitting in this position earns nothing. A relay folds it back in, or claims it out, without asking again.`}
          </p>
        </div>
      </div>

      {!armed && (
        <div
          role="radiogroup"
          aria-label="What the relay does"
          className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          {(
            [
              {
                id: "full" as const,
                label: "Compound",
                figure: position.principal + position.claimable,
                note: "Reward folded into principal, so it accrues too.",
              },
              {
                id: "principal" as const,
                label: "Harvest",
                figure: position.claimable,
                note: "Reward claimed to your balance, principal untouched.",
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
                  {money(opt.figure, 2)}
                </span>
                <span className="mt-0.5 block text-[11px] text-[var(--text-low)]">{opt.note}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* The arithmetic for one run, from this position's own figures. A member
          should be able to check the instruction against the numbers. */}
      <dl className="ledger mt-4">
        <div className="rail-row">
          <dt className="min-w-0 flex-1 text-xs text-[var(--text-low)]">Moves</dt>
          <dd className="metric tabular shrink-0 text-sm">{money(moves, 2)}</dd>
        </div>
        <div className="rail-row">
          <dt className="min-w-0 flex-1 text-xs text-[var(--text-low)]">Principal after</dt>
          <dd className="metric tabular shrink-0 text-sm">{money(principalAfter, 2)}</dd>
        </div>
        <div className="rail-row">
          <dt className="min-w-0 flex-1 text-xs text-[var(--text-low)]">Accrues per day after</dt>
          <dd className="metric tabular shrink-0 text-sm text-[var(--gain)]">
            {money(dailyAfter, 2)}
            {compounds && (
              <span className="text-[var(--text-low)]"> from {money(position.dailyReward, 2)}</span>
            )}
          </dd>
        </div>
      </dl>

      {/* ── What a relay does, stated every time ──────────────────────────
          Unconditional and permanent. A member who armed one months ago and
          forgot has to be able to read this again without disarming first. */}
      <div className="inset mt-4 flex items-start gap-2.5 p-3.5">
        <Info
          className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent-hi)]"
          strokeWidth={1.9}
          aria-hidden="true"
        />
        <div className="min-w-0 text-xs leading-relaxed text-[var(--text)]">
          <p>
            <strong className="font-semibold text-[var(--text-hi)]">
              A relay writes to your ledger without asking again.
            </strong>{" "}
            {compounds
              ? "When it runs it claims the reward, closes this position and opens a new one at principal plus reward, then arms itself on the new position. That is up to four entries you did not write, in one batch."
              : "When it runs it claims the reward into your balance and leaves the principal running. That is one entry you did not write."}
          </p>
          <p className="mt-2">
            It acts on whole days. The rate is stated per day, so a relay waits until{" "}
            {RELAY_MIN_DAYS === 1 ? "a full day" : `${RELAY_MIN_DAYS} full days`} of reward has
            accrued rather than folding in a part day nobody can check against {DAILY_PCT}.
          </p>
          <p className="mt-2">
            It fires the next time you open Rigel, never before and never backdated.{" "}
            <strong className="font-semibold text-[var(--text-hi)]">
              It does not run while Rigel is closed.
            </strong>{" "}
            Reward that accrues while you are away sits outside the principal, earning nothing,
            until you come back, and the ledger records that gap rather than papering over it.
          </p>
          <p className="mt-2">
            Disarm it at any point before it fires and this position carries on exactly as it is.{" "}
            <strong className="font-semibold text-[var(--text-hi)]">
              Once it has fired there is no undo.
            </strong>{" "}
            {compounds
              ? "A folded position is a new position, and the day count on it starts again."
              : "Claimed reward sits in your balance, where it accrues nothing until it is placed."}
          </p>
        </div>
      </div>

      <p className="mt-3 flex items-start gap-2 px-1 text-xs leading-relaxed text-[var(--text)]">
        <TriangleAlert
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--warn)]"
          strokeWidth={2}
          aria-hidden="true"
        />
        <span>
          Folding reward in repeatedly compounds it, and the longer a chain runs the more times the
          same risk has to not happen. Capital is at risk. Rates are targets, not guarantees, and
          the{" "}
          <Link
            to="/legal/risk#magnitude"
            className="text-[var(--accent-hi)] underline underline-offset-2"
          >
            risk disclosure
          </Link>{" "}
          sets out what a rate of this size implies.
        </span>
      </p>

      {/* The extra beat on a first arm, on top of the standing disclosure
          above rather than in place of it. */}
      <AnimatePresence initial={false}>
        {confirming && (
          <motion.div
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduce ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: reduce ? 0 : 0.22, ease: EASE }}
            className="overflow-hidden"
          >
            <div
              className="mt-4 flex items-start gap-2.5 rounded-xl border p-3.5"
              style={{ borderColor: "rgba(251,191,36,0.32)", background: "rgba(251,191,36,0.07)" }}
            >
              <TriangleAlert
                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warn)]"
                strokeWidth={1.9}
                aria-hidden="true"
              />
              <p className="text-xs leading-relaxed text-[var(--text)]">
                This is your first relay. Confirm that you want this position&apos;s reward{" "}
                {compounds ? "folded into its principal" : "claimed to your balance"} the next time
                you open Rigel after a whole day of it has accrued, with no further prompt at that
                point. You will not be asked to confirm again on later relays, and this panel will
                keep stating what a relay does.
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
 * Shown when an armed relay has a whole day of reward waiting on it and has
 * not run, which happens when a member turned automatic firing off. It names
 * what the delay costs per day rather than nagging.
 */
export function RelayDue({ snap, className = "" }: RelayDueProps) {
  if (snap.relaysDue.length === 0) return null;
  const n = snap.relaysDue.length;

  const fireAll = () => {
    let fired = 0;
    for (const relay of snap.relaysDue) {
      const position = snap.positions.find((p) => p.id === relay.positionId);
      if (!position) continue;
      if (fireRelay(relay, position).length > 0) fired++;
    }
    if (fired > 0) {
      playTierChord(snap.tier?.id ?? "core");
      toast.success(fired === 1 ? "Relay fired" : `${fired} relays fired`, {
        description: `${money(snap.relayCarry, 2)} moved.`,
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
          {money(snap.relayCarry, 2)} has been waiting {days(worst.overdueDays)} days to move
          {snap.relayForgoneDaily > 0
            ? `, which is ${money(snap.relayForgoneDaily, 2)} a day of accrual it is not earning`
            : ""}
          .
        </p>
      </div>
      <button type="button" onClick={fireAll} className="btn btn-primary min-h-[44px] shrink-0">
        Fire now
      </button>
    </section>
  );
}
