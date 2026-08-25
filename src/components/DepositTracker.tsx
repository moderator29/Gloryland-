import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";

type Props = {
  active: boolean;
  onComplete?: () => void;
  totalConfirmations?: number;
  stepMs?: number;
};

export function DepositTracker({
  active,
  onComplete,
  totalConfirmations = 6,
  stepMs = 1400,
}: Props) {
  const [confirms, setConfirms] = useState(0);

  useEffect(() => {
    if (!active) {
      setConfirms(0);
      return;
    }
    setConfirms(0);
    const id = window.setInterval(() => {
      setConfirms((c) => {
        if (c + 1 >= totalConfirmations) {
          window.clearInterval(id);
          onComplete?.();
          return totalConfirmations;
        }
        return c + 1;
      });
    }, stepMs);
    return () => window.clearInterval(id);
  }, [active, totalConfirmations, stepMs, onComplete]);

  if (!active) return null;
  const done = confirms >= totalConfirmations;
  const pct = (confirms / totalConfirmations) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4 rounded-2xl border border-primary/40 bg-black/40 p-4"
    >
      <div className="flex items-center gap-3">
        {done ? (
          <CheckCircle2 className="h-5 w-5 text-success" />
        ) : (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        )}
        <div className="flex-1">
          <p className="text-sm font-medium">
            {done ? "Deposit confirmed" : "Awaiting confirmations"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {confirms} / {totalConfirmations} blocks
          </p>
        </div>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: "linear-gradient(to right, #B3902F, #F4E3AC, #A07C22)",
          }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <div className="mt-3 grid grid-cols-6 gap-1">
        {Array.from({ length: totalConfirmations }).map((_, i) => (
          <span
            key={i}
            className={`h-1 rounded-full transition-colors ${
              i < confirms ? "bg-primary" : "bg-white/10"
            }`}
          />
        ))}
      </div>
    </motion.div>
  );
}
