/**
 * Rewards accrued per day across a window.
 *
 * There is no "reward event" in the ledger, accrual is continuous, so the
 * series is built by replaying `derive(...).rewardsAccrued` at each day
 * boundary and taking the day-over-day difference. That keeps the bars
 * consistent with the lifetime figure by construction.
 */

import { useId, useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { money, moneyCompact, shortDate, fullDate } from "@/components/system/format";
import { DAY_MS, derive, type LedgerEvent } from "@/domain/ledger";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { AXIS_TICK, ChartEmpty, ChartHeader, COMPACT_WIDTH, TooltipShell } from "./chartPrimitives";
import { pointOf } from "./chartUtils";
import { useContainerWidth } from "./useContainerWidth";

/** One bar: `v` accrued between `from` and `t`. */
export type RewardsBucket = { t: number; from: number; v: number };

export type RewardsChartProps = {
  events: LedgerEvent[];
  days: number;
  now?: number;
  height?: number;
  className?: string;
  aside?: React.ReactNode;
};

/** Long windows are bucketed so a year does not become 365 hairlines. */
const MAX_BARS = 90;

function isBucket(v: unknown): v is RewardsBucket {
  if (!v || typeof v !== "object") return false;
  const b = v as { t?: unknown; from?: unknown; v?: unknown };
  return typeof b.t === "number" && typeof b.from === "number" && typeof b.v === "number";
}

export function RewardsChart({
  events,
  days,
  now,
  height = 220,
  className = "",
  aside,
}: RewardsChartProps) {
  const reduced = useReducedMotion();
  const gradientId = useId().replace(/:/g, "");
  const { ref, width } = useContainerWidth<HTMLDivElement>();
  const compact = width > 0 && width < COMPACT_WIDTH;

  const clock = useMemo(() => now ?? Date.now(), [now]);
  const windowDays = Math.max(1, Math.round(days));
  const bucketCount = Math.min(windowDays, MAX_BARS);
  const bucketDays = windowDays / bucketCount;

  const data = useMemo<RewardsBucket[]>(() => {
    const src = Array.isArray(events) ? events : [];
    if (src.length === 0) return [];
    try {
      /* Cumulative accrual as of an instant, replaying only what had happened
         by then, the same shape of replay `valueSeries` performs. */
      const cumulativeAt = (t: number) =>
        derive(
          src.filter((e) => e.at <= t),
          t,
        ).rewardsAccrued;

      const out: RewardsBucket[] = [];
      let prevAt = clock - windowDays * DAY_MS;
      let prev = cumulativeAt(prevAt);
      for (let i = 1; i <= bucketCount; i++) {
        const t = clock - (windowDays - i * bucketDays) * DAY_MS;
        const cumulative = cumulativeAt(t);
        const delta = cumulative - prev;
        out.push({ t, from: prevAt, v: Number.isFinite(delta) ? Math.max(0, delta) : 0 });
        prev = cumulative;
        prevAt = t;
      }
      return out;
    } catch {
      return [];
    }
  }, [events, windowDays, bucketCount, bucketDays, clock]);

  const total = data.reduce((s, d) => s + d.v, 0);
  const best = data.reduce((m, d) => (d.v > m ? d.v : m), 0);
  const empty = data.length === 0 || total <= 0;
  const perDay = total / windowDays;

  return (
    <section className={`panel p-4 sm:p-5 ${className}`} ref={ref}>
      <ChartHeader
        eyebrow={`Rewards accrued · ${windowDays >= 365 ? "all time" : `${windowDays}d`}`}
        value={money(total, 2)}
        sub={
          empty
            ? "No accrual recorded in this window"
            : `${money(perDay, 2)} a day on average · peak ${money(best, 2)}`
        }
        aside={aside}
      />

      {empty ? (
        <ChartEmpty
          title="No rewards yet"
          hint="Accrual starts the moment a vault opens and runs at 1% of principal a day for the full term."
          height={height}
        />
      ) : (
        <div style={{ height }} className="-ml-1 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: compact ? 0 : 4 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-hi)" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.35} />
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
                tickFormatter={(v: number) => moneyCompact(v)}
                tick={AXIS_TICK}
                tickCount={4}
                axisLine={false}
                tickLine={false}
                width={compact ? 0 : 56}
                hide={compact}
              />
              <Tooltip
                cursor={{ fill: "rgba(46, 139, 255, 0.08)" }}
                content={({ active, payload }) => {
                  const bucket = pointOf(payload, isBucket);
                  if (!active || !bucket) return null;
                  return (
                    <TooltipShell
                      title={
                        bucketDays > 1
                          ? `${shortDate(bucket.from)}, ${shortDate(bucket.t)}`
                          : fullDate(bucket.t)
                      }
                      rows={[{ label: "Accrued", value: money(bucket.v, 2), tone: "accent" }]}
                    />
                  );
                }}
              />
              <Bar
                dataKey="v"
                fill={`url(#${gradientId})`}
                radius={[3, 3, 0, 0]}
                maxBarSize={compact ? 10 : 18}
                isAnimationActive={!reduced}
                animationDuration={reduced ? 0 : 650}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
