import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CircleAlert, Layers, RotateCcw, Split } from "lucide-react";
import { MINIMUM_PLACEMENT, maxParts } from "@/features/ladder/plan";
import { CYCLE_DAYS, TIERS, tierForAmount } from "@/domain/tiers";
import { useLedger } from "@/hooks/useLedger";
import {
  Compare,
  Schedule,
  echelon,
  legChoices,
  spacingChoices,
  validate,
} from "@/features/echelon";
import { Empty, Metric } from "@/components/system/ui";
import { days, fullDate, money } from "@/components/system/format";

/**
 * Echelon: plan one sum as several terms that start days apart.
 *
 * The surface exists because the schedule is the product. A member who wants
 * capital arriving on a rhythm has to open positions by hand, days apart,
 * remembering each time, and the arithmetic for that already lives in the
 * ladder planner. This page gives it dates, an honest comparison against
 * placing the whole sum at once, and a button per leg on the day that leg is
 * due.
 *
 * What it deliberately does not do is pretend. There is no future dated write
 * in this product: a position starts accruing when its `open` event is
 * recorded, and that happens when the member opens it. So the later legs are
 * shown as planned, never as scheduled, and nothing on this page will place
 * one on the member's behalf.
 *
 * The plan is kept in local storage so a member can come back to it, including
 * the date it was anchored to, because a schedule that slid forward to meet
 * whoever opened the page would not be a schedule.
 */

const PLAN_KEY = "rgl_echelon_v1";

/** How often to re-read the clock. Legs come due by the day, so a minute is ample. */
const TICK_MS = 60_000;

type StoredPlan = {
  v: 1;
  total: number;
  parts: number;
  spacingDays: number;
  /** When leg one was anchored. Kept so the schedule does not slide on return. */
  from: number;
  /** Steps the member has noted as placed. A note on the plan, not a ledger fact. */
  placed: number[];
};

function readPlan(): StoredPlan | null {
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<StoredPlan>;
    if (typeof p?.total !== "number" || typeof p?.parts !== "number") return null;
    return {
      v: 1,
      total: p.total,
      parts: p.parts,
      spacingDays: typeof p.spacingDays === "number" ? p.spacingDays : CYCLE_DAYS / p.parts,
      from: typeof p.from === "number" ? p.from : Date.now(),
      placed: Array.isArray(p.placed) ? p.placed.filter((n) => typeof n === "number") : [],
    };
  } catch {
    // A browser that refuses storage still gets a working planner, it just
    // starts empty every time.
    return null;
  }
}

function writePlan(plan: StoredPlan) {
  try {
    localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
  } catch {
    /* the plan simply does not survive a reload */
  }
}

function clearPlan() {
  try {
    localStorage.removeItem(PLAN_KEY);
  } catch {
    /* nothing to undo */
  }
}

/* ── A row of chips that behave as one choice ───────────────────────────── */

function Choice({
  value,
  options,
  onPick,
  format,
  disabled,
  label,
}: {
  value: number;
  options: number[];
  onPick: (n: number) => void;
  format: (n: number) => string;
  disabled?: (n: number) => boolean;
  label: string;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((n) => {
        const off = disabled?.(n) ?? false;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onPick(n)}
            disabled={off}
            aria-pressed={value === n}
            className={`min-h-[44px] min-w-[3rem] rounded-xl border px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              value === n
                ? "border-[rgba(46,139,255,0.5)] bg-[rgba(46,139,255,0.14)] text-[var(--accent-hi)]"
                : "border-[var(--line)] text-[var(--text-mid)] hover:border-[var(--line-hi)]"
            }`}
          >
            {format(n)}
          </button>
        );
      })}
    </div>
  );
}

/* ── The route ──────────────────────────────────────────────────────────── */

export default function EchelonRoute() {
  const snap = useLedger();
  const stored = useMemo(readPlan, []);

  const [total, setTotal] = useState(() => stored?.total ?? 0);
  const [amountText, setAmountText] = useState(() => (stored?.total ? String(stored.total) : ""));
  const [parts, setParts] = useState(() => stored?.parts ?? 3);
  const [spacing, setSpacing] = useState(
    () => stored?.spacingDays ?? Math.round(CYCLE_DAYS / (stored?.parts ?? 3)),
  );
  const [from, setFrom] = useState(() => stored?.from ?? Date.now());
  const [placed, setPlaced] = useState<number[]>(() => stored?.placed ?? []);
  const [now, setNow] = useState(() => Date.now());

  // Whether a leg has come due is a fact about the calendar, not decoration,
  // so this tick runs whatever the member's motion preference is.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  /**
   * Changing the shape of the plan makes a new plan. The anchor moves to today
   * and any legs noted as placed are cleared, because a note against leg two of
   * six means nothing once there are four legs.
   */
  const reshape = (next: { total?: number; parts?: number; spacing?: number }) => {
    if (next.total !== undefined) setTotal(next.total);
    if (next.parts !== undefined) {
      setParts(next.parts);
      setSpacing(Math.max(1, Math.round(CYCLE_DAYS / next.parts)));
    }
    if (next.spacing !== undefined) setSpacing(next.spacing);
    setFrom(Date.now());
    setPlaced([]);
  };

  const validity = useMemo(() => validate(total, parts, spacing), [total, parts, spacing]);

  const plan = useMemo(
    () => (validity.ok ? echelon(total, parts, spacing, from, now) : null),
    [validity.ok, total, parts, spacing, from, now],
  );

  // Persisted on every change so a member who leaves mid decision comes back to
  // the same schedule on the same dates.
  useEffect(() => {
    if (total > 0) writePlan({ v: 1, total, parts, spacingDays: spacing, from, placed });
    else clearPlan();
  }, [total, parts, spacing, from, placed]);

  const togglePlaced = (step: number) =>
    setPlaced((prev) => (prev.includes(step) ? prev.filter((s) => s !== step) : [...prev, step]));

  /* ── Amounts worth offering ── */

  const presets = useMemo(() => {
    const set = new Set<number>(TIERS.map((t) => t.entry));
    // A member's own balance is the amount they are most likely to place.
    if (snap.available >= MINIMUM_PLACEMENT) set.add(Math.floor(snap.available));
    return [...set].sort((a, b) => a - b);
  }, [snap.available]);

  // Every division is shown and the ones the total cannot carry are disabled
  // rather than removed, so the ceiling is visible instead of the row silently
  // shrinking. This matches the laddering control on Horizon.
  const legOptions = [2, 3, 4, 5, 6];
  const placeable = legChoices(total, 6);
  // The stored plan can carry a spacing that is not on the current ladder, so
  // the member's own value is always folded in and the chip stays selected.
  const spacingOptions = useMemo(
    () => [...new Set([...spacingChoices(parts), spacing])].sort((a, b) => a - b),
    [parts, spacing],
  );
  const ceiling = maxParts(total);

  /* ── What the plan means for standing ── */

  const peak = plan?.steady.peakDeployed ?? 0;
  const standingAfter = Math.max(snap.contributed + total, snap.peakDeployed);
  const tierAfter = tierForAmount(standingAfter);

  /* ── The leg to act on, and the ones behind it ── */

  const outstanding = plan?.due.filter((l) => !placed.includes(l.step)) ?? [];
  const nextLeg = outstanding[0] ?? null;
  const upcoming = plan?.planned.find((l) => !placed.includes(l.step)) ?? null;
  const allPlaced = plan !== null && placed.length >= plan.legs.length;

  // Re-anchoring a plan that already starts today would do nothing, so the
  // control is offered only once the anchor is genuinely in the past.
  const anchoredToday = new Date(from).toDateString() === new Date(now).toDateString();

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Formation</p>
        <h1 className="display mt-1.5 text-2xl sm:text-3xl">Echelon</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--text-low)]">
          One sum placed as several terms that start days apart, so capital returns on a rolling
          schedule instead of on a single date. Each leg still runs its own {CYCLE_DAYS} days at the
          same rate, so the total reward does not change. Only the timing does.
        </p>
      </header>

      {/* ── The controls ── */}
      <section className="band" aria-labelledby="plan-title">
        <div className="band-head">
          <h2 id="plan-title" className="band-title">
            The plan
          </h2>
          <span className="hairline" aria-hidden="true" />
        </div>

        <div className="panel mt-4 p-4 sm:p-5">
          <div>
            <label htmlFor="echelon-total" className="eyebrow">
              Total to place
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[rgba(5,7,15,0.5)] px-3">
              <span className="metric text-lg text-[var(--text-mid)]" aria-hidden="true">
                $
              </span>
              <input
                id="echelon-total"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={amountText}
                placeholder="0"
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  setAmountText(raw);
                  reshape({ total: Number(raw) || 0 });
                }}
                className="metric w-full bg-transparent py-3 text-lg text-[var(--text-hi)] outline-none placeholder:text-[var(--text-low)]"
                aria-describedby="echelon-total-hint"
              />
            </div>
            <p id="echelon-total-hint" className="mt-1.5 text-[11px] text-[var(--text-low)]">
              Every leg has to clear {money(MINIMUM_PLACEMENT)}
              {total > 0
                ? `, so ${money(total)} splits ${ceiling} ${ceiling === 1 ? "way" : "ways"} at most.`
                : "."}
            </p>

            <Choice
              label="Preset totals"
              value={total}
              options={presets}
              onPick={(n) => {
                setAmountText(String(n));
                reshape({ total: n });
              }}
              format={(n) => money(n)}
            />
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <fieldset className="min-w-0">
              <legend className="eyebrow">Legs</legend>
              <Choice
                label="Number of legs"
                value={parts}
                options={legOptions}
                onPick={(n) => reshape({ parts: n })}
                format={(n) => String(n)}
                disabled={(n) => !placeable.includes(n)}
              />
              <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-low)]">
                {total > 0 && ceiling < 2
                  ? `${money(total)} cannot be split. A second leg would fall under the ${money(MINIMUM_PLACEMENT)} minimum.`
                  : `Leg one carries the remainder, so the legs add up to exactly ${money(total || 0)}.`}
              </p>
            </fieldset>

            <fieldset className="min-w-0">
              <legend className="eyebrow">Days between legs</legend>
              <Choice
                label="Days between one leg opening and the next"
                value={spacing}
                options={spacingOptions}
                onPick={(n) => reshape({ spacing: n })}
                format={(n) => String(n)}
              />
              <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-low)]">
                {parts} legs {days(spacing)} days apart puts the last maturity{" "}
                {days((parts - 1) * spacing)} days behind the first.
              </p>
            </fieldset>
          </div>
        </div>
      </section>

      {/* ── Empty: no total named yet ── */}
      {total <= 0 && (
        <section className="panel" aria-label="No plan yet">
          <Empty
            icon={Layers}
            title="Name a total to plan against"
            body={`Type an amount above or pick one of the presets. Anything from ${money(MINIMUM_PLACEMENT)} can be placed, and from ${money(MINIMUM_PLACEMENT * 2)} it can be split into legs.`}
          />
        </section>
      )}

      {/* ── Not placeable: say exactly why ── */}
      {total > 0 && !validity.ok && (
        <section className="band" aria-labelledby="blocked-title">
          <div className="band-head">
            <h2 id="blocked-title" className="band-title">
              Nothing placeable yet
            </h2>
            <span className="hairline" aria-hidden="true" />
          </div>
          <div className="panel mt-4 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[rgba(251,191,36,0.3)] bg-[rgba(251,191,36,0.1)]">
                <CircleAlert
                  className="h-4 w-4 text-[var(--warn)]"
                  strokeWidth={1.9}
                  aria-hidden="true"
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--text-hi)]">
                  This plan cannot be placed as it stands
                </p>
                <ul className="mt-2 space-y-1.5">
                  {validity.reasons.map((reason) => (
                    <li key={reason} className="text-sm leading-relaxed text-[var(--text-low)]">
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── The schedule ── */}
      {plan && (
        <>
          <section className="band" aria-labelledby="schedule-title">
            <div className="band-head">
              <h2 id="schedule-title" className="band-title">
                Schedule
              </h2>
              <span className="hairline" aria-hidden="true" />
            </div>

            <div className="grid gap-2.5 mt-4 grid-cols-2 lg:grid-cols-4">
              <Metric label="Total placed" sub={`${plan.parts} legs`}>
                {money(plan.total)}
              </Metric>
              <Metric label="Total reward" tone="gain" sub="the same either way">
                {money(plan.reward)}
              </Metric>
              <Metric
                label="Releases"
                sub={`one every ${days(plan.steady.everyDays)} days, ${fullDate(plan.steady.rhythmFrom)} to ${fullDate(plan.steady.rhythmTo)}`}
              >
                {plan.compare.dates} dates
              </Metric>
              <Metric
                label="Peak at work"
                tone={plan.steady.overlaps ? "accent" : "default"}
                sub={
                  plan.steady.overlaps
                    ? `all legs open from ${fullDate(plan.steady.fullyDeployedAt)}`
                    : "the legs never all run at once"
                }
              >
                {money(peak)}
              </Metric>
            </div>

            <div className="panel mt-4 p-4 sm:p-5">
              <Schedule
                plan={plan}
                placed={placed}
                action={(leg) => {
                  const isPlaced = placed.includes(leg.step);
                  return (
                    <span className="flex items-center gap-1.5">
                      {!isPlaced && (
                        <Link
                          to={`/app/vaults/new?amount=${leg.amount}`}
                          className="btn btn-primary px-3 py-2 text-xs"
                          aria-label={`Place leg ${leg.step}, ${money(leg.amount)}`}
                        >
                          Place
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => togglePlaced(leg.step)}
                        aria-pressed={isPlaced}
                        className={`chip transition-colors ${isPlaced ? "chip-gain" : "hover:border-[var(--line-hi)] hover:text-[var(--text-hi)]"}`}
                      >
                        {isPlaced ? "Marked placed" : "Mark placed"}
                      </button>
                    </span>
                  );
                }}
              />

              {/* Marking is a note on the member's own plan. Saying so is the
                  difference between a record and a claim. */}
              <p className="mt-4 text-xs leading-relaxed text-[var(--text-low)]">
                {allPlaced
                  ? "Every leg is marked placed. This plan is a note to yourself, so check Vaults for what the ledger actually holds."
                  : nextLeg
                    ? `Leg ${nextLeg.step} is due. Placing it opens a real position for ${money(nextLeg.amount)}, recorded in your ledger the moment you confirm it.`
                    : upcoming
                      ? `Nothing is due today. Leg ${upcoming.step} opens ${fullDate(upcoming.opensAt)}.`
                      : "Nothing is due today."}{" "}
                Marking a leg placed only updates this plan. It writes nothing to the ledger, and
                the ledger is what every figure in Rigel is derived from.
              </p>

              {outstanding.length > 1 && (
                <p className="mt-2 text-xs leading-relaxed text-[var(--warn)]">
                  {outstanding.length} legs have reached their date and none of them are marked
                  placed. A leg that passes is not carried forward and nothing is placed on your
                  behalf. Open them, or start the schedule again from today.
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {nextLeg && (
                  <Link to={`/app/vaults/new?amount=${nextLeg.amount}`} className="btn btn-primary">
                    <Split className="h-4 w-4" aria-hidden="true" />
                    Place leg {nextLeg.step}, {money(nextLeg.amount)}
                  </Link>
                )}
                {!anchoredToday && (
                  <button type="button" onClick={() => reshape({})} className="btn btn-outline">
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Start again from today
                  </button>
                )}
              </div>

              <p className="mt-3.5 text-[11px] leading-relaxed text-[var(--text-low)]">
                Rigel does not move money for you. This is your own schedule, held in this browser.
                Each leg opens on the day you open it, and no leg is placed, carried forward or
                scheduled on your behalf. Once a leg is open, its maturity joins the rest on{" "}
                <Link
                  to="/app/horizon"
                  className="text-[var(--accent-hi)] underline underline-offset-2"
                >
                  Horizon
                </Link>
                .
              </p>
            </div>
          </section>

          {/* ── The comparison ── */}
          <section className="band" aria-labelledby="compare-title">
            <div className="band-head">
              <h2 id="compare-title" className="band-title">
                Against one placement
              </h2>
              <span className="hairline" aria-hidden="true" />
            </div>
            <div className="mt-4">
              <Compare plan={plan} />
            </div>
          </section>

          {/* ── Standing ── */}
          <section className="band" aria-labelledby="standing-title">
            <div className="band-head">
              <h2 id="standing-title" className="band-title">
                What it does to standing
              </h2>
              <span className="hairline" aria-hidden="true" />
            </div>
            <div className="panel mt-4 p-4 sm:p-5">
              <p className="text-sm leading-relaxed text-[var(--text-low)]">
                Standing is measured on the greater of the capital you have brought in from outside
                and the most principal you have ever had at work at one instant. Money brought in
                from outside counts in full however it is placed, so splitting {money(plan.total)}{" "}
                into {plan.parts} legs costs you nothing on the ladder: it still stands you at{" "}
                {tierAfter ? tierAfter.name : "no tier yet"}.
              </p>
              <p className="mt-2.5 text-sm leading-relaxed text-[var(--text-low)]">
                {plan.steady.overlaps
                  ? `Capital re-placed from your balance counts on the peak instead, and these legs overlap, so the peak reaches the whole ${money(plan.total)} from ${fullDate(plan.steady.fullyDeployedAt)}. Either way the reading is the same.`
                  : `Capital re-placed from your balance counts on the peak instead, and at ${days(plan.spacingDays)} days apart these legs never run together. The most at work at one instant is ${money(peak)}, not ${money(plan.total)}, so a plan funded from your balance would stand lower than the same sum placed at once.`}
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
