import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Info, Repeat, TriangleAlert, Zap } from "lucide-react";
import { Link } from "react-router-dom";
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
import { CYCLE_DAYS, CYCLE_RETURN, DAILY_RATE } from "@/domain/tiers";
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
 * footnote. It writes to the ledger without asking again. And it fires when
 * the member next opens the product after maturity, never before and never
 * backdated, because stamping the events at the maturity date would fabricate
 * accrual for days the capital actually sat still.
 *
 * Those two sentences used to appear once per browser, ever: they were gated
 * on the first arm confirmation, so a member arming their second relay months
 * later saw nothing, and the armed copy said the capital "carries straight
 * into a new one", which reads as something that happens while you are away.
 * The disclosure is now permanent and unconditional, armed or not, and the
 * extra confirmation on a first arm sits on top of it rather than instead of
 * it.
 *
 * The compounding series is the other thing a member arming a chain of these
 * deserves to see, and it is deliberately behind a closed disclosure. Rolling
 * a term repeatedly is arithmetic on the published rate, not a projection of
 * what anyone will receive, and a panel that led with a four figure sum after
 * six terms would be selling rather than informing.
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

/* ── The compounding series, derived rather than written ──────────────── */

const GROWTH = 1 + CYCLE_RETURN;
/** Terms shown in the disclosure: the first three, then half a year, then a year. */
const SERIES_TERMS = [1, 3, 6, Math.round(365 / CYCLE_DAYS)];
/** What repeating the published term for a calendar year implies as an annual rate. */
const ANNUALISED = GROWTH ** (365 / CYCLE_DAYS) - 1;
const ANNUALISED_TEXT = `${Math.round(ANNUALISED * 100).toLocaleString("en-US")}%`;

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
  const [showSeries, setShowSeries] = useState(false);
  const seriesId = useId();

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
              ? `Armed. This term matures on ${fullDate(position.maturesAt)}, and the relay runs the next time you open Rigel after that.`
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
            When it runs it claims the reward, closes this term and opens a new {CYCLE_DAYS} day
            term with what it carried, then arms itself on the new position. That is four entries
            you did not write, in one batch.
          </p>
          <p className="mt-2">
            It fires the next time you open Rigel after this term matures, never before and never
            backdated.{" "}
            <strong className="font-semibold text-[var(--text-hi)]">
              It does not run while Rigel is closed.
            </strong>{" "}
            A term that matures while you are away sits still, earning nothing, until you come back,
            and the ledger records that gap rather than papering over it.
          </p>
          <p className="mt-2">
            Disarm it at any point before it fires and the term settles and stays settled. If it has
            already fired, the new position can be settled immediately.
          </p>
        </div>
      </div>

      {/* ── What repeated rolling compounds to ───────────────────────────
          Closed by default and named plainly. The series is arithmetic on the
          published rate rather than a forecast, and the panel says so inside
          rather than putting a four figure sum on the surface. */}
      <div className="mt-2">
        <button
          type="button"
          aria-expanded={showSeries}
          aria-controls={seriesId}
          onClick={() => setShowSeries((v) => !v)}
          className="flex min-h-[44px] w-full items-center gap-2 rounded-xl px-1 text-left text-xs text-[var(--text-low)] transition-colors hover:text-[var(--text-mid)]"
        >
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${showSeries ? "rotate-180" : ""}`}
            strokeWidth={2}
            aria-hidden="true"
          />
          <span className="min-w-0">If you keep rolling, what does that compound to?</span>
        </button>

        <div id={seriesId} role="region">
          <AnimatePresence initial={false}>
            {showSeries && (
              <motion.div
                key="series"
                className="overflow-hidden"
                initial={reduce ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={reduce ? undefined : { opacity: 0, height: 0 }}
                transition={{ duration: reduce ? 0 : 0.24, ease: EASE }}
              >
                <div className="inset p-3.5">
                  <p className="text-xs leading-relaxed text-[var(--text-mid)]">
                    A relay re-arms itself, so left alone it rolls again every {CYCLE_DAYS} days.
                    Starting from the {money(carry)} this one carries, and assuming every term
                    completes and pays in full:
                  </p>

                  <dl className="ledger mt-3">
                    {SERIES_TERMS.map((n) => (
                      <div key={n} className="rail-row">
                        <dt className="min-w-0 flex-1 text-xs text-[var(--text-low)]">
                          After {n} {n === 1 ? "term" : "terms"}
                          <span className="tabular"> · {n * CYCLE_DAYS} days</span>
                        </dt>
                        <dd className="metric tabular shrink-0 text-sm text-[var(--text-hi)]">
                          {money(carry * GROWTH ** n)}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-[var(--text)]">
                    <TriangleAlert
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--warn)]"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                    <span>
                      <strong className="font-semibold text-[var(--text-hi)]">
                        That is arithmetic, not a forecast.
                      </strong>{" "}
                      Repeated for a calendar year it is an annualised rate of about{" "}
                      <span className="tabular">{ANNUALISED_TEXT}</span>, which no asset class
                      delivers reliably, and the longer the chain runs the more times the same risk
                      has to not happen. Capital in a vault can be lost in part or in full. The{" "}
                      <Link
                        to="/legal/risk#magnitude"
                        className="text-[var(--accent-hi)] underline underline-offset-2"
                      >
                        risk disclosure
                      </Link>{" "}
                      sets out what a return of this size implies.
                    </span>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

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
                This is your first relay. Confirm that you want {money(carry)} placed into a new{" "}
                {CYCLE_DAYS} day term automatically when this one matures, without a further
                prompt. You will not be asked again on later relays, and this panel will keep
                stating what a relay does.
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
