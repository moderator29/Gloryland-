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

/* ── Empty state ─────────────────────────────────────────────────────── */

export function Empty({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: { label: string; to: string };
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-[var(--line-hi)] bg-[rgba(46,139,255,0.08)]">
        <Icon className="h-5 w-5 text-[var(--accent-hi)]" strokeWidth={1.7} />
      </span>
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
