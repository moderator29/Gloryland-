import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, TrendingUp, Trophy, TriangleAlert } from "lucide-react";
import type { Insight } from "@/domain/insights";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/** Presentation per insight kind, shared by Home and the Insight surface. */
export const INSIGHT_STYLE: Record<
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

export function InsightCard({ insight, index = 0 }: { insight: Insight; index?: number }) {
  const s = INSIGHT_STYLE[insight.kind];
  const Icon = s.icon;
  const reduce = useReducedMotion();

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.38, delay: reduce ? 0 : index * 0.06 }}
      className={`panel border ${s.ring} p-4 sm:p-5`}
    >
      <div className="flex items-start gap-3.5">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${s.tint}`}>
          <Icon className="h-[17px] w-[17px]" strokeWidth={1.9} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{s.label}</p>
          <h3 className="mt-1 text-sm font-semibold leading-snug text-[var(--text-hi)]">
            {insight.title}
          </h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-mid)]">
            {insight.body}
          </p>
          {insight.action && (
            <Link to={insight.action.to} className="btn btn-secondary mt-3.5 !py-2 !text-[13px]">
              {insight.action.label} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    </motion.article>
  );
}
