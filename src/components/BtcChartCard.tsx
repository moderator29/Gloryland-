import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { ArrowUp, ArrowDown, X, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/Skeleton";
import { useBtcChart, useBtcSnapshot, type Window } from "@/hooks/useBtcMarket";
import { playTap } from "@/lib/sound";
import { tap as hapticTap } from "@/lib/haptic";

const WINDOWS: Window[] = ["1D", "1W", "1M", "1Y", "ALL"];

function fmtUsd(n: number, dp = 2) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  });
}

function fmtCompact(n: number) {
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

function BtcLogo({ size = 36 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="relative grid shrink-0 place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #f7931a 0%, #ffb347 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 12px -2px rgba(247,147,26,0.5)",
      }}
    >
      <span className="font-display text-base font-bold text-white" style={{ lineHeight: 1 }}>
        ₿
      </span>
    </span>
  );
}

export function BtcChartCard() {
  const snap = useBtcSnapshot();
  const [open, setOpen] = useState(false);
  const { points } = useBtcChart("1D");

  const up = (snap?.change24h ?? 0) >= 0;
  const trendColor = up ? "#10b981" : "#ef4444";
  const previous = snap ? snap.price - snap.price * (snap.change24h / 100) : 0;
  const delta = snap ? snap.price - previous : 0;

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          playTap();
          hapticTap();
        }}
        className="glass-luxury relative block w-full overflow-hidden p-4 text-left transition-transform active:scale-[0.99]"
      >
        <div className="flex items-center gap-3">
          <BtcLogo />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-display text-lg leading-tight">Bitcoin</p>
              <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                BTC
              </span>
            </div>
            <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-numeric text-white">
                {snap ? fmtUsd(snap.price, snap.price < 1 ? 6 : 0) : "--"}
              </span>
              <span style={{ color: trendColor }} className="font-numeric font-semibold">
                {snap ? `${up ? "+" : ""}${snap.change24h.toFixed(2)}%` : "--"}
              </span>
            </p>
          </div>
          <div className="flex h-12 w-28 items-center">
            {points && points.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={points} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="mini-area" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={trendColor} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={trendColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="p"
                    stroke={trendColor}
                    strokeWidth={2}
                    fill="url(#mini-area)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-8 w-full" rounded="md" />
            )}
          </div>
          <ChevronRight className="ml-1 h-4 w-4 text-muted-foreground" />
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <BtcChartModal
            onClose={() => setOpen(false)}
            snap={snap}
            previous={previous}
            delta={delta}
            up={up}
            trendColor={trendColor}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function BtcChartModal({
  onClose,
  snap,
  previous,
  delta,
  up,
  trendColor,
}: {
  onClose: () => void;
  snap: ReturnType<typeof useBtcSnapshot>;
  previous: number;
  delta: number;
  up: boolean;
  trendColor: string;
}) {
  const [win, setWin] = useState<Window>("1D");
  const { points, loading } = useBtcChart(win);

  const stats = useMemo(() => {
    if (!points || points.length === 0) return null;
    const ps = points.map((d) => d.p);
    return {
      min: Math.min(...ps),
      max: Math.max(...ps),
      first: ps[0],
      last: ps[ps.length - 1],
    };
  }, [points]);

  const windowChange = stats ? ((stats.last - stats.first) / stats.first) * 100 : 0;
  const windowUp = windowChange >= 0;
  const lineColor = windowUp ? "#10b981" : "#ef4444";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-end bg-black/80 backdrop-blur-xl md:items-center md:justify-center"
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 600 }}
        animate={{ y: 0 }}
        exit={{ y: 600 }}
        transition={{ type: "spring", stiffness: 280, damping: 30 }}
        className="glass-luxury aurora-border relative max-h-[92vh] w-full max-w-md overflow-auto rounded-t-3xl p-5 pb-8 md:rounded-3xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <BtcLogo size={44} />
            <div>
              <p className="font-display text-2xl leading-none">Bitcoin</p>
              <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                BTC · MC {snap ? `$${fmtCompact(snap.marketCap)}` : "--"} · 24h Vol{" "}
                {snap ? `$${fmtCompact(snap.vol24h)}` : "--"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-border/60 text-muted-foreground hover:text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="font-numeric text-5xl font-semibold leading-none">
          {snap ? fmtUsd(snap.price, snap.price < 1 ? 6 : 0) : "--"}
        </p>
        <p
          className="font-numeric mt-2 inline-flex items-center gap-1.5 text-sm font-semibold"
          style={{ color: trendColor }}
        >
          {up ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
          {snap
            ? `${up ? "+" : ""}${fmtUsd(Math.abs(delta), 0)} (${up ? "+" : ""}${snap.change24h.toFixed(2)}%)`
            : "--"}
          <span className="text-muted-foreground">· 24h</span>
        </p>

        <div className="mt-5 h-56">
          {points && points.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id={`big-area-${win}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={lineColor} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" hide />
                <YAxis domain={["dataMin", "dataMax"]} hide />
                {stats && (
                  <ReferenceLine
                    y={stats.min}
                    stroke="rgba(255,255,255,0.18)"
                    strokeDasharray="4 4"
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="p"
                  stroke={lineColor}
                  strokeWidth={2.2}
                  fill={`url(#big-area-${win})`}
                  isAnimationActive
                  animationDuration={700}
                  dot={false}
                  activeDot={{ r: 4, fill: lineColor, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : loading ? (
            <Skeleton className="h-full w-full" rounded="lg" />
          ) : (
            <div className="grid h-full place-items-center text-xs text-muted-foreground">
              Could not load chart.
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
          <span>Window change</span>
          <span style={{ color: lineColor }}>
            {windowUp ? "+" : ""}
            {windowChange.toFixed(2)}%
          </span>
        </div>

        <div className="mt-4 grid grid-cols-5 gap-1 rounded-2xl border border-border/60 bg-black/30 p-1">
          {WINDOWS.map((w) => (
            <button
              key={w}
              onClick={() => {
                setWin(w);
                playTap();
                hapticTap();
              }}
              className={`relative rounded-xl py-2 text-xs font-medium transition-colors ${
                win === w ? "text-white" : "text-muted-foreground hover:text-white"
              }`}
            >
              {win === w && (
                <motion.span
                  layoutId="btc-win"
                  className="absolute inset-0 rounded-xl bg-white/[0.07] ring-1 ring-primary/40"
                  style={{ boxShadow: "0 0 14px -2px rgba(255,215,0,0.35)" }}
                  transition={{ type: "spring", stiffness: 360, damping: 28 }}
                />
              )}
              <span className="relative">{w}</span>
            </button>
          ))}
        </div>

        <p className="mt-4 text-center text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">
          Live prices from CoinGecko · Refresh every 60s
        </p>
      </motion.div>
    </motion.div>
  );
}
