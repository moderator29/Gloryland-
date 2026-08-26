import { useEffect, useRef, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { POST_KINDS, type PostKind } from "@/domain/feed";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { kindMeta } from "./kinds";

/**
 * Capsule filter across the top of the feed.
 *
 * Built as a real tablist: one tab stop for the whole group, arrow keys to
 * move between filters, Home and End to jump to the ends, and selection that
 * follows focus. That is the pattern people already have in their fingers for
 * a row of capsules, and it means the filter never traps a keyboard user in a
 * long row of stops.
 *
 * A kind with nothing published under it is not offered, so the row never
 * leads anywhere empty.
 */

export type FeedFilter = PostKind | "all";

const EASE = [0.22, 1, 0.36, 1] as const;

export function FeedFilters({
  value,
  onChange,
  counts,
  controls,
  className = "",
}: {
  value: FeedFilter;
  onChange: (next: FeedFilter) => void;
  /** How many posts sit under each kind, used to hide empty filters. */
  counts: Partial<Record<PostKind, number>>;
  /** Id of the list this filters, for aria-controls. */
  controls?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const total = POST_KINDS.reduce((sum, k) => sum + (counts[k] ?? 0), 0);

  const options: Array<{ id: FeedFilter; label: string; count: number }> = [
    { id: "all", label: "All", count: total },
    ...POST_KINDS.filter((k) => (counts[k] ?? 0) > 0).map((k) => ({
      id: k as FeedFilter,
      label: kindMeta(k).label,
      count: counts[k] ?? 0,
    })),
  ];

  const activeIndex = Math.max(
    0,
    options.findIndex((o) => o.id === value),
  );

  // Keep the selected capsule in view when the row scrolls horizontally.
  useEffect(() => {
    const el = refs.current[activeIndex];
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeIndex]);

  function focusAt(i: number) {
    const next = (i + options.length) % options.length;
    onChange(options[next].id);
    refs.current[next]?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        focusAt(activeIndex + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        focusAt(activeIndex - 1);
        break;
      case "Home":
        e.preventDefault();
        focusAt(0);
        break;
      case "End":
        e.preventDefault();
        focusAt(options.length - 1);
        break;
      default:
        break;
    }
  }

  return (
    <div
      role="tablist"
      aria-label="Filter posts by kind"
      aria-orientation="horizontal"
      onKeyDown={onKeyDown}
      className={`no-bar fade-x -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 ${className}`}
    >
      {options.map((o, i) => {
        const selected = o.id === value;
        return (
          <button
            key={o.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`signal-filter-${o.id}`}
            aria-selected={selected}
            aria-controls={controls}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(o.id)}
            className={`min-h-[36px] relative shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              selected
                ? "text-[#04101f]"
                : "border border-[var(--line)] bg-[rgba(5,7,15,0.5)] text-[var(--text-mid)] hover:border-[var(--line-hi)] hover:text-[var(--text-hi)]"
            }`}
          >
            {selected && (
              <motion.span
                layoutId={reduce ? undefined : "signal-filter-pill"}
                className="absolute inset-0 rounded-full"
                style={{
                  background: "linear-gradient(180deg, var(--accent-hi), var(--accent))",
                  boxShadow: "0 8px 22px -12px rgba(46,139,255,0.9)",
                }}
                transition={reduce ? { duration: 0 } : { duration: 0.32, ease: EASE }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {o.label}
              <span className={`tabular text-[10px] ${selected ? "opacity-70" : "opacity-60"}`}>
                {o.count}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
