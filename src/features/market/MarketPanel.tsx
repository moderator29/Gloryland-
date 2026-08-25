import { motion } from "framer-motion";
import { RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { useMarket } from "@/hooks/useMarket";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Sparkline } from "./Sparkline";
import { Skeleton } from "@/components/system/ui";
import { money, moneyCompact, relative } from "@/components/system/format";

/** Live market table: price, 24h move, 7-day trace, depth figures. */
export function MarketPanel() {
  const { coins, loading, stale, at, refresh } = useMarket();
  const reduce = useReducedMotion();

  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold text-[var(--text-hi)]">Market</h2>
          <p className="mt-0.5 text-xs text-[var(--text-low)]">
            {stale
              ? "Showing last known prices, refresh unavailable"
              : at
                ? `Updated ${relative(at)}`
                : "Live prices"}
          </p>
        </div>
        <button
          onClick={refresh}
          className="btn btn-ghost !px-2"
          aria-label="Refresh market prices"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading && !reduce ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && coins.length === 0 ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : coins.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-[var(--text-low)]">
          Market data is unavailable right now. It will reappear automatically once the feed
          responds.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--line)]">
          {coins.map((c, i) => {
            const up = c.change24h >= 0;
            const Trend = up ? TrendingUp : TrendingDown;
            return (
              <motion.li
                key={c.id}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : i * 0.05 }}
                className="flex items-center gap-4 px-5 py-3.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--text-hi)]">{c.symbol}</span>
                    <span className="truncate text-xs text-[var(--text-low)]">{c.name}</span>
                  </div>
                  <p className="metric mt-1 text-base">{money(c.price, c.price < 10 ? 4 : 0)}</p>
                </div>

                <div className="hidden sm:block">
                  <Sparkline points={c.sparkline} up={up} />
                </div>

                <div className="shrink-0 text-right">
                  <p
                    className={`tabular inline-flex items-center gap-1 text-sm font-medium ${
                      up ? "text-[var(--gain)]" : "text-[var(--loss)]"
                    }`}
                  >
                    <Trend className="h-3.5 w-3.5" />
                    {up ? "+" : ""}
                    {c.change24h.toFixed(2)}%
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--text-low)]">
                    Vol {moneyCompact(c.vol24h)}
                  </p>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
