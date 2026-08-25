import { useState } from "react";
import { useLedger } from "@/hooks/useLedger";
import { PerformanceChart, RewardsChart, AllocationChart, RangeTabs } from "@/features/analytics";
import { Metric, Empty } from "@/components/system/ui";
import { money, pct } from "@/components/system/format";
import { ChartLine } from "lucide-react";

export default function Analytics() {
  const snap = useLedger();
  const [range, setRange] = useState(30);

  if (snap.events.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <p className="eyebrow">Intelligence</p>
          <h1 className="display mt-1 text-2xl sm:text-3xl">Analytics</h1>
        </div>
        <div className="panel">
          <Empty
            icon={ChartLine}
            title="Nothing to chart yet"
            body="Performance, reward and allocation analytics appear once your first vault is open."
            action={{ label: "Open a vault", to: "/app/vaults/new" }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Intelligence</p>
          <h1 className="display mt-1 text-2xl sm:text-3xl">Analytics</h1>
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

      <div id="perf-panel">
        <PerformanceChart events={snap.events} days={range} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RewardsChart events={snap.events} days={range} />
        <AllocationChart snapshot={snap} />
      </div>
    </div>
  );
}
