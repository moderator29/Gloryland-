import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Network confirmation progress for a recorded deposit.
 *
 * Confirmations advance on a timer because this build has no chain watcher.
 * That is stated on the surface rather than implied, so the animation is
 * never mistaken for a live reading of a network.
 */
export function ConfirmationTracker({
  blocks = 6,
  intervalMs = 2600,
  onComplete,
}: {
  blocks?: number;
  intervalMs?: number;
  onComplete?: () => void;
}) {
  const [seen, setSeen] = useState(0);
  const reduce = useReducedMotion();
  const done = seen >= blocks;

  useEffect(() => {
    if (done) {
      onComplete?.();
      return;
    }
    const id = window.setTimeout(() => setSeen((s) => s + 1), intervalMs);
    return () => window.clearTimeout(id);
  }, [seen, blocks, intervalMs, done, onComplete]);

  return (
    <div className="inset p-4">
      <div className="flex items-center gap-3">
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
            done ? "bg-[rgba(52,211,153,0.15)]" : "bg-[rgba(46,139,255,0.12)]"
          }`}
        >
          {done ? (
            <Check className="h-4 w-4 text-[var(--gain)]" strokeWidth={3} />
          ) : (
            <Loader2
              className={`h-4 w-4 text-[var(--accent-hi)] ${reduce ? "" : "animate-spin"}`}
            />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--text-hi)]">
            {done ? "Confirmed" : "Awaiting confirmations"}
          </p>
          <p className="tabular mt-0.5 text-xs text-[var(--text-low)]">
            {seen} of {blocks} blocks
          </p>
        </div>
      </div>

      <div
        className="mt-3.5 flex gap-1.5"
        role="progressbar"
        aria-valuenow={seen}
        aria-valuemin={0}
        aria-valuemax={blocks}
        aria-label="Network confirmations"
      >
        {Array.from({ length: blocks }, (_, i) => (
          <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-[rgba(5,7,15,0.7)]">
            <motion.div
              className="h-full rounded-full"
              style={{
                background:
                  i < seen
                    ? "linear-gradient(90deg, var(--accent), var(--accent-soft))"
                    : "transparent",
              }}
              initial={reduce ? false : { width: 0 }}
              animate={{ width: i < seen ? "100%" : "0%" }}
              transition={{ duration: reduce ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-[var(--text-low)]">
        Simulated in this preview build. Live confirmations require the chain watcher in the
        production backend.
      </p>
    </div>
  );
}
