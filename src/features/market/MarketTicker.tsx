import { motion } from "framer-motion";
import { useMarket } from "@/hooks/useMarket";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { money } from "@/components/system/format";
import { assetById } from "./assets";
import { CoinLogo } from "./CoinLogo";

/**
 * Thin live band above the app header. Scrolls only when there is more to show
 * than fits, and pauses on hover so a figure can be read.
 */
export function MarketTicker() {
  const { coins, loading, stale } = useMarket();
  const reduce = useReducedMotion();

  if (loading && coins.length === 0) {
    return (
      <div className="h-8 border-b border-[var(--line)] bg-[var(--ink-050)]">
        <div className="shimmer h-full w-full" />
      </div>
    );
  }
  if (coins.length === 0) return null;

  // The mark leads each entry. The band is a scan, not a read: a logo is
  // recognised before a three letter code is parsed, and the marks are bundled
  // so there is no request and nothing to pop in behind the price.
  const row = coins.map((c) => {
    const meta = assetById(c.id);
    return (
      <span key={c.id} className="inline-flex shrink-0 items-center gap-2 px-4 text-[11px]">
        {meta && <CoinLogo asset={meta} size={15} />}
        <span className="font-semibold text-[var(--text-mid)]">{c.symbol}</span>
        <span className="tabular text-[var(--text-hi)]">
          {money(c.price, c.price < 10 ? 4 : 0)}
        </span>
        <span
          className={`tabular ${c.change24h >= 0 ? "text-[var(--gain)]" : "text-[var(--loss)]"}`}
        >
          {c.change24h >= 0 ? "+" : ""}
          {c.change24h.toFixed(2)}%
        </span>
      </span>
    );
  });

  return (
    <div
      className="group relative h-8 overflow-hidden border-b border-[var(--line)] bg-[var(--ink-050)]"
      role="status"
      aria-label="Live market prices"
    >
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            "linear-gradient(90deg, var(--ink-050), transparent 8%, transparent 92%, var(--ink-050))",
        }}
      />
      <motion.div
        className="flex h-full w-max items-center"
        animate={reduce ? undefined : { x: ["0%", "-50%"] }}
        transition={{ duration: 42, repeat: Infinity, ease: "linear" }}
        style={{ animationPlayState: "running" }}
      >
        {row}
        {row}
      </motion.div>
      {stale && (
        <span className="absolute right-3 top-1/2 z-20 -translate-y-1/2 text-[9px] uppercase tracking-widest text-[var(--warn)]">
          cached
        </span>
      )}
    </div>
  );
}
