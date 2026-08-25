/**
 * How deployed capital is split across the tier ladder.
 *
 * Drawn as a stacked rail rather than a pie: with six possible tiers and a
 * 360px floor, a horizontal bar keeps every share legible and every label on
 * its own line. Colour stays inside the blue/cyan family — the ladder is one
 * ordered thing, not six unrelated categories — with a single steel neutral
 * reserved for anything that falls off the known ladder.
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { money } from "@/components/system/format";
import type { Position, Snapshot } from "@/domain/ledger";
import type { TierId } from "@/domain/tiers";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { ChartEmpty, ChartHeader } from "./chartPrimitives";

export type AllocationSlice = {
  tierId: string;
  name: string;
  amount: number;
  share: number;
  positions: number;
  color: string;
};

export type AllocationChartProps = {
  snapshot: Snapshot;
  className?: string;
};

/** Ordered light-to-deep along the ladder, plus one neutral for the unknown. */
const TIER_COLOR: Record<TierId, string> = {
  core: "var(--accent-deep)",
  signal: "var(--accent)",
  vector: "var(--accent-hi)",
  apex: "var(--accent-soft)",
  meridian: "var(--accent-cyan)",
  sovereign: "var(--text-mid)",
};
const NEUTRAL = "var(--text-low)";

function sharePct(n: number): string {
  if (n <= 0) return "0%";
  return n < 0.001 ? "<0.1%" : `${(n * 100).toFixed(n >= 0.1 ? 0 : 1)}%`;
}

export function AllocationChart({ snapshot, className = "" }: AllocationChartProps) {
  const reduced = useReducedMotion();

  const { slices, total } = useMemo(() => {
    const active: Position[] = Array.isArray(snapshot?.activePositions)
      ? snapshot.activePositions
      : [];
    const buckets = new Map<
      string,
      { name: string; amount: number; positions: number; color: string }
    >();

    for (const p of active) {
      const amount =
        typeof p.principal === "number" && Number.isFinite(p.principal) ? p.principal : 0;
      if (amount <= 0) continue;
      const id = p.tierId ?? "unknown";
      const existing = buckets.get(id);
      if (existing) {
        existing.amount += amount;
        existing.positions += 1;
      } else {
        buckets.set(id, {
          name: p.tier?.name ?? "Unassigned",
          amount,
          positions: 1,
          color: TIER_COLOR[id as TierId] ?? NEUTRAL,
        });
      }
    }

    const sum = [...buckets.values()].reduce((s, b) => s + b.amount, 0);
    const rows: AllocationSlice[] = [...buckets.entries()]
      .map(([tierId, b]) => ({
        tierId,
        name: b.name,
        amount: b.amount,
        positions: b.positions,
        color: b.color,
        share: sum > 0 ? b.amount / sum : 0,
      }))
      .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));

    return { slices: rows, total: sum };
  }, [snapshot]);

  const vaults = slices.reduce((s, r) => s + r.positions, 0);

  return (
    <section className={`panel p-4 sm:p-5 ${className}`}>
      <ChartHeader
        eyebrow="Allocation by tier"
        value={money(total)}
        sub={
          slices.length === 0
            ? "No capital deployed"
            : `${vaults} open ${vaults === 1 ? "vault" : "vaults"} across ${slices.length} ${
                slices.length === 1 ? "tier" : "tiers"
              }`
        }
      />

      {slices.length === 0 ? (
        <ChartEmpty
          title="Nothing deployed"
          hint="Once capital sits in a vault this breaks it down by tier, with each share of the total."
          height={150}
        />
      ) : (
        <>
          <div
            className="inset flex h-3.5 w-full overflow-hidden rounded-full p-0"
            role="img"
            aria-label={slices
              .map((s) => `${s.name} ${money(s.amount)}, ${sharePct(s.share)}`)
              .join("; ")}
          >
            {slices.map((slice) => (
              <motion.div
                key={slice.tierId}
                className="h-full"
                style={{ background: slice.color, minWidth: 3 }}
                initial={reduced ? false : { width: 0 }}
                animate={{ width: `${Math.max(slice.share * 100, 0.8)}%` }}
                transition={{ duration: reduced ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
              />
            ))}
          </div>

          <ul className="mt-4 flex flex-col gap-2.5">
            {slices.map((slice) => (
              <li key={slice.tierId} className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: slice.color }}
                  />
                  <span className="truncate text-sm font-medium text-[var(--text-hi)]">
                    {slice.name}
                  </span>
                  <span className="chip shrink-0">
                    {slice.positions} {slice.positions === 1 ? "vault" : "vaults"}
                  </span>
                </div>
                <div className="flex shrink-0 items-baseline gap-2">
                  <span className="tabular text-sm font-semibold text-[var(--text-hi)]">
                    {money(slice.amount)}
                  </span>
                  <span className="tabular w-11 text-right text-xs text-[var(--text-low)]">
                    {sharePct(slice.share)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
