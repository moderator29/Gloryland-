import type { ReactNode } from "react";

/**
 * A row of derived figures under a heading.
 *
 * Every entry is passed in already computed by the caller from the ledger
 * snapshot, so the band has no way to produce a number of its own. It lays out
 * two across at 360px and opens up from there, which keeps the labels readable
 * rather than shrinking them to fit a phone.
 */

export type Stat = {
  key: string;
  /** Small, tracked, uppercase. Two or three words at most. */
  label: string;
  /** The figure. A node so an animated value or a pill can be passed in. */
  value: ReactNode;
  /** One short line under the figure, for the unit or the caveat. */
  sub?: string;
  tone?: "default" | "gain" | "accent" | "muted";
  /**
   * Render the value as passed, without the figure treatment. For entries that
   * are a component rather than a number, such as the Cadence pill.
   */
  plain?: boolean;
};

const TONE: Record<NonNullable<Stat["tone"]>, string> = {
  default: "text-[var(--text-hi)]",
  gain: "text-[var(--gain)]",
  accent: "text-[var(--accent-hi)]",
  muted: "text-[var(--text-mid)]",
};

export function StatBand({ stats, className = "" }: { stats: Stat[]; className?: string }) {
  return (
    <dl className={`grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 ${className}`}>
      {stats.map((s) => (
        <div key={s.key} className="inset flex min-w-0 flex-col justify-between gap-2 p-3.5">
          <dt className="tag-micro">{s.label}</dt>
          <dd className="min-w-0">
            {s.plain ? (
              <span className="block min-w-0">{s.value}</span>
            ) : (
              <span className={`metric block truncate text-lg ${TONE[s.tone ?? "default"]}`}>
                {s.value}
              </span>
            )}
            {s.sub && (
              <span className="mt-1 block truncate text-[11px] text-[var(--text-low)]">
                {s.sub}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
