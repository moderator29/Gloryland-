import { motion } from "framer-motion";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/* ── Section heading ─────────────────────────────────────────────────── */

export function SectionHeader({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-[var(--text-hi)]">{title}</h2>
        {hint && <p className="mt-0.5 truncate text-xs text-[var(--text-low)]">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

/* ── Band grammar ────────────────────────────────────────────────────────
   Three routes each carried a private copy of these two, which is how the
   band head on one page drifted a hairline away from the band head on the
   next. One definition, imported everywhere, is the whole point of a grammar. */

/** Left aligned section head: accent tick, label, hairline out to the edge. */
export function BandHead({
  title,
  hint,
  action,
  id,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  /** Set when a section uses aria-labelledby to point at this heading. */
  id?: string;
}) {
  return (
    <div className="mb-4">
      <div className="band-head">
        <h2 id={id} className="band-title">
          {title}
        </h2>
        <span className="hairline" aria-hidden="true" />
        {action}
      </div>
      {hint && <p className="mt-2 pl-[0.9375rem] text-xs text-[var(--text-low)]">{hint}</p>}
    </div>
  );
}

/** One supporting figure in the narrow rail beside a lead figure. */
export function RailStat({
  label,
  children,
  tone = "default",
}: {
  label: string;
  children: ReactNode;
  tone?: "default" | "gain" | "accent";
}) {
  const toneClass =
    tone === "gain"
      ? "text-[var(--gain)]"
      : tone === "accent"
        ? "text-[var(--accent-hi)]"
        : "text-[var(--text-hi)]";
  return (
    <div className="rail-stat">
      <span className="tag-micro">{label}</span>
      <span className={`metric text-lg ${toneClass}`}>{children}</span>
    </div>
  );
}

/* ── Breadcrumbs ─────────────────────────────────────────────────────────
   Every nested route had solved "how do I get back" with its own ghost
   button in its own position, which teaches a member nothing about where
   they are. One trail, one place, and the ancestors are real links so the
   hierarchy is walkable rather than just visible. */

export type Crumb = {
  label: string;
  /** Omit on the last item: that is the page the member is already on. */
  to?: string;
};

export function Crumbs({ trail, className = "" }: { trail: Crumb[]; className?: string }) {
  if (trail.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className={`min-w-0 ${className}`}>
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 text-xs">
        {trail.map((crumb, i) => {
          const last = i === trail.length - 1;
          return (
            <li key={`${crumb.label}-${i}`} className="flex min-w-0 items-center gap-1">
              {i > 0 && (
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0 text-[var(--text-low)]"
                  aria-hidden="true"
                />
              )}
              {crumb.to && !last ? (
                <Link
                  to={crumb.to}
                  className="min-h-[36px] flex items-center rounded-lg px-1.5 text-[var(--text-mid)] transition-colors hover:text-[var(--text-hi)]"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className="min-w-0 truncate px-1.5 font-medium text-[var(--text-hi)]"
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ── Text alternative for a chart ────────────────────────────────────────
   Recharts draws paths and nothing else, so a screen reader reaching a chart
   reaches nothing at all. The table below carries the same figures in the
   same order; it is visually hidden because the chart already says it to
   anyone who can see it, and the summary line above it is shown to everyone
   because a one line reading of a curve is useful sighted or not. */

export type ChartColumn = { key: string; label: string };

export function ChartTable({
  caption,
  summary,
  columns,
  rows,
  className = "",
}: {
  /** Names the table. Read out before the data. */
  caption: string;
  /** One line stating what the shape of the chart amounts to. Visible. */
  summary: ReactNode;
  columns: ChartColumn[];
  rows: Record<string, string>[];
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs leading-relaxed text-[var(--text-low)]">{summary}</p>
      {rows.length > 0 && (
        <table className="sr-only">
          <caption>{caption}</caption>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {columns.map((column, c) =>
                  c === 0 ? (
                    <th key={column.key} scope="row">
                      {row[column.key]}
                    </th>
                  ) : (
                    <td key={column.key}>{row[column.key]}</td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ── Metric tile ─────────────────────────────────────────────────────── */

export function Metric({
  label,
  children,
  sub,
  tone = "default",
  className = "",
}: {
  label: string;
  children: ReactNode;
  sub?: ReactNode;
  tone?: "default" | "gain" | "loss" | "accent";
  className?: string;
}) {
  const toneClass =
    tone === "gain"
      ? "text-[var(--gain)]"
      : tone === "loss"
        ? "text-[var(--loss)]"
        : tone === "accent"
          ? "text-[var(--accent-hi)]"
          : "text-[var(--text-hi)]";
  return (
    <div className={`inset p-3.5 ${className}`}>
      <p className="eyebrow">{label}</p>
      <p className={`metric mt-1.5 text-lg ${toneClass}`}>{children}</p>
      {sub && <p className="mt-1 text-[11px] text-[var(--text-low)]">{sub}</p>}
    </div>
  );
}

/* ── Progress ────────────────────────────────────────────────────────── */

export function Progress({
  value,
  tone = "accent",
  height = 6,
  label,
}: {
  /** 0..1 */
  value: number;
  tone?: "accent" | "gain" | "warn";
  height?: number;
  label?: string;
}) {
  const reduce = useReducedMotion();
  const clamped = Math.max(0, Math.min(1, value));
  const fill =
    tone === "gain"
      ? "linear-gradient(90deg, #10b981, #34d399)"
      : tone === "warn"
        ? "linear-gradient(90deg, #d97706, #fbbf24)"
        : "linear-gradient(90deg, var(--accent-deep), var(--accent), var(--accent-soft))";

  return (
    <div
      className="w-full overflow-hidden rounded-full"
      style={{
        height,
        background: "rgba(5,7,15,0.7)",
        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.6)",
      }}
      role="progressbar"
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <motion.div
        className="h-full rounded-full"
        style={{ background: fill }}
        initial={reduce ? false : { width: 0 }}
        animate={{ width: `${clamped * 100}%` }}
        transition={reduce ? { duration: 0 } : { duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

/* ── Status badge ────────────────────────────────────────────────────── */

const STATUS = {
  active: { label: "Active", cls: "chip-accent" },
  accruing: { label: "Accruing", cls: "chip-gain" },
  matured: { label: "Matured", cls: "chip-warn" },
  closed: { label: "Closed", cls: "" },
  pending: { label: "Pending", cls: "chip-warn" },
  sent: { label: "Sent", cls: "chip-gain" },
} as const;

export function Status({ kind }: { kind: keyof typeof STATUS }) {
  const s = STATUS[kind];
  return (
    <span className={`chip ${s.cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current pulse-dot" />
      {s.label}
    </span>
  );
}

/* ── Empty state ─────────────────────────────────────────────────────────
   Most first sessions are empty, so the empty state is the product's first
   impression rather than an edge case. Three drawn marks replace the bordered
   icon square, each built from geometry the product already uses: the six
   blade aperture from the logo, the ruled rows of `.ledger`, and the rail of
   nodes the Horizon and Trajectory panels plot on.

   All three are inline SVG on the design tokens, so they follow a palette
   change and cost no request. They are decorative, and the caller's icon is
   drawn inside them, which is why every existing call site upgrades without
   changing a line. */

export type EmptyArt = "aperture" | "ledger" | "horizon";

const APERTURE_BLADES = Array.from({ length: 6 }, (_, i) => {
  const start = i * 60 - 90;
  const end = start + 44;
  const at = (r: number, deg: number) => {
    const a = (deg * Math.PI) / 180;
    return `${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`;
  };
  return `M ${at(30, start)} L ${at(46, start + 6)} L ${at(46, end)} L ${at(30, end - 6)} Z`;
});

function EmptyMark({ art, icon: Icon }: { art: EmptyArt; icon: LucideIcon }) {
  return (
    <span className="relative mb-4 grid h-[84px] w-[84px] place-items-center">
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
        focusable="false"
      >
        {art === "aperture" &&
          APERTURE_BLADES.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="var(--accent)"
              // The blades fade around the ring so the mark reads as an
              // aperture caught open rather than as a solid badge.
              opacity={0.08 + (i % 3) * 0.05}
              stroke="var(--line-hi)"
              strokeWidth="0.8"
            />
          ))}

        {art === "ledger" && (
          <>
            <rect x="10" y="20" width="2" height="60" rx="1" fill="var(--accent)" opacity="0.55" />
            {[26, 42, 58, 74].map((y, i) => (
              <g key={y}>
                <rect
                  x="18"
                  y={y - 3}
                  width={52 - i * 10}
                  height="6"
                  rx="3"
                  fill="var(--accent)"
                  opacity={0.2 - i * 0.04}
                />
                <line
                  x1="18"
                  y1={y + 8}
                  x2="92"
                  y2={y + 8}
                  stroke="var(--line-hi)"
                  strokeWidth="0.8"
                />
              </g>
            ))}
          </>
        )}

        {art === "horizon" && (
          <>
            <line x1="8" y1="78" x2="92" y2="78" stroke="var(--line-hi)" strokeWidth="1" />
            {[
              [20, 7],
              [48, 11],
              [76, 5],
            ].map(([x, r]) => (
              <circle
                key={x}
                cx={x}
                cy="78"
                r={r}
                fill="var(--accent)"
                opacity="0.16"
                stroke="var(--line-hi)"
                strokeWidth="0.8"
              />
            ))}
            {[8, 36, 64, 92].map((x) => (
              <line key={x} x1={x} y1="78" x2={x} y2="86" stroke="var(--line)" strokeWidth="0.8" />
            ))}
          </>
        )}

        {/* The centre is cut back to the .inset recipe so the mark reads as
            one object rather than as an icon dropped on top of a drawing.
            Every mark passes behind this, so none of them fights the glyph. */}
        <circle
          cx="50"
          cy="50"
          r="19"
          fill="rgba(5,7,15,0.82)"
          stroke="var(--line-hi)"
          strokeWidth="0.9"
        />
      </svg>
      <Icon className="relative h-[22px] w-[22px] text-[var(--accent-hi)]" strokeWidth={1.6} />
    </span>
  );
}

export function Empty({
  icon: Icon,
  title,
  body,
  action,
  art = "aperture",
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: { label: string; to: string };
  art?: EmptyArt;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <EmptyMark art={art} icon={Icon} />
      <p className="font-semibold text-[var(--text-hi)]">{title}</p>
      <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-[var(--text-low)]">{body}</p>
      {action && (
        <Link to={action.to} className="btn btn-secondary mt-5">
          {action.label} <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

/* ── Skeleton ────────────────────────────────────────────────────────── */

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`shimmer overflow-hidden rounded-xl bg-[rgba(24,33,56,0.5)] ${className}`} />
  );
}

/* ── Row that navigates ──────────────────────────────────────────────── */

export function NavRow({
  icon: Icon,
  title,
  hint,
  to,
  onClick,
  right,
}: {
  icon?: LucideIcon;
  title: string;
  hint?: string;
  to?: string;
  onClick?: () => void;
  right?: ReactNode;
}) {
  const inner = (
    <>
      {Icon && (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-[rgba(46,139,255,0.07)]">
          <Icon className="h-4 w-4 text-[var(--accent-hi)]" strokeWidth={1.8} />
        </span>
      )}
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-sm font-medium text-[var(--text-hi)]">{title}</span>
        {hint && (
          <span className="mt-0.5 block truncate text-xs text-[var(--text-low)]">{hint}</span>
        )}
      </span>
      {right ?? <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-low)]" />}
    </>
  );
  const cls =
    "group flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-[var(--line)] hover:bg-[rgba(46,139,255,0.05)]";
  if (to) {
    return (
      <Link to={to} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}
