import { Link } from "react-router-dom";
import { toast } from "sonner";
import { CalendarClock, Zap } from "lucide-react";
import { fireRelay, type Snapshot } from "@/domain/ledger";
import { playTierChord } from "@/lib/sound";
import { days, fullDate, money, relative } from "@/components/system/format";
import { BandHead } from "@/components/system/ui";

/**
 * Standing: the instructions that are waiting on the member right now.
 *
 * The Desk is documented as where a member acts, and until now the only two
 * acts it offered were funding and withdrawing. An armed relay whose term has
 * matured, and a course leg whose date has arrived, are both acts too, and
 * both are currently invisible unless the member happens to open the vault or
 * the course they belong to.
 *
 * Two rules hold it honest.
 *
 * Every figure comes from the snapshot. A relay row states the carry the
 * ledger derived and the accrual the delay is actually costing; a course row
 * states the leg amount the member set. Nothing is estimated and nothing is
 * rounded up.
 *
 * And it renders nothing at all when there is nothing due. A panel that says
 * "no action needed" on most visits trains a member to stop reading the one
 * place that will eventually need them.
 *
 * Relays normally fire on their own the moment the member opens the product,
 * so this panel is mostly for members who turned automatic firing off in the
 * relay panel and run them by hand.
 */

export type StandingProps = {
  snap: Snapshot;
  className?: string;
};

export function Standing({ snap, className = "" }: StandingProps) {
  const relays = snap.relaysDue;
  // Every due leg belongs to the one course that is still running, and reading
  // them off it rather than off `courseDue` is what gives each row the course
  // id its placement link needs.
  const course = snap.activeCourse;
  const legs = course ? course.schedule.filter((leg) => leg.state === "due") : [];

  if (relays.length === 0 && legs.length === 0) return null;

  const runOne = (positionId: string) => {
    const relay = relays.find((r) => r.positionId === positionId);
    const position = snap.positions.find((p) => p.id === positionId);
    if (!relay || !position) return;
    fireRelay(relay, position);
    playTierChord(position.tier.id);
    toast.success(`${position.tier.name} vault rolled`, {
      description: `${money(relay.carries)} carried into a new term.`,
    });
  };

  return (
    <section className={className} aria-labelledby="standing-title">
      <BandHead
        id="standing-title"
        title="Standing"
        hint="Instructions you set that have come due"
      />

      <div className="ledger">
        {relays.map((relay) => {
          const position = snap.positions.find((p) => p.id === relay.positionId);
          if (!position) return null;
          return (
            <div key={relay.positionId} className="rail-row flex-wrap">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-[rgba(251,191,36,0.1)]">
                <Zap className="h-4 w-4 text-[var(--warn)]" strokeWidth={1.9} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-[var(--text-hi)]">
                  {position.tier.name} relay is due
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-[var(--text-low)]">
                  {money(relay.carries)} has been still for {days(relay.overdueDays)} days, which is{" "}
                  {money(relay.forgoneDaily, 2)} a day not accruing.
                </span>
              </span>
              <button
                type="button"
                onClick={() => runOne(relay.positionId)}
                className="btn btn-primary min-h-[44px] shrink-0 !py-2 !text-[13px]"
              >
                Run relay
              </button>
            </div>
          );
        })}

        {course &&
          legs.map((leg) => (
            <div key={`leg-${leg.index}`} className="rail-row flex-wrap">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-[rgba(46,139,255,0.07)]">
                <CalendarClock
                  className="h-4 w-4 text-[var(--accent-hi)]"
                  strokeWidth={1.9}
                  aria-hidden="true"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-[var(--text-hi)]">
                  Course leg {leg.index} is due
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-[var(--text-low)]">
                  {money(leg.amount)}, due {fullDate(leg.dueAt)} · {relative(leg.dueAt)}
                </span>
              </span>
              <Link
                to={`/app/vaults/new?amount=${Math.round(leg.amount)}&course=${encodeURIComponent(
                  course.id,
                )}&leg=${leg.index}`}
                className="btn btn-secondary min-h-[44px] shrink-0 !py-2 !text-[13px]"
              >
                Place {money(leg.amount)}
              </Link>
            </div>
          ))}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-[var(--text-low)]">
        Rigel cannot move money on your behalf, so a course leg is one you place yourself. A relay
        writes to your own ledger and nothing else.
      </p>
    </section>
  );
}
