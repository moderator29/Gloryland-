import { motion } from "framer-motion";

const ITEMS = [
  "Netflix payout cleared $1.2M to Silver holders",
  "Brand deal closed: +$480K to portfolio",
  "Studio royalties confirmed: $2.4M",
  "Gold tier sold out: 20 of 20 seats",
  "Daily reward processed: $2,500",
  "New campaign signed in Q4",
  "Film slate locked for 2026",
];

export function Ticker() {
  const loop = [...ITEMS, ...ITEMS];
  return (
    <div className="relative overflow-hidden rounded-full border border-border/60 bg-black/40 py-2 backdrop-blur-md">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-background to-transparent" />
      <motion.div
        className="flex shrink-0 gap-10 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
      >
        {loop.map((t, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary/80" />
            {t}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
