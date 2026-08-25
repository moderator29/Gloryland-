/**
 * Shared chart furniture: the dark tooltip shell, the empty state, and the
 * axis styling every chart in this folder uses so they read as one system.
 */

import type { ReactNode } from "react";

/** Below this the y-axis is dropped and x ticks are thinned. */
export const COMPACT_WIDTH = 420;

export const AXIS_TICK = { fill: "var(--text-low)", fontSize: 11 } as const;

export type TooltipRow = {
  label: string;
  value: string;
  tone?: "accent" | "gain" | "loss" | "muted";
};

const TONE: Record<NonNullable<TooltipRow["tone"]>, string> = {
  accent: "var(--accent-hi)",
  gain: "var(--gain)",
  loss: "var(--loss)",
  muted: "var(--text-mid)",
};

/**
 * The recharts default tooltip is a white box with no type scale. This is the
 * replacement: a raised surface on the product's own palette, tabular figures,
 * and no pointer events so it never fights the cursor.
 */
export function TooltipShell({ title, rows }: { title: string; rows: TooltipRow[] }) {
  return (
    <div className="raised pointer-events-none rounded-xl px-3 py-2 shadow-lg">
      <div className="eyebrow mb-1.5">{title}</div>
      <div className="flex flex-col gap-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4 text-xs">
            <span className="text-[var(--text-mid)]">{row.label}</span>
            <span
              className="tabular font-semibold"
              style={{ color: row.tone ? TONE[row.tone] : "var(--text-hi)" }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Shown instead of an axis-only chart when there is nothing to plot yet. */
export function ChartEmpty({
  title,
  hint,
  height = 180,
}: {
  title: string;
  hint: string;
  height?: number;
}) {
  return (
    <div
      className="inset flex flex-col items-center justify-center gap-1.5 px-6 text-center"
      style={{ height }}
    >
      <p className="text-sm font-semibold text-[var(--text)]">{title}</p>
      <p className="max-w-[34ch] text-xs leading-relaxed text-[var(--text-low)]">{hint}</p>
    </div>
  );
}

/** Panel header used by the chart cards: eyebrow, headline figure, aside. */
export function ChartHeader({
  eyebrow,
  value,
  sub,
  aside,
}: {
  eyebrow: string;
  value: string;
  sub?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="eyebrow">{eyebrow}</div>
        <div className="metric mt-1 text-2xl sm:text-[1.75rem]">{value}</div>
        {sub ? <div className="mt-1 text-xs text-[var(--text-mid)]">{sub}</div> : null}
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}
