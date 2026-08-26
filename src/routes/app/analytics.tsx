import { useMemo, useState } from "react";
import { ChartLine } from "lucide-react";
import { useLedger } from "@/hooks/useLedger";
import { DAY_MS, derive, type LedgerEvent } from "@/domain/ledger";
import { PerformanceChart, RewardsChart, AllocationChart, RangeTabs } from "@/features/analytics";
import { BandHead, ChartTable, Metric, Empty } from "@/components/system/ui";
import { money, pct, shortDate } from "@/components/system/format";

/**
 * Telemetry: how the member's own capital has behaved over a window.
 *
 * Every chart on this page is drawn by recharts, which emits paths and nothing
 * else, so until now the whole surface was unavailable to a screen reader. Each
 * chart is paired here with a text alternative: a visible one line reading of
 * the shape, and a visually hidden table of the figures behind it.
 *
 * The tables are sampled rather than exhaustive. The performance chart plots up
 * to ninety points, and ninety rows read aloud is not an alternative, it is a
 * wall. Eight readings across the window carry the same shape, and because they
 * come from the same `derive` the charts replay, the first and last rows are
 * the same figures the chart draws at its ends.
 */

/** Readings per table. Enough to carry a shape, few enough to be listened to. */
const SAMPLES = 8;

type Reading = { t: number; value: number; accrued: number };

function sampleWindow(events: LedgerEvent[], days: number, now: number): Reading[] {
  const start = now - days * DAY_MS;
  const step = (now - start) / (SAMPLES - 1);
  return Array.from({ length: SAMPLES }, (_, i) => {
    const t = i === SAMPLES - 1 ? now : start + i * step;
    const snap = derive(
      events.filter((e) => e.at <= t),
      t,
    );
    return { t, value: snap.portfolioValue, accrued: snap.rewardsAccrued };
  });
}

export default function Analytics() {
  const snap = useLedger();
  const [range, setRange] = useState(30);

  // One clock for the whole surface, fixed for the life of the route and
  // handed to both charts. Each chart otherwise takes its own reading at
  // mount, and a table sampled a second later would disagree with the curve
  // it is supposed to be the alternative for.
  const [clock] = useState(() => Date.now());
  const readings = useMemo(
    () => (snap.events.length ? sampleWindow(snap.events, range, clock) : []),
    [snap.events, range, clock],
  );

  const allocation = useMemo(() => {
    const buckets = new Map<string, { name: string; amount: number; positions: number }>();
    for (const p of snap.activePositions) {
      const key = p.tierId ?? "unassigned";
      const existing = buckets.get(key);
      if (existing) {
        existing.amount += p.principal;
        existing.positions += 1;
      } else {
        buckets.set(key, { name: p.tier?.name ?? "Unassigned", amount: p.principal, positions: 1 });
      }
    }
    const total = [...buckets.values()].reduce((s, b) => s + b.amount, 0);
    return {
      total,
      rows: [...buckets.values()]
        .sort((a, b) => b.amount - a.amount)
        .map((b) => ({ ...b, share: total > 0 ? b.amount / total : 0 })),
    };
  }, [snap.activePositions]);

  if (snap.events.length === 0) {
    return (
      <div className="space-y-6">
        <header>
          <p className="eyebrow">Intelligence</p>
          <h1 className="display mt-1 text-2xl sm:text-3xl">Telemetry</h1>
        </header>
        <div className="panel">
          <Empty
            icon={ChartLine}
            art="ledger"
            title="Nothing to chart yet"
            body="Performance, reward and allocation charts appear once your first vault is open."
            action={{ label: "Open a vault", to: "/app/vaults/new" }}
          />
        </div>
      </div>
    );
  }

  const first = readings[0]?.value ?? 0;
  const last = readings[readings.length - 1]?.value ?? 0;
  const change = last - first;
  const accruedInWindow =
    (readings[readings.length - 1]?.accrued ?? 0) - (readings[0]?.accrued ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Intelligence</p>
          {/* The nav row says Telemetry, and so does docs/NAMING.md. */}
          <h1 className="display mt-1 text-2xl sm:text-3xl">Telemetry</h1>
        </div>
        <RangeTabs value={range} onChange={setRange} controls="perf-panel" />
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Metric label="Portfolio value">{money(snap.portfolioValue, 2)}</Metric>
        <Metric label="Net gain" tone={snap.netGain >= 0 ? "gain" : "loss"}>
          {money(snap.netGain, 2)}
        </Metric>
        <Metric label="Return" tone={snap.returnPct >= 0 ? "gain" : "loss"}>
          {pct(snap.returnPct)}
        </Metric>
        <Metric label="Daily accrual" tone="accent">
          {money(snap.dailyRate, 2)}
        </Metric>
      </div>

      <section className="band" aria-labelledby="telemetry-value">
        <BandHead id="telemetry-value" title="Portfolio value" />
        <figure id="perf-panel" className="m-0">
          <PerformanceChart events={snap.events} days={range} now={clock} />
          <ChartTable
            className="mt-3"
            caption={`Portfolio value across the last ${range} days, sampled at ${SAMPLES} points`}
            summary={
              <>
                Over {range} days portfolio value moved from {money(first, 2)} to {money(last, 2)},
                a change of {change >= 0 ? "+" : ""}
                {money(change, 2)}.
              </>
            }
            columns={[
              { key: "date", label: "Date" },
              { key: "value", label: "Portfolio value" },
            ]}
            rows={readings.map((r) => ({ date: shortDate(r.t), value: money(r.value, 2) }))}
          />
        </figure>
      </section>

      <section className="band" aria-labelledby="telemetry-detail">
        <BandHead id="telemetry-detail" title="Rewards and allocation" />
        <div className="grid gap-4 lg:grid-cols-2">
          <figure className="m-0">
            <RewardsChart events={snap.events} days={range} now={clock} />
            <ChartTable
              className="mt-3"
              caption={`Rewards accrued across the last ${range} days, in ${SAMPLES - 1} periods`}
              summary={
                <>
                  {money(accruedInWindow, 2)} accrued across these {range} days, out of{" "}
                  {money(snap.rewardsAccrued, 2)} lifetime.
                </>
              }
              columns={[
                { key: "period", label: "Period ending" },
                { key: "accrued", label: "Accrued" },
              ]}
              rows={readings.slice(1).map((r, i) => ({
                period: shortDate(r.t),
                accrued: money(Math.max(0, r.accrued - readings[i].accrued), 2),
              }))}
            />
          </figure>

          <figure className="m-0">
            <AllocationChart snapshot={snap} />
            <ChartTable
              className="mt-3"
              caption="Deployed principal by tier"
              summary={
                allocation.rows.length === 0 ? (
                  <>No principal is deployed, so there is nothing to allocate.</>
                ) : (
                  <>
                    {money(allocation.total)} of principal is deployed across{" "}
                    {allocation.rows.length} {allocation.rows.length === 1 ? "tier" : "tiers"}.
                  </>
                )
              }
              columns={[
                { key: "tier", label: "Tier" },
                { key: "principal", label: "Principal" },
                { key: "share", label: "Share" },
                { key: "vaults", label: "Vaults" },
              ]}
              rows={allocation.rows.map((r) => ({
                tier: r.name,
                principal: money(r.amount),
                share: `${(r.share * 100).toFixed(1)}%`,
                vaults: String(r.positions),
              }))}
            />
          </figure>
        </div>
      </section>
    </div>
  );
}
