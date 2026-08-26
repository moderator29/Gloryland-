import { type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CYCLE_DAYS } from "@/domain/tiers";
import { DAY_MS } from "@/domain/ledger";
import { days, fullDate, money, shortDate } from "@/components/system/format";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { deployedAt, runningAt, type EchelonLeg, type EchelonPlan } from "./plan";

/**
 * Schedule: the plan read as a formation.
 *
 * Two views of the same legs. The timeline is the one that carries the point,
 * because the whole reason to stagger a placement is that leg two is still
 * running when leg one matures, and that is a shape rather than a sentence.
 * The rows underneath are the same schedule in figures, keyboard reachable
 * and readable by a screen reader, which the bars are not.
 *
 * Every figure is the plan's own. Nothing is computed here.
 */

export type ScheduleProps = {
  plan: EchelonPlan;
  /**
   * Steps the member has noted as placed. A note on their own plan, not a
   * ledger fact, and the caller is responsible for saying so.
   */
  placed?: number[];
  /** Rendered at the right edge of a leg's row, for the action it needs. */
  action?: (leg: EchelonLeg) => ReactNode;
  className?: string;
};

/** A spring quick enough to read as the row travelling rather than redrawing. */
const TRAVEL = { type: "spring", stiffness: 440, damping: 36 } as const;

function pct(n: number): string {
  return `${(n * 100).toFixed(3)}%`;
}

export function Schedule({ plan, placed = [], action, className = "" }: ScheduleProps) {
  const reduce = useReducedMotion();
  const { legs, spanDays, from, now, firstMaturesAt } = plan;

  // Where the plan's own clock sits on the track, when it sits on it at all.
  const elapsed = (now - from) / DAY_MS;
  const showToday = elapsed >= 0 && elapsed <= spanDays;

  // The overlap, stated as the figure it is: what is still at work on the day
  // the first leg matures.
  const stillRunning = runningAt(plan, firstMaturesAt);
  const stillDeployed = deployedAt(plan, firstMaturesAt);

  return (
    <div className={`min-w-0 ${className}`}>
      {/* ── The formation ── */}
      <figure className="inset m-0 p-3.5 sm:p-4">
        <figcaption className="eyebrow">
          Each leg runs its own {CYCLE_DAYS} days
        </figcaption>

        <div className="relative mt-3">
          {/* The day the first leg matures. Every bar crossing this line is a
              leg that is still running when the first one returns. */}
          <span
            className="pointer-events-none absolute top-0 bottom-5 w-px bg-[var(--line-hi)]"
            style={{ left: pct(CYCLE_DAYS / spanDays) }}
            aria-hidden="true"
          />
          {showToday && (
            <span
              className="pointer-events-none absolute top-0 bottom-5 w-px bg-[var(--accent)]"
              style={{ left: pct(elapsed / spanDays) }}
              aria-hidden="true"
            />
          )}

          <ul className="m-0 list-none space-y-1 p-0">
            <AnimatePresence initial={false}>
              {legs.map((leg) => {
                const isPlaced = placed.includes(leg.step);
                return (
                  <motion.li
                    key={leg.step}
                    layout={!reduce}
                    initial={reduce ? false : { opacity: 0, scaleX: 0.85 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, scaleX: 0.85 }}
                    transition={reduce ? { duration: 0 } : TRAVEL}
                    className="flex origin-left items-center gap-2"
                  >
                    <span
                      className="tabular w-4 shrink-0 text-right text-[10px] text-[var(--text-low)]"
                      aria-hidden="true"
                    >
                      {leg.step}
                    </span>
                    <span className="relative h-2.5 min-w-0 flex-1">
                      <span
                        className="absolute inset-y-0 rounded-full border"
                        style={{
                          left: pct(leg.offsetDays / spanDays),
                          width: pct(CYCLE_DAYS / spanDays),
                          background: isPlaced
                            ? "rgba(52,211,153,0.22)"
                            : leg.due
                              ? "rgba(46,139,255,0.28)"
                              : "rgba(46,139,255,0.1)",
                          borderColor: isPlaced
                            ? "rgba(52,211,153,0.45)"
                            : leg.due
                              ? "rgba(92,171,255,0.55)"
                              : "var(--line-hi)",
                        }}
                      />
                    </span>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>

          {/* ── The axis ── */}
          <div className="relative mt-1.5 ml-6 h-4">
            <span className="absolute left-0 text-[10px] text-[var(--text-low)]">
              {shortDate(from)}
            </span>
            <span
              className="absolute -translate-x-1/2 text-[10px] text-[var(--text-low)]"
              style={{ left: pct(CYCLE_DAYS / spanDays) }}
            >
              {shortDate(firstMaturesAt)}
            </span>
            <span className="absolute right-0 text-[10px] text-[var(--text-low)]">
              {shortDate(plan.lastMaturesAt)}
            </span>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-[var(--text-low)]">
          {stillRunning.length > 0 ? (
            <>
              Leg 1 matures on {fullDate(firstMaturesAt)}. On that day{" "}
              {stillRunning.length === 1 ? "leg" : "legs"}{" "}
              {stillRunning.map((l) => l.step).join(", ")}{" "}
              {stillRunning.length === 1 ? "is" : "are"} still running, holding{" "}
              {money(stillDeployed)}. That overlap is the whole formation.
            </>
          ) : (
            <>
              At {days(plan.spacingDays)} days apart, no two legs are ever running at the same
              time. Leg 1 returns on {fullDate(firstMaturesAt)}, before the next one opens, so this
              is a sequence of placements rather than a formation.
            </>
          )}
        </p>
      </figure>

      {/* ── The same schedule in figures ── */}
      <ol className="ledger mt-4 list-none p-0">
        <AnimatePresence initial={false}>
          {legs.map((leg) => {
            const isPlaced = placed.includes(leg.step);
            return (
              <motion.li
                key={leg.step}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={reduce ? { duration: 0 } : TRAVEL}
                className={`rail-row flex-wrap ${isPlaced ? "rail-row-gain" : leg.due ? "" : "rail-row-mute"}`}
              >
                <span
                  className="tabular grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-[var(--line-hi)] text-[11px] font-semibold text-[var(--accent-hi)]"
                  aria-hidden="true"
                >
                  {leg.step}
                </span>

                <div className="min-w-0 flex-1 basis-40">
                  <p className="text-sm font-medium text-[var(--text-hi)]">
                    <span className="tabular">{money(leg.amount)}</span>
                    {leg.tier ? ` at ${leg.tier.name}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--text-low)]">
                    Leg {leg.step} of {legs.length}. Opens {shortDate(leg.opensAt)}, matures{" "}
                    {fullDate(leg.maturesAt)}, releasing {money(leg.releases)}.
                  </p>
                </div>

                <div className="ml-auto flex shrink-0 items-center gap-2">
                  <span className="metric text-sm text-[var(--gain)]">
                    +<span className="tabular">{money(leg.reward)}</span>
                  </span>
                  {isPlaced ? (
                    <span className="chip chip-gain">Marked placed</span>
                  ) : leg.due ? (
                    (action?.(leg) ?? <span className="chip chip-accent">Ready to place</span>)
                  ) : (
                    <span className="chip">Opens in {days(leg.opensIn / DAY_MS)} days</span>
                  )}
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
    </div>
  );
}
