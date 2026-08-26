import { useId, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, Info, type LucideIcon } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * The settings kit.
 *
 * Every settings screen is built from the same three parts: a group card with
 * a labelled header, rows inside it, and a control on the right of each row.
 * Keeping the parts here means a new preference is a row, never a new layout.
 */

/* ── Group card ──────────────────────────────────────────────────────── */

export function SettingsGroup({
  icon: Icon,
  name,
  descriptor,
  tone = "default",
  children,
}: {
  icon: LucideIcon;
  /** Rendered in caps. Keep it to one or two words. */
  name: string;
  /** Muted all-caps text on the right of the header. */
  descriptor?: string;
  tone?: "default" | "danger";
  children: ReactNode;
}) {
  return (
    <section
      className={`panel overflow-hidden ${
        tone === "danger" ? "border-[rgba(248,113,113,0.28)]" : ""
      }`}
    >
      <header className="flex items-center gap-2.5 border-b border-[var(--line)] px-4 py-3">
        <span
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border ${
            tone === "danger"
              ? "border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.08)]"
              : "border-[var(--line)] bg-[rgba(46,139,255,0.07)]"
          }`}
        >
          <Icon
            aria-hidden
            strokeWidth={1.9}
            className={`h-3.5 w-3.5 ${
              tone === "danger" ? "text-[var(--loss)]" : "text-[var(--accent-hi)]"
            }`}
          />
        </span>
        <h2 className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-hi)]">
          {name}
        </h2>
        {descriptor && (
          <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-low)]">
            {descriptor}
          </span>
        )}
      </header>
      <div className="px-4">{children}</div>
    </section>
  );
}

/* ── Row ─────────────────────────────────────────────────────────────── */

const ROW_BASE =
  "flex items-center gap-4 border-t border-[var(--line)] py-3.5 first:border-t-0 min-w-0";

export function SettingsRow({
  title,
  description,
  control,
  to,
  controlId,
}: {
  title: string;
  description?: string;
  /** The control on the right. Omitted when the row is a link. */
  control?: ReactNode;
  /** Turns the row into a navigation link with a chevron. */
  to?: string;
  /** Points the row title at the control it labels. */
  controlId?: string;
}) {
  const text = (
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-medium text-[var(--text-hi)]">{title}</span>
      {description && (
        <span className="mt-0.5 block text-xs leading-relaxed text-[var(--text-low)]">
          {description}
        </span>
      )}
    </span>
  );

  if (to) {
    return (
      <Link
        to={to}
        className={`${ROW_BASE} -mx-2 rounded-xl px-2 transition-colors hover:bg-[rgba(46,139,255,0.05)]`}
      >
        {text}
        {control}
        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-low)]" aria-hidden />
      </Link>
    );
  }

  return (
    <div className={ROW_BASE}>
      {controlId ? (
        <label htmlFor={controlId} className="min-w-0 flex-1 cursor-pointer">
          <span className="block text-sm font-medium text-[var(--text-hi)]">{title}</span>
          {description && (
            <span className="mt-0.5 block text-xs leading-relaxed text-[var(--text-low)]">
              {description}
            </span>
          )}
        </label>
      ) : (
        text
      )}
      <div className="shrink-0">{control}</div>
    </div>
  );
}

/** Full-width area inside a group for content that is not a row. */
export function SettingsBlock({ children }: { children: ReactNode }) {
  return <div className="border-t border-[var(--line)] py-4 first:border-t-0">{children}</div>;
}

/** A plain-spoken note about what a setting does or does not do. */
export function SettingsNote({ children }: { children: ReactNode }) {
  return (
    <p className="inset flex items-start gap-2.5 p-3 text-xs leading-relaxed text-[var(--text-mid)]">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent-hi)]" aria-hidden />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/* ── Controls ────────────────────────────────────────────────────────── */

export function Toggle({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  id?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-[26px] w-[46px] shrink-0 rounded-full transition-colors ${
        checked ? "bg-[var(--accent)]" : "bg-[var(--ink-300)]"
      }`}
    >
      <span
        className="absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-transform"
        style={{ left: 3, transform: `translateX(${checked ? 20 : 0}px)` }}
      />
    </button>
  );
}

export type SegmentOption<T extends string> = { value: T; label: string; hint?: string };

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegmentOption<T>[];
  label: string;
}) {
  const reduce = useReducedMotion();
  const uid = useId();

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inset grid w-full gap-1 p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`min-h-[36px] relative min-w-0 rounded-[0.6rem] px-2 py-2 text-center transition-colors ${
              active ? "text-[var(--text-hi)]" : "text-[var(--text-mid)] hover:text-[var(--text)]"
            }`}
          >
            {active && (
              <motion.span
                layoutId={`segment-${uid}`}
                aria-hidden
                className="absolute inset-0 rounded-[0.6rem] border border-[rgba(46,139,255,0.38)] bg-[rgba(46,139,255,0.16)]"
                transition={
                  reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 36 }
                }
              />
            )}
            <span className="relative block truncate text-xs font-semibold">{o.label}</span>
            {o.hint && (
              <span className="relative mt-0.5 block truncate text-[10px] text-[var(--text-low)]">
                {o.hint}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function SelectRow<T extends string>({
  label,
  description,
  value,
  onChange,
  options,
}: {
  label: string;
  description?: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  const uid = useId();
  const id = `select-${uid}`;
  return (
    <SettingsRow
      title={label}
      description={description}
      controlId={id}
      control={
        <select
          id={id}
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className="max-w-[10.5rem] rounded-xl border border-[var(--line-hi)] bg-[rgba(5,7,15,0.6)] px-3 py-2 text-xs font-medium text-[var(--text-hi)] outline-none transition-colors focus:border-[var(--accent)]"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-[var(--ink-200)]">
              {o.label}
            </option>
          ))}
        </select>
      }
    />
  );
}
