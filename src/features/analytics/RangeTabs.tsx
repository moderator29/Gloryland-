/**
 * The 7D / 30D / 90D / ALL segmented control the charts share.
 *
 * Implements the ARIA tabs pattern: one tab stop for the whole group, arrows
 * move and select, Home/End jump to the ends. `days` is the unit every chart
 * in this folder takes, so the control speaks in days rather than labels.
 */

import { useCallback, useId, useRef } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { RANGES, type Range } from "./ranges";

export type RangeTabsProps = {
  value: number;
  onChange: (days: number) => void;
  /** Accessible name for the group. */
  label?: string;
  /** id of the region the tabs govern, if there is one. */
  controls?: string;
  ranges?: Range[];
  className?: string;
};

export function RangeTabs({
  value,
  onChange,
  label = "Chart range",
  controls,
  ranges = RANGES,
  className = "",
}: RangeTabsProps) {
  const reduced = useReducedMotion();
  const groupId = useId().replace(/:/g, "");
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const selected = Math.max(
    0,
    ranges.findIndex((r) => r.days === value),
  );

  const select = useCallback(
    (index: number) => {
      const next = ((index % ranges.length) + ranges.length) % ranges.length;
      onChange(ranges[next].days);
      buttons.current[next]?.focus();
    },
    [onChange, ranges],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        select(selected + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        select(selected - 1);
        break;
      case "Home":
        e.preventDefault();
        select(0);
        break;
      case "End":
        e.preventDefault();
        select(ranges.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      aria-orientation="horizontal"
      onKeyDown={onKeyDown}
      className={`inset inline-flex items-center gap-0.5 p-1 ${className}`}
    >
      {ranges.map((range, i) => {
        const isSelected = i === selected;
        return (
          <button
            key={range.days}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-controls={controls}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onChange(range.days)}
            className={`min-h-[36px] tabular relative rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors sm:px-3 ${
              isSelected
                ? "text-[var(--accent-hi)]"
                : "text-[var(--text-mid)] hover:text-[var(--text-hi)]"
            }`}
          >
            {isSelected ? (
              <motion.span
                aria-hidden="true"
                layoutId={reduced ? undefined : `range-pill-${groupId}`}
                className="absolute inset-0 rounded-lg border border-[rgba(46,139,255,0.34)] bg-[rgba(46,139,255,0.12)]"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            ) : null}
            <span className="relative z-10">{range.label}</span>
          </button>
        );
      })}
    </div>
  );
}
