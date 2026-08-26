import { ArrowRight, TriangleAlert } from "lucide-react";
import type { EchelonPlan } from "./plan";
import { days, fullDate, money } from "@/components/system/format";

/**
 * The split, against placing the whole sum at once.
 *
 * The comparison is one sided and the component says so, because under daily
 * accrual it genuinely is. Both plans hold the same principal in the end, both
 * accrue at the same rate, and both share one withdrawal window, so the only
 * difference a stagger makes is the accrual the later legs miss while they
 * wait. That figure is permanent: from the day the last leg opens the two
 * plans move in lockstep, so the gap never closes.
 *
 * Nothing here is dressed up as a trade off. A surface that put a benefit
 * column beside this one would be inventing the benefit.
 */

export type CompareProps = {
  plan: EchelonPlan;
  className?: string;
};

export function Compare({ plan, className = "" }: CompareProps) {
  const { compare, legs, total, parts, spacingDays } = plan;
  const last = legs[legs.length - 1];

  const rows: { label: string; atOnce: string; split: string; tone?: "warn" }[] = [
    {
      label: "Placed on day one",
      atOnce: money(total),
      split: money(compare.deployedOnDayOne),
    },
    {
      label: "Fully placed by",
      atOnce: fullDate(plan.from),
      split: last ? fullDate(last.opensAt) : fullDate(plan.from),
    },
    {
      label: "Accruing per day, once fully placed",
      atOnce: `${money(compare.dailyAtOnce, 2)} / day`,
      split: `${money(compare.dailyWhenComplete, 2)} / day`,
    },
    {
      label: "Withdrawal window",
      atOnce: `every ${compare.withdrawIntervalDays} days`,
      split: `every ${compare.withdrawIntervalDays} days`,
    },
    {
      label: "Accrual given up while waiting",
      atOnce: money(0, 2),
      split: money(compare.forgone, 2),
      tone: "warn",
    },
  ];

  return (
    <div className={className}>
      {/* A three column table does not fit a phone, so the rail scrolls inside
          itself rather than pushing the page sideways. */}
      <div className="no-bar fade-x -mx-1 overflow-x-auto px-1">
        <table className="w-full min-w-[30rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--line)]">
              <th scope="col" className="eyebrow py-2 pr-3 text-left">
                Reading
              </th>
              <th scope="col" className="eyebrow py-2 pr-3 text-right">
                All at once
              </th>
              <th scope="col" className="eyebrow py-2 text-right">
                {parts} legs, {days(spacingDays)} days apart
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-[var(--line)] last:border-0">
                <th scope="row" className="py-3 pr-3 text-left font-normal text-[var(--text-low)]">
                  {row.label}
                </th>
                <td className="tabular py-3 pr-3 text-right text-[var(--text-hi)]">{row.atOnce}</td>
                <td
                  className={`tabular py-3 text-right ${
                    row.tone === "warn" ? "text-[var(--warn)]" : "text-[var(--text-hi)]"
                  }`}
                >
                  {row.split}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-[var(--text)]">
        <TriangleAlert
          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--warn)]"
          strokeWidth={2}
          aria-hidden="true"
        />
        <span>
          Splitting {money(total)} into {parts} legs {days(spacingDays)} days apart gives up{" "}
          <span className="tabular text-[var(--warn)]">{money(compare.forgone, 2)}</span> of
          accrual, which is {days(compare.forgoneDays)} days of what the whole sum earns. That gap
          is permanent. Once the last leg is open both plans hold the same principal and accrue at
          the same rate, so nothing later makes it up.
        </span>
      </p>

      <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-[var(--text-low)]">
        <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
        <span>
          There is no column missing here. A split used to buy separate return dates, and there are
          no return dates now: a position accrues until you close it, and a withdrawal can be
          requested once every {compare.withdrawIntervalDays} days however many positions are open.
        </span>
      </p>
    </div>
  );
}
