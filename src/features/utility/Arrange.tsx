import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, Check, LayoutGrid, RotateCcw } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Arrange: let a member order their own Home.
 *
 * Reordering is offered as move up and move down buttons rather than drag,
 * because drag is the one interaction that excludes keyboard and screen reader
 * users completely. Buttons work for everybody, and on a phone they are the
 * easier gesture anyway.
 *
 * The stored order is treated as a hint, never as truth. Keys that no longer
 * exist are dropped and keys that are new are appended in the order they were
 * given, so shipping a new Home section never leaves anyone with a broken
 * layout or a missing panel.
 */

export const ARRANGE_KEY = "rgl_arrange_v1";

export type ArrangeItem = {
  /** Stable identity for this section. Changing it resets its position. */
  key: string;
  /** Short human name, read aloud by the move controls. */
  label: string;
  node: ReactNode;
};

export type ArrangeProps = {
  items: ArrangeItem[];
  /** Override to arrange a second surface without colliding with Home. */
  storageKey?: string;
  /** Label above the arrange control. */
  title?: string;
  className?: string;
};

function readOrder(storageKey: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === "string") : [];
  } catch {
    return [];
  }
}

/** Stored order, cleaned of departed keys and extended with new ones. */
function reconcile(stored: string[], items: ArrangeItem[]): string[] {
  const known = new Set(items.map((i) => i.key));
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const k of stored) {
    if (known.has(k) && !seen.has(k)) {
      kept.push(k);
      seen.add(k);
    }
  }
  for (const i of items) if (!seen.has(i.key)) kept.push(i.key);
  return kept;
}

export function Arrange({
  items,
  storageKey = ARRANGE_KEY,
  title = "Your layout",
  className = "",
}: ArrangeProps) {
  const reduce = useReducedMotion();
  const [editing, setEditing] = useState(false);
  const [order, setOrder] = useState<string[]>(() => reconcile(readOrder(storageKey), items));
  const [announcement, setAnnouncement] = useState("");

  const controls = useRef<
    Record<string, { up: HTMLButtonElement | null; down: HTMLButtonElement | null }>
  >({});
  const pending = useRef<{ key: string; dir: "up" | "down" } | null>(null);

  const signature = items.map((i) => i.key).join("|");

  // Sections can appear or disappear between releases. Fold any change back
  // into the stored order instead of letting it go stale.
  useEffect(() => {
    setOrder((prev) => {
      const next = reconcile(prev, items);
      return next.join("|") === prev.join("|") ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const persist = useCallback(
    (next: string[]) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* a blocked store only costs the member their saved order */
      }
    },
    [storageKey],
  );

  const ordered = useMemo(() => {
    const byKey = new Map(items.map((i) => [i.key, i]));
    return order.map((k) => byKey.get(k)).filter((i): i is ArrangeItem => i !== undefined);
  }, [order, items]);

  const move = (key: string, dir: "up" | "down") => {
    const from = order.indexOf(key);
    const to = dir === "up" ? from - 1 : from + 1;
    if (from < 0 || to < 0 || to >= order.length) return;
    const next = [...order];
    next.splice(to, 0, next.splice(from, 1)[0]);
    setOrder(next);
    persist(next);
    pending.current = { key, dir };
    const label = items.find((i) => i.key === key)?.label ?? key;
    setAnnouncement(`${label} moved to position ${to + 1} of ${next.length}.`);
  };

  const reset = () => {
    const next = items.map((i) => i.key);
    setOrder(next);
    persist(next);
    setAnnouncement("Layout reset to the default order.");
  };

  // Keep the keyboard where it was. If the button just used has reached an end
  // stop and gone disabled, hand focus to its opposite rather than the body.
  useEffect(() => {
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    const pair = controls.current[p.key];
    if (!pair) return;
    const preferred = p.dir === "up" ? pair.up : pair.down;
    const fallback = p.dir === "up" ? pair.down : pair.up;
    const target = preferred && !preferred.disabled ? preferred : fallback;
    target?.focus({ preventScroll: true });
  }, [order]);

  return (
    <div className={className}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="eyebrow">{title}</p>
        <div className="flex items-center gap-2">
          {editing && (
            <button type="button" onClick={reset} className="btn btn-ghost px-2.5 py-2 text-xs">
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            aria-pressed={editing}
            className={`min-h-[36px] btn ${editing ? "btn-secondary" : "btn-ghost"} px-2.5 py-2 text-xs`}
          >
            {editing ? (
              <>
                <Check className="h-3.5 w-3.5" /> Done
              </>
            ) : (
              <>
                <LayoutGrid className="h-3.5 w-3.5" /> Arrange
              </>
            )}
          </button>
        </div>
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      <div className="space-y-5">
        {ordered.map((item, i) => (
          <motion.section
            key={item.key}
            layout={reduce ? false : "position"}
            transition={reduce ? { duration: 0 } : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            aria-label={editing ? item.label : undefined}
          >
            {editing && (
              <div className="inset mb-2.5 flex flex-wrap items-center gap-2 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[var(--text-hi)]">
                  {item.label}
                </span>
                <span className="tabular text-[11px] text-[var(--text-low)]">
                  {i + 1} of {ordered.length}
                </span>
                <button
                  type="button"
                  ref={(el) => {
                    controls.current[item.key] = { ...controls.current[item.key], up: el };
                  }}
                  onClick={() => move(item.key, "up")}
                  disabled={i === 0}
                  aria-label={`Move ${item.label} up`}
                  className="min-h-[36px] btn btn-outline px-2 py-1.5"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  ref={(el) => {
                    controls.current[item.key] = { ...controls.current[item.key], down: el };
                  }}
                  onClick={() => move(item.key, "down")}
                  disabled={i === ordered.length - 1}
                  aria-label={`Move ${item.label} down`}
                  className="min-h-[36px] btn btn-outline px-2 py-1.5"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {item.node}
          </motion.section>
        ))}
      </div>
    </div>
  );
}
