import { useId, type ReactNode } from "react";
import { CYCLE_DAYS, CYCLE_RETURN } from "@/domain/tiers";
import { Value } from "@/components/system/Value";
import { days, fullDate, money } from "@/components/system/format";
import type { AccrualPoint, EchelonPlan } from "./plan";

/**
 * Compare: what an echelon actually changes, and what it does not.
 *
 * The headline is the thing a member would otherwise have to work out for
 * themselves, so it is stated first and not in a footnote: the total reward is
 * identical. Every leg accrues at the same rate as one placement of the same
 * size, so a split total earns exactly what an unsplit one earns.
 *
 * What differs is timing. Capital comes back on several dates instead of one,
 * less of it rides on any single date, and less of it is at work in the early
 * days. The third of those is a real cost, in dollars, and it is named here
 * rather than left for the member to discover at day thirty.
 *
 * The two readings are shown at the same size. Sizing one figure larger than
 * the figure it is being compared against would distort the very comparison
 * this component exists to make, so the cost is carried by its own line and a
 * warn chip instead.
 */

export type CompareProps = {
  plan: EchelonPlan;
  className?: string;
};

/* ── The accrual chart ──────────────────────────────────────────────────── */

const W = 320;
const H = 92;
const PAD = 3;

/**
 * A step path across the series. Accrual holds flat between one leg opening or
 * maturing and the next, so the line is drawn as steps rather than smoothed:
 * a slope between two samples would draw a rate that never existed.
 */
function stepPath(points: AccrualPoint[], value: (p: AccrualPoint) => number, plan: EchelonPlan) {
  const maxY = Math.max(plan.compare.single.daily, 1e-9);
  const x = (day: number) => (day / Math.max(plan.spanDays, 1)) * W;
  const y = (v: number) => H - PAD - (v / maxY) * (H - PAD * 2);

  let d = "";
  points.forEach((p, i) => {
    const px = x(p.day);
    const py = y(value(p));
    d += i === 0 ? `M${px.toFixed(2)} ${py.toFixed(2)}` : ` H${px.toFixed(2)} V${py.toFixed(2)}`;
  });
  return d;
}

function AccrualChart({ plan }: { plan: EchelonPlan }) {
  const gradientId = useId();
  const { accrual, compare, spanDays } = plan;

  const line = stepPath(accrual, (p) => p.echelon, plan);
  // The same path closed down to the baseline, so the area reads as capital at
  // work rather than as a second line to compare against the first.
  const area = `${line} V${H - PAD} H0 Z`;
  const single = stepPath(accrual, (p) => p.single, plan);
  const lumpX = ((CYCLE_DAYS / Math.max(spanDays, 1)) * W).toFixed(2);

  return (
    <div className="mt-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Reward per day across the plan. One placement accrues ${money(compare.single.daily, 2)} a day from day one until it matures. The echelon starts at ${money(accrual[0]?.echelon ?? 0, 2)} a day, rises as each leg opens, and falls away as each leg matures.`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.03" />
          </linearGradient>
        </defs>

        {/* The day one placement would have matured. */}
        <line
          x1={lumpX}
          y1="0"
          x2={lumpX}
          y2={H}
          stroke="var(--line-hi)"
          strokeDasharray="3 3"
          vectorEffect="non-scaling-stroke"
        />

        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke="var(--accent-hi)"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={single}
          fill="none"
          stroke="var(--text-low)"
          strokeWidth="1.5"
          strokeDasharray="5 3"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[var(--text-low)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-[var(--accent-hi)]" aria-hidden="true" />
          Echelon, {plan.parts} legs
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-0.5 w-4 rounded-full bg-[var(--text-low)] opacity-70"
            aria-hidden="true"
          />
          One placement
        </span>
        <span className="tabular">
          Peak {money(compare.single.daily, 2)} a day, both ways
        </span>
      </div>
    </div>
  );
}

/* ── One dimension of difference ────────────────────────────────────────── */

function Facet({
  label,
  lump,
  echelon,
  note,
}: {
  label: string;
  lump: ReactNode;
  echelon: ReactNode;
  note?: string;
}) {
  return (
    <div className="inset p-3.5">
      <dt className="tag-micro">{label}</dt>
      {/* Two readings, stacked on a phone and side by side from sm up, so the
          comparison never becomes something the member has to scroll. */}
      <dd className="mt-2.5 grid gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <p className="eyebrow">One placement</p>
          <div className="mt-1 text-sm leading-snug text-[var(--text-hi)]">{lump}</div>
        </div>
        <div className="min-w-0 sm:border-l sm:border-[var(--line)] sm:pl-3">
          <p className="eyebrow">Echelon</p>
          <div className="mt-1 text-sm leading-snug text-[var(--text-hi)]">{echelon}</div>
        </div>
      </dd>
      {note && <p className="mt-2.5 text-xs leading-relaxed text-[var(--text-low)]">{note}</p>}
    </div>
  );
}

/* ── The comparison ─────────────────────────────────────────────────────── */

export function Compare({ plan, className = "" }: CompareProps) {
  const c = plan.compare;
  const rate = `${(CYCLE_RETURN * 100).toFixed(0)}%`;

  return (
    <div className={`min-w-0 ${className}`}>
      {/* ── The headline, which is the identity ── */}
      <div className="panel-hi p-4 sm:p-5">
        <p className="eyebrow">What does not change</p>
        <h3 className="display mt-1.5 text-lg sm:text-xl">The reward is identical either way</h3>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-[var(--text-low)]">
          Every leg accrues at the same {rate} over its own {CYCLE_DAYS} days as one placement of
          the same size, so {money(plan.total)} returns {money(c.reward)} in rewards whether it is
          placed once or {plan.parts} times. An echelon buys timing, not yield.
        </p>

        <div className="bento mt-4">
          <div className="bento-cell inset p-3.5 lg:col-span-6">
            <p className="eyebrow">One placement, total reward</p>
            <p className="figure-mid mt-1.5">
              <Value value={c.reward} decimals={2} />
            </p>
            <p className="mt-1 text-xs text-[var(--text-low)]">
              All of it on {fullDate(c.lumpMaturesAt)}.
            </p>
          </div>
          <div className="bento-cell inset p-3.5 lg:col-span-6">
            <p className="eyebrow">
              Echelon, {plan.parts} legs, total reward
            </p>
            <p className="figure-mid mt-1.5">
              <Value value={c.reward} decimals={2} />
            </p>
            <p className="mt-1 text-xs text-[var(--text-low)]">
              Spread across {c.dates} dates, {fullDate(c.firstMaturesAt)} to{" "}
              {fullDate(c.lastMaturesAt)}.
            </p>
          </div>
        </div>
      </div>

      {/* ── What does change ── */}
      <p className="eyebrow mt-5">What does change</p>
      <dl className="mt-2.5 space-y-2.5">
        <Facet
          label="When capital is accessible"
          lump={
            <>
              <span className="tabular">{money(c.largestSingleDate)}</span> on one date,{" "}
              {fullDate(c.lumpMaturesAt)}. Nothing before it.
            </>
          }
          echelon={
            <>
              {c.dates} releases from {fullDate(c.firstMaturesAt)}, one every{" "}
              {days(plan.spacingDays)} days, ending {fullDate(c.lastMaturesAt)}.
            </>
          }
          note={`Both reach a first maturity on ${fullDate(c.firstMaturesAt)}, because leg one opens on the same day either way. What differs is the size of it, ${money(c.largestSingleDate)} against ${money(plan.legs[0].releases)}, and that ${c.dates - 1} further dates follow over the next ${days(plan.lagDays)} days.`}
        />

        <Facet
          label="Exposure to a single date"
          lump={
            <>
              <span className="tabular">{Math.round(c.singleConcentration * 100)}%</span> of
              everything returning rides on one day.
            </>
          }
          echelon={
            <>
              <span className="tabular">{Math.round(c.echelonConcentration * 100)}%</span> at most
              on any one day, which is {money(c.largestEchelonDate)}.
            </>
          }
          note="Spreading the dates does not reduce risk. Every leg is held by the same operator on the same terms, so this is a concentration of timing, not of counterparty."
        />

        <Facet
          label={`Capital at work in the first ${CYCLE_DAYS} days`}
          lump={
            <>
              <span className="tabular">{money(c.singleMeanDeployedFirstTerm)}</span> from day one,
              accruing <span className="tabular">{money(c.reward, 2)}</span> by{" "}
              {fullDate(c.lumpMaturesAt)}.
            </>
          }
          echelon={
            <>
              <span className="tabular">{money(c.meanDeployedFirstTerm)}</span> on average,
              accruing <span className="tabular">{money(c.accruedByLumpMaturity, 2)}</span> by the
              same date.
            </>
          }
          note={`The legs open days apart, so by ${fullDate(c.lumpMaturesAt)} they have not all run a full term. This is the real cost of the formation.`}
        />
      </dl>

      {c.shortfallAtLumpMaturity > 0 && (
        <p className="mt-3">
          <span className="chip chip-warn">
            <span className="tabular">{money(c.shortfallAtLumpMaturity, 2)}</span> less by{" "}
            {fullDate(c.lumpMaturesAt)}
          </span>
        </p>
      )}

      {/* ── The shape of it ── */}
      <div className="inset mt-4 p-3.5 sm:p-4">
        <p className="tag-micro">Reward per day, across the whole plan</p>
        <AccrualChart plan={plan} />
      </div>

      {/* ── The fixed line, with the figures this plan actually produces ── */}
      <p className="mt-4 text-xs leading-relaxed text-[var(--text-low)]">
        The rate is the same on every leg. An echelon does not earn more and it does not reduce
        risk, because every leg carries the same operator risk as one placement of the same size.
        It accrues {money(c.shortfallAtLumpMaturity, 2)} less by {fullDate(c.lumpMaturesAt)} and
        reaches the same {money(c.reward, 2)} {days(c.lagDays)} days later. What it changes is when
        capital comes back.
      </p>
    </div>
  );
}
