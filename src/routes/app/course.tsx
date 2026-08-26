import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarClock, Check, Info, Plus } from "lucide-react";
import { toast } from "sonner";
import { useLedger } from "@/hooks/useLedger";
import { setCourse, stopCourse } from "@/domain/ledger";
import { DAILY_RATE, TIERS, dailyReward } from "@/domain/tiers";
import { ASSETS, type AssetId } from "@/features/market/assets";
import { CoinLogo } from "@/features/market";
import { money, fullDate, relative } from "@/components/system/format";
import { Empty } from "@/components/system/ui";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useArmedAction } from "@/hooks/useArmedAction";
import { playTap } from "@/lib/sound";
import {
  INTERVALS,
  MIN_LEG,
  planCourse,
  planForCourse,
  planProblem,
} from "@/features/course/rungs";
import { Rungs } from "@/features/course/Rungs";
import { Schedule } from "@/features/course/Schedule";

/**
 * Course: an amount and a rhythm, with every placement between here and the
 * rung the member is aiming at, and the date each one is due.
 *
 * The honest limit is stated on the page rather than buried: the platform
 * cannot take the money. There is no mandate, no scheduler and nothing that
 * moves funds on a member's behalf, so a course is a schedule they fill by
 * hand. What it buys is that the decision is made once, in advance, and the
 * dates stop being vague.
 */

export default function Course() {
  const snap = useLedger();
  const reduce = useReducedMotion();
  const course = snap.activeCourse;

  const rise = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.4, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Plan</p>
        <h1 className="display mt-1 text-2xl sm:text-3xl">Course</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--text-low)]">
          Set an amount and a rhythm, and every placement between here and the rung you are aiming
          at gets a date. Rigel cannot move money for you, so each leg is one you place yourself.
        </p>
      </header>

      {course ? (
        <Running key={course.id} snap={snap} rise={rise} />
      ) : (
        <Setup snap={snap} rise={rise} />
      )}
    </div>
  );
}

/* ── running ────────────────────────────────────────────────────────────── */

type Rise = (i: number) => Record<string, unknown>;

function Running({ snap, rise }: { snap: ReturnType<typeof useLedger>; rise: Rise }) {
  const course = snap.activeCourse!;
  const plan = useMemo(() => planForCourse(course, snap), [course, snap]);
  const [stopArmed, stopFire] = useArmedAction(() => {
    stopCourse(course.id);
    toast.message("Course stopped", { description: "The schedule stays on your record." });
  });

  return (
    <>
      <motion.section {...rise(0)} className="lede">
        <div className="min-w-0">
          <p className="tag-micro">Placement rate</p>
          <p className="figure-lead mt-2 sm:mt-3">{money(course.per30)}</p>
          <p className="mt-2 text-sm text-[var(--text-low)]">
            entering vaults every thirty days, at {money(course.amount)} every {course.everyDays}{" "}
            days
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {course.nextDue ? (
              <span className="chip chip-warn">
                Leg {course.nextDue.index} due {relative(course.nextDue.dueAt)}
              </span>
            ) : course.upcoming ? (
              <span className="chip chip-accent">Next on {fullDate(course.upcoming.dueAt)}</span>
            ) : (
              <span className="chip chip-gain">Every leg filled</span>
            )}
            {course.lapsedCount > 0 && <span className="chip">{course.lapsedCount} lapsed</span>}
          </div>
        </div>

        <div className="lede-rail">
          <div className="rail-stat">
            <span className="tag-micro">Legs filled</span>
            <span className="metric text-lg">
              {course.filledCount}
              {course.legs > 0 ? ` of ${course.legs}` : ""}
            </span>
          </div>
          <div className="rail-stat">
            <span className="tag-micro">Placed</span>
            <span className="metric text-lg text-[var(--gain)]">{money(course.placed)}</span>
          </div>
          <div className="rail-stat">
            <span className="tag-micro">Committed</span>
            <span className="metric text-lg">
              {plan.commits === null ? "Open ended" : money(plan.commits)}
            </span>
          </div>
          <div className="rail-stat">
            <span className="tag-micro">Funding with</span>
            <span className="metric text-lg">{course.asset}</span>
          </div>
        </div>
      </motion.section>

      <motion.section {...rise(1)} className="band">
        <div className="band-head">
          <h2 className="band-title">Schedule</h2>
          <span className="hairline" aria-hidden="true" />
        </div>
        <Schedule course={course} className="mt-4" />
      </motion.section>

      <motion.section {...rise(2)} className="band">
        <div className="band-head">
          <h2 className="band-title">Standing</h2>
          <span className="hairline" aria-hidden="true" />
        </div>
        <p className="mb-4 mt-2 text-xs text-[var(--text-low)]">
          Measured from your standing of {money(snap.standing)} today.
        </p>
        <Rungs plan={plan} />
      </motion.section>

      <motion.section {...rise(3)} className="band">
        <div className="band-head">
          <h2 className="band-title">What one leg does</h2>
          <span className="hairline" aria-hidden="true" />
        </div>
        <OneLeg amount={course.amount} className="mt-4" />
      </motion.section>

      <motion.section {...rise(4)} className="panel flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--text-hi)]">Stop this course</p>
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-low)]">
            Nothing already placed is affected. The schedule stays on your record.
          </p>
        </div>
        <button
          type="button"
          onClick={stopFire}
          className={`btn shrink-0 ${stopArmed ? "btn-danger" : "btn-outline"}`}
        >
          {stopArmed ? "Tap again to stop" : "Stop course"}
        </button>
      </motion.section>
    </>
  );
}

/* ── setup ──────────────────────────────────────────────────────────────── */

function Setup({ snap, rise }: { snap: ReturnType<typeof useLedger>; rise: Rise }) {
  const [amount, setAmount] = useState(String(TIERS[0].entry));
  const [every, setEvery] = useState(7);
  const [openEnded, setOpenEnded] = useState(false);
  const [legs, setLegs] = useState(25);
  const [assetId, setAssetId] = useState<AssetId>("usdt");

  const value = Number(amount) || 0;
  const legCount = openEnded ? 0 : legs;
  const problem = planProblem(value, every, legCount);
  const asset = ASSETS.find((a) => a.id === assetId) ?? ASSETS[0];

  const plan = useMemo(
    () => planCourse(Math.max(value, MIN_LEG), every, legCount, snap.standing, Date.now()),
    [value, every, legCount, snap.standing],
  );

  const start = () => {
    if (problem) return;
    setCourse({
      amount: value,
      everyDays: every,
      legs: legCount,
      asset: asset.symbol,
      network: asset.network,
    });
    playTap();
    toast.success("Course set", {
      description: `${money(value)} every ${every} days. The first leg is due now.`,
    });
  };

  return (
    <>
      <motion.section {...rise(0)} className="panel edge-light p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--line-hi)] bg-[rgba(46,139,255,0.1)]">
            <CalendarClock
              className="h-4 w-4 text-[var(--accent-hi)]"
              strokeWidth={1.9}
              aria-hidden="true"
            />
          </span>
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-[var(--text-hi)]">Set a course</h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-low)]">
              Four decisions. Everything below updates as you make them.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {/* Amount */}
          <div>
            <label htmlFor="leg-amount" className="eyebrow">
              Amount per leg
            </label>
            <input
              id="leg-amount"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, "").slice(0, 7))}
              className="metric tabular mt-1.5 w-full rounded-xl border border-[var(--line-hi)] bg-[rgba(5,7,15,0.62)] px-4 py-3 text-xl text-[var(--text-hi)] outline-none transition-colors focus:border-[var(--accent)]"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TIERS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setAmount(String(t.entry))}
                  className={`chip ${value === t.entry ? "chip-accent" : ""}`}
                >
                  {money(t.entry)}
                </button>
              ))}
            </div>
          </div>

          {/* Interval */}
          <div>
            <p className="eyebrow" id="interval-label">
              How often
            </p>
            <div
              role="radiogroup"
              aria-labelledby="interval-label"
              className="mt-1.5 flex flex-wrap gap-1.5"
            >
              {INTERVALS.map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={every === n}
                  onClick={() => setEvery(n)}
                  className={`chip ${every === n ? "chip-accent" : ""}`}
                >
                  Every {n} days
                </button>
              ))}
              <label className="inset flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-low)]">
                <span>Custom</span>
                <input
                  aria-label="Custom interval in days"
                  inputMode="numeric"
                  value={INTERVALS.includes(every as (typeof INTERVALS)[number]) ? "" : every}
                  placeholder="days"
                  onChange={(e) => {
                    const n = Number(e.target.value.replace(/[^0-9]/g, "").slice(0, 2));
                    if (n > 0) setEvery(n);
                  }}
                  className="tabular w-12 bg-transparent text-center text-[var(--text-hi)] outline-none"
                />
              </label>
            </div>
          </div>

          {/* Length */}
          <div>
            <p className="eyebrow" id="length-label">
              For how long
            </p>
            <div
              className="mt-1.5 flex flex-wrap items-center gap-2"
              aria-labelledby="length-label"
            >
              <button
                type="button"
                aria-pressed={!openEnded}
                onClick={() => setOpenEnded(false)}
                className={`chip ${!openEnded ? "chip-accent" : ""}`}
              >
                A set number
              </button>
              <button
                type="button"
                aria-pressed={openEnded}
                onClick={() => setOpenEnded(true)}
                className={`chip ${openEnded ? "chip-accent" : ""}`}
              >
                Open ended
              </button>
              {!openEnded && (
                <label className="inset flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-low)]">
                  <span>Legs</span>
                  <input
                    aria-label="Number of legs"
                    inputMode="numeric"
                    value={legs}
                    onChange={(e) => {
                      const n = Number(e.target.value.replace(/[^0-9]/g, "").slice(0, 2));
                      setLegs(Math.min(60, Math.max(1, n || 1)));
                    }}
                    className="tabular w-10 bg-transparent text-center text-[var(--text-hi)] outline-none"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Asset */}
          <div>
            <p className="eyebrow" id="asset-label">
              Funding with
            </p>
            <div
              role="radiogroup"
              aria-labelledby="asset-label"
              className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3"
            >
              {ASSETS.map((a) => {
                const active = assetId === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setAssetId(a.id)}
                    className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      active
                        ? "border-[var(--accent)] bg-[rgba(46,139,255,0.1)]"
                        : "border-[var(--line)] bg-[rgba(5,7,15,0.45)] hover:border-[var(--line-hi)]"
                    }`}
                  >
                    <CoinLogo asset={a} size={22} />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[var(--text-hi)]">
                        {a.symbol}
                      </span>
                      <span className="block truncate text-[11px] text-[var(--text-low)]">
                        {a.network}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {problem ? (
          <p className="mt-5 text-xs text-[var(--loss)]">{problem}</p>
        ) : (
          <div className="inset mt-5 flex items-start gap-2.5 p-3.5">
            <Info
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-low)]"
              strokeWidth={1.9}
              aria-hidden="true"
            />
            <p className="text-xs leading-relaxed text-[var(--text-low)]">
              Setting a course records the plan and nothing else. No money moves, no mandate is
              created, and no leg is placed until you place it. The first leg is due immediately.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={start}
          disabled={problem !== null}
          className="btn btn-primary mt-4 w-full min-h-[48px]"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Set this course
        </button>
      </motion.section>

      <motion.section {...rise(1)} className="band">
        <div className="band-head">
          <h2 className="band-title">What it reaches</h2>
          <span className="hairline" aria-hidden="true" />
        </div>
        <p className="mb-4 mt-2 text-xs text-[var(--text-low)]">
          From your standing of {money(snap.standing)} today.
        </p>
        <Rungs plan={plan} />
      </motion.section>

      <motion.section {...rise(2)} className="band">
        <div className="band-head">
          <h2 className="band-title">What one leg does</h2>
          <span className="hairline" aria-hidden="true" />
        </div>
        <OneLeg amount={Math.max(value, MIN_LEG)} className="mt-4" />
      </motion.section>

      {snap.courses.length > 0 && (
        <motion.section {...rise(3)} className="band">
          <div className="band-head">
            <h2 className="band-title">Stopped</h2>
            <span className="hairline" aria-hidden="true" />
          </div>
          <ol className="ledger mt-4">
            {snap.courses
              .filter((c) => !c.active)
              .map((c) => (
                <li key={c.id} className="rail-row">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--text-hi)]">
                      {money(c.amount)} every {c.everyDays} days
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--text-low)]">
                      Started {fullDate(c.startAt)}, {c.filledCount} legs filled, {money(c.placed)}{" "}
                      placed
                    </p>
                  </div>
                  <Check
                    className="h-4 w-4 shrink-0 text-[var(--text-low)]"
                    strokeWidth={1.9}
                    aria-hidden="true"
                  />
                </li>
              ))}
          </ol>
        </motion.section>
      )}
    </>
  );
}

/* ── shared ─────────────────────────────────────────────────────────────── */

function OneLeg({ amount, className = "" }: { amount: number; className?: string }) {
  const plan = planCourse(amount, 7, 1, 0, Date.now());
  // Days are named as a stretch someone might choose, never as a length the
  // product imposes. There is no term, so a leg has no total to quote.
  const rows: [string, string][] = [
    ["Principal", money(amount)],
    ["Accrues per day", money(plan.perLegDaily, 2)],
    ["After four days", money(dailyReward(amount) * 4, 2)],
    ["After thirty days", money(dailyReward(amount) * 30)],
  ];

  return (
    <div className={className}>
      <dl className="ledger">
        {rows.map(([k, v]) => (
          <div key={k} className="rail-row">
            <dt className="min-w-0 flex-1 text-xs text-[var(--text-low)]">{k}</dt>
            <dd className="metric tabular shrink-0 text-sm">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs leading-relaxed text-[var(--text-low)]">
        Every leg is its own vault, accruing the same {(DAILY_RATE * 100).toFixed(0)}% of its
        principal a day that every rung earns, for as long as you leave it in place. The two figures
        above are that rate over stretches you might pick, not an end date. A course changes the
        rhythm capital enters at, never the rate it earns.
      </p>
    </div>
  );
}

/** Kept for the empty state on other surfaces. */
export function CourseEmpty() {
  return (
    <Empty
      icon={CalendarClock}
      title="No course set"
      body="Set an amount and a rhythm, and every placement between here and the rung you are aiming at gets a date."
      action={{ label: "Set a course", to: "/app/course" }}
    />
  );
}
