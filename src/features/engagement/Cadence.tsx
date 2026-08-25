import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Cadence: how many days in a row the member has opened Rigel.
 *
 * The count is nothing but a record of visits. Days are stored locally as
 * plain ISO dates and deduplicated, so the number can only ever be as large
 * as the number of separate days this browser has been used. A member seeing
 * the pill for the first time is on day one, and the component never rounds
 * that up into a longer history it cannot evidence.
 */

const CADENCE_KEY = "rgl_cadence_v1";
/** Older days than this carry no meaning for a current streak. */
const MAX_DAYS_KEPT = 400;

export type CadenceProps = {
  className?: string;
  /** Hide the trailing word, for very tight rows. */
  compact?: boolean;
};

/** Local calendar day as "YYYY-MM-DD", so a streak follows the member's clock. */
function dayKey(t: number): string {
  const d = new Date(t);
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${d.getFullYear()}-${m < 10 ? `0${m}` : m}-${day < 10 ? `0${day}` : day}`;
}

function readDays(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CADENCE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}

function writeDays(days: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CADENCE_KEY, JSON.stringify(days.slice(-MAX_DAYS_KEPT)));
  } catch {
    // Storage can be full or blocked. The streak is a courtesy, not a figure
    // anything else depends on, so a failed write is simply dropped.
  }
}

/**
 * Consecutive days ending today. Today counts because the member is here now,
 * which is why a first visit reads one rather than zero.
 */
function streakOf(days: string[], now: number): number {
  const seen = new Set(days);
  let count = 1;
  const cursor = new Date(now);
  for (;;) {
    cursor.setDate(cursor.getDate() - 1);
    if (!seen.has(dayKey(cursor.getTime()))) return count;
    count += 1;
    if (count >= MAX_DAYS_KEPT) return count;
  }
}

/** Add today to the record, deduplicated and in order. */
function recordToday(now: number): void {
  const today = dayKey(now);
  const days = readDays();
  if (days.includes(today)) return;
  const next = Array.from(new Set([...days, today])).sort();
  writeDays(next);
}

export function Cadence({ className = "", compact = false }: CadenceProps) {
  const reduce = useReducedMotion();
  // Read only during the first render, so the pill never flashes a placeholder.
  const [streak] = useState(() => streakOf(readDays(), Date.now()));

  useEffect(() => {
    recordToday(Date.now());
  }, []);

  const label = `Day ${streak}`;

  return (
    <motion.span
      className={`chip chip-accent ${className}`}
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduce ? { duration: 0 } : { duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      title={
        streak === 1
          ? "First day of this run. Come back tomorrow to extend it."
          : `${streak} days in a row`
      }
      aria-label={
        streak === 1 ? "Cadence: first day of this run" : `Cadence: ${streak} days in a row`
      }
    >
      <Flame
        className="h-3.5 w-3.5 shrink-0 text-[var(--accent-hi)]"
        strokeWidth={1.8}
        aria-hidden="true"
      />
      <span className="tabular">{label}</span>
      {!compact && streak > 1 && (
        <span className="font-medium text-[var(--text-low)]">in a row</span>
      )}
    </motion.span>
  );
}
