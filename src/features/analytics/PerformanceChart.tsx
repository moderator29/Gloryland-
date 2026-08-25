/**
 * Portfolio value over a window, replayed from the ledger.
 *
 * Every point is `derive(events up to t, t).portfolioValue` — the same
 * function the rest of the product reads — so the curve can never drift from
 * the headline figures on the page around it.
 */

import { useId, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { money, moneyCompact, pct, shortDate, fullDate } from "@/components/system/format";
import { valueSeries, type LedgerEvent } from "@/domain/ledger";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { AXIS_TICK, ChartEmpty, ChartHeader, COMPACT_WIDTH, TooltipShell } from "./chartPrimitives";
import { pointOf } from "./chartUtils";
import { useContainerWidth } from "./useContainerWidth";

export type PerformancePoint = { t: number; v: number };

export type PerformanceChartProps = {
  events: LedgerEvent[];
  days: number;
  /** Fixed clock, for tests and for keeping several charts on one instant. */
  now?: number;
  /** Plot height in pixels. */
  height?: number;
  className?: string;
  /** Optional control slot in the header, typically <RangeTabs />. */
  aside?: React.ReactNode;
};

function isPoint(v: unknown): v is PerformancePoint {
  if (!v || typeof v !== "object") return false;
  const p = v as { t?: unknown; v?: unknown };
  return typeof p.t === "number" && typeof p.v === "number";
}

export function PerformanceChart({
  events,
  days,
  now,
  height = 240,
  className = "",
  aside,
}: PerformanceChartProps) {
  const reduced = useReducedMotion();
  const gradientId = useId().replace(/:/g, "");
  const { ref, width } = useContainerWidth<HTMLDivElement>();
  const compact = width > 0 && width < COMPACT_WIDTH;

  const clock = useMemo(() => now ?? Date.now(), [now]);
  const windowDays = Math.max(1, Math.round(days));

  const series = useMemo<PerformancePoint[]>(() => {
    const src = Array.isArray(events) ? events : [];
    if (src.length === 0) return [];
    try {
      return valueSeries(src, windowDays, clock).filter((p) => Number.isFinite(p.v));
    } catch {
      return [];
    }
  }, [events, windowDays, clock]);

  const first = series[0]?.v ?? 0;
  const last = series[series.length - 1]?.v ?? 0;
  const change = last - first;
  const changePct = first > 0 ? change / first : 0;
  const flat = series.length === 0 || series.every((p) => p.v === 0);

  /* Pad the domain by 8% so the stroke never sits on the frame, and keep the
     floor at zero — portfolio value is never negative. */
  const domain = useMemo<[number, number]>(() => {
    if (series.length === 0) return [0, 1];
    const values = series.map((p) => p.v);
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    if (hi === lo) return [Math.max(0, lo - 1), hi + 1];
    const pad = (hi - lo) * 0.08;
    return [Math.max(0, lo - pad), hi + pad];
  }, [series]);

  return (
    <section className={`panel p-4 sm:p-5 ${className}`} ref={ref}>
      <ChartHeader
        eyebrow={`Portfolio value · ${windowDays >= 365 ? "all time" : `${windowDays}d`}`}
        value={money(last)}
        sub={
          flat ? (
            "No recorded value in this window"
          ) : (
            <span
              className="tabular"
              style={{ color: change >= 0 ? "var(--gain)" : "var(--loss)" }}
            >
              {change >= 0 ? "+" : "−"}
              {money(Math.abs(change))} {first > 0 ? `(${pct(changePct)})` : ""}
            </span>
          )
        }
        aside={aside}
      />

      {flat ? (
        <ChartEmpty
          title="Nothing to plot yet"
          hint="Open a vault and this chart fills in one point per day as the ledger records value."
          height={height}
        />
      ) : (
        <div style={{ height }} className="-ml-1 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={series}
              margin={{ top: 6, right: 6, bottom: 0, left: compact ? 0 : 4 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.42} />
                  <stop offset="55%" stopColor="var(--accent)" stopOpacity={0.14} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--line)" strokeDasharray="2 6" vertical={false} />
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(t: number) => shortDate(t)}
                tick={AXIS_TICK}
                tickCount={compact ? 3 : 5}
                minTickGap={compact ? 40 : 28}
                axisLine={false}
                tickLine={false}
                height={22}
              />
              <YAxis
                domain={domain}
                tickFormatter={(v: number) => moneyCompact(v)}
                tick={AXIS_TICK}
                tickCount={4}
                axisLine={false}
                tickLine={false}
                width={compact ? 0 : 56}
                hide={compact}
              />
              <Tooltip
                cursor={{ stroke: "var(--line-hi)", strokeWidth: 1 }}
                content={({ active, payload }) => {
                  const point = pointOf(payload, isPoint);
                  if (!active || !point) return null;
                  return (
                    <TooltipShell
                      title={fullDate(point.t)}
                      rows={[{ label: "Portfolio", value: money(point.v, 2), tone: "accent" }]}
                    />
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="v"
                stroke="var(--accent)"
                strokeWidth={1.75}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{
                  r: 3.5,
                  fill: "var(--accent-hi)",
                  stroke: "var(--ink-000)",
                  strokeWidth: 2,
                }}
                isAnimationActive={!reduced}
                animationDuration={reduced ? 0 : 700}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
