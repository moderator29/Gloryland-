import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CircleCheck, Sparkles, TrendingUp, Trophy, TriangleAlert } from "lucide-react";
import { useLedger } from "@/hooks/useLedger";
import { buildInsights, type Insight } from "@/domain/insights";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Metric } from "@/components/system/ui";
import { money, pct } from "@/components/system/format";

const STYLE: Record<
  Insight["kind"],
  { icon: typeof Sparkles; ring: string; tint: string; label: string }
> = {
  attention: {
    icon: TriangleAlert,
    ring: "border-[rgba(251,191,36,0.35)]",
    tint: "bg-[rgba(251,191,36,0.1)] text-[var(--warn)]",
    label: "Needs attention",
  },
  opportunity: {
    icon: Sparkles,
    ring: "border-[rgba(46,139,255,0.35)]",
    tint: "bg-[rgba(46,139,255,0.1)] text-[var(--accent-hi)]",
    label: "Opportunity",
  },
  milestone: {
    icon: Trophy,
    ring: "border-[rgba(125,211,252,0.32)]",
    tint: "bg-[rgba(125,211,252,0.1)] text-[var(--accent-soft)]",
    label: "Milestone",
  },
  performance: {
    icon: TrendingUp,
    ring: "border-[rgba(52,211,153,0.3)]",
    tint: "bg-[rgba(52,211,153,0.1)] text-[var(--gain)]",
    label: "Performance",
  },
};

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
          {insights.map((ins, i) => {
            const s = STYLE[ins.kind];
            const Icon = s.icon;
            return (
              <motion.article
                key={ins.id}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduce ? 0 : 0.4, delay: reduce ? 0 : i * 0.07 }}
                className={`panel border ${s.ring} p-5`}
              >
                <div className="flex items-start gap-4">
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${s.tint}`}
                  >
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="eyebrow">{s.label}</p>
                    <h2 className="mt-1 text-[15px] font-semibold text-[var(--text-hi)]">
                      {ins.title}
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-mid)]">
                      {ins.body}
                    </p>
                    {ins.action && (
                      <Link
                        to={ins.action.to}
                        className="btn btn-secondary mt-4 !py-2 !text-[13px]"
                      >
                        {ins.action.label} <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </div>
  );
}
