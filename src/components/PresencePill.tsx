import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye } from "lucide-react";

function next(prev: number) {
  const drift = Math.floor(Math.random() * 5) - 2;
  return Math.max(6, Math.min(48, prev + drift));
}

export function PresencePill() {
  const [count, setCount] = useState(() => 9 + Math.floor(Math.random() * 14));

  useEffect(() => {
    const id = window.setInterval(() => setCount(next), 4000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <motion.span
      key={count}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/5 px-2.5 py-1 text-[10px] uppercase tracking-wider text-success"
    >
      <span className="relative grid h-2 w-2 place-items-center">
        <span className="absolute inset-0 rounded-full bg-success pulse-gold" />
        <span className="relative h-2 w-2 rounded-full bg-success" />
      </span>
      <Eye className="h-3 w-3" />
      <span className="font-numeric">{count}</span>
      <span>viewing now</span>
    </motion.span>
  );
}
