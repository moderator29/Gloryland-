import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, RefreshCw } from "lucide-react";
import { useMarket } from "@/hooks/useMarket";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { assetById } from "./assets";
import { CoinLogo } from "./CoinLogo";
import { Sparkline } from "./Sparkline";
import { Skeleton } from "@/components/system/ui";
import { money, moneyCompact, relative } from "@/components/system/format";

/**
 * Live prices for the five funding assets. Each row carries a 7 day trace and
 * opens a full chart. Built to stay readable at 360px: the trace hides on the
 * narrowest screens rather than squeezing the figures.
 */
export function MarketPanel({ compact = false }: { compact?: boolean }) {
  const { coins, loading, stale, at, refresh } = useMarket();
  const reduce = useReducedMotion();

  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-[var(--text-hi)]">Market</h2>
          <p className="mt-0.5 truncate text-xs text-[var(--text-low)]">
            {stale
              ? "Showing last known prices"
              : at
                ? `Updated ${relative(at)}`
                : "Live prices from CoinGecko"}
          </p>
        </div>
        <button onClick={refresh} className="btn btn-ghost !px-2" aria-label="Refresh prices">
          <RefreshCw className={`h-4 w-4 ${loading && !reduce ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && coins.length === 0 ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: compact ? 3 : 5 }, (_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : coins.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm leading-relaxed text-[var(--text-low)]">
          Market data is unavailable right now. It returns automatically once the feed responds.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--line)]">
          {(compact ? coins.slice(0, 3) : coins).map((c, i) => {
            const meta = assetById(c.id);
            const up = c.change24h >= 0;
            return (
              <motion.li
                key={c.id}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduce ? 0 : 0.3, delay: reduce ? 0 : i * 0.04 }}
              >
                <Link
                  to={`/app/market/${c.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[rgba(46,139,255,0.05)] sm:gap-4 sm:px-5"
                >
                  {meta && <CoinLogo asset={meta} size={34} />}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-sm font-semibold text-[var(--text-hi)]">
                        {c.symbol}
                      </span>
                      <span className="hidden truncate text-xs text-[var(--text-low)] sm:inline">
                        {c.name}
                      </span>
                    </div>
                    <p className="metric mt-0.5 text-[15px]">
                      {money(c.price, meta?.priceDecimals ?? 2)}
                    </p>
                  </div>

                  {/* the trace is the first thing to go when width is tight */}
                  <div className="hidden xs:block sm:block">
                    <Sparkline points={c.sparkline} up={up} width={72} height={28} />
                  </div>

                  <div className="shrink-0 text-right">
                    <p
                      className={`tabular text-sm font-semibold ${
                        up ? "text-[var(--gain)]" : "text-[var(--loss)]"
                      }`}
                    >
                      {up ? "+" : ""}
                      {c.change24h.toFixed(2)}%
                    </p>
                    <p className="mt-0.5 hidden text-[11px] text-[var(--text-low)] sm:block">
                      Vol {moneyCompact(c.vol24h)}
                    </p>
                  </div>

                  <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-low)]" />
                </Link>
              </motion.li>
            );
          })}
        </ul>
      )}

      {compact && coins.length > 3 && (
        <Link
          to="/app/market"
          className="flex items-center justify-center gap-1.5 border-t border-[var(--line)] px-5 py-3 text-xs font-medium text-[var(--accent-hi)] transition-colors hover:bg-[rgba(46,139,255,0.05)]"
        >
          All markets <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </section>
  );
}
