import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDown, ArrowUp, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useMarket, useMarketHistory, WINDOWS, type Window } from "@/hooks/useMarket";
import { assetById, type AssetId } from "@/features/market/assets";
import { CoinLogo } from "@/features/market/CoinLogo";
import { Crumbs, Skeleton } from "@/components/system/ui";
import { money, moneyCompact } from "@/components/system/format";
import { useReducedMotion } from "@/hooks/useReducedMotion";

function tickLabel(t: number, win: Window) {
  const d = new Date(t);
  if (win === "1D") return d.toLocaleTimeString("en-US", { hour: "numeric" });
  if (win === "1Y" || win === "ALL")
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function MarketDetail() {
  const { assetId } = useParams();
  const meta = assetById((assetId ?? "") as AssetId);
  const { coins } = useMarket();
  const [win, setWin] = useState<Window>("1D");
  const [copied, setCopied] = useState(false);
  const reduce = useReducedMotion();

  const coin = coins.find((c) => c.id === meta?.id);
  const { points, loading, failed } = useMarketHistory(meta?.gecko ?? "bitcoin", win);

  const stats = useMemo(() => {
    if (!points || points.length < 2) return null;
    const first = points[0].p;
    const last = points[points.length - 1].p;
    return {
      change: last - first,
      pct: ((last - first) / first) * 100,
      low: Math.min(...points.map((p) => p.p)),
      high: Math.max(...points.map((p) => p.p)),
    };
  }, [points]);

  if (!meta) {
    return (
      <div className="panel p-10 text-center">
        <p className="text-[var(--text-hi)]">That asset is not listed here.</p>
        <Link to="/app/market" className="btn btn-secondary mt-4">
          Back to markets
        </Link>
      </div>
    );
  }

  const up = (stats?.pct ?? coin?.change24h ?? 0) >= 0;
  const tint = up ? "var(--gain)" : "var(--loss)";

  const copyAddress = async () => {
    if (!meta.address) return;
    try {
      await navigator.clipboard.writeText(meta.address);
      setCopied(true);
      toast.success(`${meta.symbol} address copied`);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy. Select the address and copy it manually.");
    }
  };

  return (
    <div className="space-y-5">
      <Crumbs trail={[{ label: "Markets", to: "/app/market" }, { label: meta.name }]} />

      {/* Price header */}
      <section className="panel-hi edge-light p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <CoinLogo asset={meta} size={44} />
          <div className="min-w-0">
            <h1 className="display text-xl sm:text-2xl">{meta.name}</h1>
            <p className="mt-0.5 truncate text-xs text-[var(--text-low)]">
              {meta.symbol}
              {coin
                ? ` · MC ${moneyCompact(coin.marketCap)} · 24h Vol ${moneyCompact(coin.vol24h)}`
                : ""}
            </p>
          </div>
        </div>

        <p className="metric mt-4 text-4xl sm:text-5xl">
          {coin ? money(coin.price, meta.priceDecimals) : "--"}
        </p>

        {stats && (
          <p
            className="tabular mt-2 inline-flex items-center gap-1.5 text-sm font-semibold"
            style={{ color: tint }}
          >
            {up ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
            {money(Math.abs(stats.change), meta.priceDecimals)} ({stats.pct >= 0 ? "+" : ""}
            {stats.pct.toFixed(2)}%)
            <span className="font-normal text-[var(--text-low)]">· {win}</span>
          </p>
        )}
      </section>

      {/* Chart */}
      <section className="panel overflow-hidden">
        <div className="h-[260px] w-full px-1 pt-4 sm:h-[320px] sm:px-3">
          {loading && !points ? (
            <Skeleton className="mx-3 h-full" />
          ) : failed || !points ? (
            <div className="grid h-full place-items-center px-6 text-center">
              <p className="text-sm leading-relaxed text-[var(--text-low)]">
                Chart data is unavailable right now. Try another window or refresh in a moment.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="mkt-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={tint} stopOpacity={0.32} />
                    <stop offset="100%" stopColor={tint} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="t"
                  tickFormatter={(t) => tickLabel(t, win)}
                  tick={{ fill: "var(--text-low)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={44}
                />
                <YAxis
                  domain={["dataMin", "dataMax"]}
                  tick={{ fill: "var(--text-low)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                  tickFormatter={(v) => moneyCompact(Number(v))}
                />
                <Tooltip
                  cursor={{ stroke: "var(--line-hi)", strokeWidth: 1 }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0].payload as { t: number; p: number };
                    return (
                      <div className="raised rounded-xl px-3 py-2">
                        <p className="metric text-sm">{money(p.p, meta.priceDecimals)}</p>
                        <p className="mt-0.5 text-[10px] text-[var(--text-low)]">
                          {new Date(p.t).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                          })}
                        </p>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="p"
                  stroke={tint}
                  strokeWidth={1.8}
                  fill="url(#mkt-fill)"
                  isAnimationActive={!reduce}
                  animationDuration={600}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Window selector */}
        <div
          role="tablist"
          aria-label="Chart range"
          className="no-bar flex gap-1 overflow-x-auto border-t border-[var(--line)] p-2"
        >
          {WINDOWS.map((w) => (
            <button
              key={w}
              role="tab"
              aria-selected={win === w}
              onClick={() => setWin(w)}
              className={`min-h-[36px] relative flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                win === w ? "text-[#04101f]" : "text-[var(--text-mid)] hover:text-[var(--text-hi)]"
              }`}
            >
              {win === w && (
                <motion.span
                  layoutId="mkt-window"
                  className="absolute inset-0 rounded-lg"
                  style={{ background: "linear-gradient(180deg, var(--accent-hi), var(--accent))" }}
                  transition={
                    reduce ? { duration: 0 } : { type: "spring", stiffness: 440, damping: 36 }
                  }
                />
              )}
              <span className="relative">{w}</span>
            </button>
          ))}
        </div>

        {stats && (
          <div className="grid grid-cols-2 gap-px border-t border-[var(--line)] bg-[var(--line)]">
            <div className="bg-[var(--ink-100)] p-3.5">
              <p className="eyebrow">{win} low</p>
              <p className="metric mt-1 text-sm">{money(stats.low, meta.priceDecimals)}</p>
            </div>
            <div className="bg-[var(--ink-100)] p-3.5">
              <p className="eyebrow">{win} high</p>
              <p className="metric mt-1 text-sm">{money(stats.high, meta.priceDecimals)}</p>
            </div>
          </div>
        )}
      </section>

      {/* Fund with this asset */}
      <section className="panel p-5">
        <p className="eyebrow">Fund with {meta.symbol}</p>
        <p className="mt-1.5 text-xs text-[var(--text-low)]">{meta.network}</p>
        {/* Absent unless a real address is configured. There is no custody
                  behind this build, so a string here would be a destination
                  nobody owns. */}
        {meta.address ? (
          <>
            <p className="inset mt-3 break-all p-3 font-mono text-[11px] leading-relaxed text-[var(--text)]">
              {meta.address}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={copyAddress} className="btn btn-secondary flex-1">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={copied ? "y" : "n"}
                    initial={reduce ? false : { opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduce ? undefined : { opacity: 0, scale: 0.9 }}
                    transition={{ duration: reduce ? 0 : 0.14 }}
                    className="inline-flex items-center gap-2"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied" : "Copy address"}
                  </motion.span>
                </AnimatePresence>
              </button>
              <Link to="/app/vaults/new" className="btn btn-primary flex-1">
                Open a vault
              </Link>
            </div>
          </>
        ) : (
          <p className="inset mt-3 p-3.5 text-xs leading-relaxed text-[var(--text-low)]">
            Funding is not open in this build. There is no wallet behind the product yet and no
            address that could receive a transfer, so none is shown.
          </p>
        )}
      </section>

      <p className="pb-2 text-center text-[11px] text-[var(--text-low)]">
        Prices from CoinGecko. Figures are indicative and refresh about every 60 seconds.
      </p>
    </div>
  );
}
