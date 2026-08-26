import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import type { Plan } from "./rungs";
import { money, fullDate, days } from "@/components/system/format";
import { CYCLE_DAYS, CYCLE_RETURN } from "@/domain/tiers";

/**
 * Which leg crosses which rung, and on what date.
 *
 * The point of the table is the date column. A ladder that only shows the
 * money is a price list; a ladder that shows when each rung arrives at this
 * rhythm is a plan. Rungs the member already holds are marked rather than
 * hidden, so the distance travelled is visible next to the distance left.
 */

export type RungsProps = {
  plan: Plan;
  className?: string;
};

export function Rungs({ plan, className = "" }: RungsProps) {
  const ahead = plan.rungs.filter((r) => !r.held);

  if (ahead.length === 0) {
    return (
      <div className={`inset p-4 ${className}`}>
        <p className="text-sm text-[var(--text-hi)]">You hold the top rung already.</p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--text-low)]">
          A course still has a job here: it keeps capital entering terms on a rhythm rather than in
          one decision, and every leg earns the same {(CYCLE_RETURN * 100).toFixed(0)}% across{" "}
          {CYCLE_DAYS} days.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* A five column table does not fit a phone, so the rail scrolls inside
          itself rather than pushing the page sideways. */}
      <div className="no-bar fade-x -mx-1 overflow-x-auto px-1">
        <table className="w-full min-w-[34rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--line)]">
              <th scope="col" className="eyebrow py-2 pr-3 text-left">
                Rung
              </th>
              <th scope="col" className="eyebrow py-2 pr-3 text-left">
                Settles
              </th>
              <th scope="col" className="eyebrow py-2 pr-3 text-right">
                Standing
              </th>
              <th scope="col" className="eyebrow py-2 pr-3 text-right">
                Leg
              </th>
              <th scope="col" className="eyebrow py-2 text-right">
                Due
              </th>
            </tr>
          </thead>
          <tbody>
            {plan.rungs.map((rung) => (
              <tr
                key={rung.tier.id}
                className={`border-b border-[var(--line)] last:border-0 ${
                  rung.held ? "opacity-55" : ""
                }`}
              >
                <th scope="row" className="py-3 pr-3 text-left font-semibold text-[var(--text-hi)]">
                  <span className="flex items-center gap-1.5">
                    {rung.held && (
                      <Check
                        className="h-3.5 w-3.5 shrink-0 text-[var(--gain)]"
                        strokeWidth={2.4}
                        aria-label="Already held"
                      />
                    )}
                    <Link
                      to={`/app/tiers/${rung.tier.id}`}
                      className="hover:text-[var(--accent-hi)]"
                    >
                      {rung.tier.name}
                    </Link>
                  </span>
                </th>
                <td className="tabular py-3 pr-3 text-[var(--text-low)]">
                  {rung.tier.settlementHours}h
                </td>
                <td className="tabular py-3 pr-3 text-right text-[var(--text)]">
                  {money(rung.cumulative)}
                </td>
                <td className="tabular py-3 pr-3 text-right text-[var(--text-low)]">
                  {rung.held ? "held" : rung.leg}
                </td>
                <td className="tabular py-3 text-right text-[var(--text-hi)]">
                  {rung.held ? "now" : fullDate(rung.dueAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {plan.reaches && (
        <p className="mt-3 text-xs leading-relaxed text-[var(--text-low)]">
          At {money(plan.amount)} every {plan.everyDays} days, this reaches{" "}
          <span className="text-[var(--text-hi)]">{plan.reaches.tier.name}</span> on leg{" "}
          {plan.reaches.leg}, {days(plan.reaches.dayOffset)} days from the first placement. Every
          date assumes each leg is filled on time; a leg that lapses moves every date after it.
        </p>
      )}
    </div>
  );
}
