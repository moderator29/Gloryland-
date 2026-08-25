import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CircleCheck, Sparkles, TrendingUp, Trophy, TriangleAlert } from "lucide-react";
import { useLedger } from "@/hooks/useLedger";
import { buildInsights } from "@/domain/insights";
import { InsightCard } from "@/components/system/InsightCard";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Metric } from "@/components/system/ui";
import { money, pct } from "@/components/system/format";

export default function Insights() {
  const snap = useLedger();
  const reduce = useReducedMotion();
  const insights = useMemo(() => buildInsights(snap), [snap]);

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Intelligence</p>
        <h1 className="display mt-1 text-2xl sm:text-3xl">Insights</h1>
        <p className="mt-2 max-w-xl text-sm text-[var(--text-low)]">
          Observations drawn from your own ledger. Nothing here is a recommendation to invest.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Metric label="Portfolio">{money(snap.portfolioValue, 2)}</Metric>
        <Metric label="Return" tone={snap.returnPct >= 0 ? "gain" : "loss"}>
          {pct(snap.returnPct)}
        </Metric>
        <Metric label="Open vaults" tone="accent">
          {snap.activePositions.length}
        </Metric>
        <Metric label="Standing">{snap.tier?.name ?? "Unranked"}</Metric>
      </div>

      {insights.length === 0 ? (
        // Quiet is a valid, meaningful result here, not an error or a blank slate.
        <div className="panel flex flex-col items-center px-6 py-14 text-center">
          <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-[rgba(52,211,153,0.3)] bg-[rgba(52,211,153,0.1)]">
            <CircleCheck className="h-5 w-5 text-[var(--gain)]" strokeWidth={1.8} />
          </span>
          <p className="font-semibold text-[var(--text-hi)]">All clear</p>
          <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-[var(--text-low)]">
            Nothing needs your attention. Your vaults are accruing on schedule and no action is
            outstanding.
          </p>
          <Link to="/app/vaults" className="btn btn-outline mt-5">
            Review vaults <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((ins, i) => (
            <InsightCard key={ins.id} insight={ins} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
