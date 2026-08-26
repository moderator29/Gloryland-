import { Link } from "react-router-dom";
import { Check, CircleDashed, Clock, MinusCircle } from "lucide-react";
import type { Course, CourseLeg } from "@/domain/ledger";
import { money, fullDate, relative } from "@/components/system/format";

/**
 * The legs of a course, as a record rather than a to do list.
 *
 * A lapsed leg stays on the schedule, struck through. It is not rolled forward
 * and it is not deleted, because the rung the member was aiming at moved when
 * that date slipped, and hiding the reason would leave them looking at a date
 * that changed for no visible cause.
 */

const STATE = {
  filled: {
    icon: Check,
    label: "Filled",
    chip: "chip chip-gain",
    row: "",
  },
  due: {
    icon: Clock,
    label: "Due",
    chip: "chip chip-warn",
    row: "",
  },
  scheduled: {
    icon: CircleDashed,
    label: "Scheduled",
    chip: "chip",
    row: "",
  },
  lapsed: {
    icon: MinusCircle,
    label: "Lapsed",
    chip: "chip",
    row: "opacity-55",
  },
} as const;

export type ScheduleProps = {
  course: Course;
  /** How many legs to show before the rest are folded away. */
  limit?: number;
  className?: string;
};

export function Schedule({ course, limit = 12, className = "" }: ScheduleProps) {
  // Show the work that is live first: everything up to and including the leg
  // that needs attention, then the next few, rather than 60 rows of "someday".
  const dueIndex = course.nextDue?.index ?? course.filledCount;
  const from = Math.max(0, dueIndex - 4);
  const visible = course.schedule.slice(from, from + limit);
  const hiddenBefore = from;
  const hiddenAfter = Math.max(0, course.schedule.length - (from + visible.length));

  return (
    <div className={className}>
      {hiddenBefore > 0 && (
        <p className="mb-2 text-xs text-[var(--text-low)]">
          {hiddenBefore} earlier {hiddenBefore === 1 ? "leg" : "legs"} above.
        </p>
      )}

      <ol className="ledger">
        {visible.map((leg) => (
          <Row key={leg.index} leg={leg} course={course} />
        ))}
      </ol>

      {hiddenAfter > 0 && (
        <p className="mt-2 text-xs text-[var(--text-low)]">
          {hiddenAfter} further {hiddenAfter === 1 ? "leg" : "legs"} after this, every{" "}
          {course.everyDays} days.
        </p>
      )}
    </div>
  );
}

function Row({ leg, course }: { leg: CourseLeg; course: Course }) {
  const state = STATE[leg.state];
  const Icon = state.icon;

  return (
    <li className={`rail-row ${state.row}`}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--line)] bg-[rgba(5,7,15,0.5)]">
        <Icon
          className={`h-3.5 w-3.5 ${
            leg.state === "filled"
              ? "text-[var(--gain)]"
              : leg.state === "due"
                ? "text-[var(--warn)]"
                : "text-[var(--text-low)]"
          }`}
          strokeWidth={1.9}
          aria-hidden="true"
        />
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-[var(--text-hi)]">
          <span className={leg.state === "lapsed" ? "line-through" : undefined}>
            Leg {leg.index}
          </span>
          <span className="tabular text-[var(--text-low)]">{money(leg.amount)}</span>
          <span className={state.chip}>{state.label}</span>
        </p>
        <p className="mt-0.5 text-xs text-[var(--text-low)]">
          {leg.state === "filled"
            ? `Placed, term matures ${relative(leg.dueAt + 30 * 86_400_000)}`
            : `${fullDate(leg.dueAt)}, ${relative(leg.dueAt)}`}
        </p>
      </div>

      {leg.state === "due" && (
        <Link
          to={`/app/vaults/new?amount=${Math.round(leg.amount)}&course=${encodeURIComponent(course.id)}&leg=${leg.index}`}
          className="btn btn-primary shrink-0 !py-2 !text-xs"
        >
          Place
        </Link>
      )}
      {leg.state === "filled" && leg.positionId && (
        <Link
          to={`/app/vaults/${encodeURIComponent(leg.positionId)}`}
          className="btn btn-ghost shrink-0 !py-2 !text-xs"
        >
          View
        </Link>
      )}
    </li>
  );
}
