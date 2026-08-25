import { motion } from "framer-motion";

const LOGOS = [
  "BILLBOARD",
  "ROLLING STONE",
  "FORBES",
  "BLOOMBERG",
  "PITCHFORK",
  "VARIETY",
  "MUSIC WEEK",
  "FINANCIAL TIMES",
  "NME",
];

export function PressWall() {
  const loop = [...LOGOS, ...LOGOS];
  return (
    <div className="relative overflow-hidden py-2">
      <p className="mb-2 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
        As seen in
      </p>
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent" />
      <motion.div
        className="flex shrink-0 gap-10 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 36, repeat: Infinity, ease: "linear" }}
      >
        {loop.map((l, i) => (
          <span
            key={i}
            className="font-display text-base font-bold tracking-[0.25em] text-white/40"
          >
            {l}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
