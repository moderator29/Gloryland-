import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const QUOTE = "Capital is patient. Returns are daily.";
const SIGNATURE = "Emilia";

export function FounderQuote() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });

  return (
    <div ref={ref} className="glass-luxury relative overflow-hidden p-6">
      <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        From the Founder
      </p>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, delay: 0.1 }}
        className="font-display mt-3 text-2xl italic leading-snug text-white/90"
      >
        &ldquo;{QUOTE}&rdquo;
      </motion.p>
      <div className="mt-5 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">
          Emilia Clarke
        </span>
        <svg aria-hidden viewBox="0 0 200 56" className="h-10 w-28" style={{ overflow: "visible" }}>
          <motion.path
            d="M10 38 C 18 18, 30 18, 36 32 C 42 46, 50 22, 60 30 C 68 36, 76 14, 92 28 C 108 42, 120 16, 138 30 C 152 40, 170 24, 188 32"
            fill="none"
            stroke="url(#sig-grad)"
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={inView ? { pathLength: 1 } : { pathLength: 0 }}
            transition={{ duration: 2, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
          />
          <defs>
            <linearGradient id="sig-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#B8842B" />
              <stop offset="50%" stopColor="#FFD700" />
              <stop offset="100%" stopColor="#B8842B" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <p className="mt-1 text-right font-display text-sm italic text-gradient-gold">{SIGNATURE}</p>
    </div>
  );
}
