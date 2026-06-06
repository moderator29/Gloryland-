import { Gift } from "lucide-react";
import { hasUsedFirstDepositGift } from "@/lib/firstDeposit";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function FirstDepositGift({ className = "" }: { className?: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(!hasUsedFirstDepositGift());
  }, []);

  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`flex items-center gap-3 rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-3 ${className}`}
    >
      <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 ring-1 ring-primary/40">
        <Gift className="h-4 w-4 text-primary" />
      </span>
      <div className="flex-1">
        <p className="text-sm font-medium">
          <span className="text-gradient-gold font-bold">1.5x</span> your first day
        </p>
        <p className="text-[11px] text-muted-foreground">
          Welcome gift. Activates on your first deposit.
        </p>
      </div>
    </motion.div>
  );
}
