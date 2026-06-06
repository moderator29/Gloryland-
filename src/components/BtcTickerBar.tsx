import { motion } from "framer-motion";
import { useBtcSnapshot } from "@/hooks/useBtcMarket";
import { ArrowUp, ArrowDown } from "lucide-react";

export function BtcTickerBar() {
  const snap = useBtcSnapshot();
  const up = (snap?.change24h ?? 0) >= 0;

  return (
    <motion.div
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-[51] border-b border-border/40 bg-black/85 px-5 py-1.5 backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-2xl items-center justify-between text-[10px] uppercase tracking-[0.18em]">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="grid h-3.5 w-3.5 place-items-center rounded-full"
            style={{
              background: "linear-gradient(135deg, #f7931a 0%, #ffb347 100%)",
              fontSize: 9,
              color: "white",
              lineHeight: 1,
            }}
          >
            ₿
          </span>
          <span className="text-muted-foreground">BTC</span>
          <span className="font-numeric text-white">
            {snap ? `$${Math.round(snap.price).toLocaleString()}` : "—"}
          </span>
        </div>
        <span
          className="font-numeric inline-flex items-center gap-1"
          style={{ color: up ? "#10b981" : "#ef4444" }}
        >
          {up ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
          {snap ? `${up ? "+" : ""}${snap.change24h.toFixed(2)}%` : "—"}
        </span>
      </div>
    </motion.div>
  );
}
