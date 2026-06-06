import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, MapPin } from "lucide-react";

const NAMES = [
  "Sara",
  "Marcus",
  "Aisha",
  "Diego",
  "Yuki",
  "Lena",
  "Kwame",
  "Priya",
  "Niko",
  "Maya",
  "Omar",
  "Inez",
];
const CITIES = [
  "London",
  "Lagos",
  "Tokyo",
  "Berlin",
  "Dubai",
  "Mumbai",
  "Sao Paulo",
  "Mexico City",
  "Singapore",
  "Toronto",
  "Cape Town",
  "Madrid",
];

type Item = {
  id: number;
  name: string;
  city: string;
  amount: number;
  ago: string;
};

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeItem(id: number): Item {
  const amounts = [820, 1240, 1980, 2400, 3120, 4820, 6450, 8900];
  return {
    id,
    name: pick(NAMES),
    city: pick(CITIES),
    amount: pick(amounts),
    ago: `${Math.floor(Math.random() * 50) + 8}s ago`,
  };
}

export function LiveWithdrawals() {
  const [items, setItems] = useState<Item[]>(() => [makeItem(1), makeItem(2), makeItem(3)]);
  const [seed, setSeed] = useState(4);

  useEffect(() => {
    const id = window.setInterval(() => {
      setItems((prev) => [makeItem(seed), ...prev].slice(0, 3));
      setSeed((s) => s + 1);
    }, 4200);
    return () => window.clearInterval(id);
  }, [seed]);

  return (
    <div className="glass-luxury p-4">
      <div className="flex items-center justify-between">
        <span className="chip">
          <span className="h-1.5 w-1.5 rounded-full bg-success pulse-gold" />
          Live Withdrawals
        </span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Last hour
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        <AnimatePresence initial={false}>
          {items.map((it) => (
            <motion.li
              key={it.id}
              layout
              initial={{ opacity: 0, y: -10, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0)" }}
              exit={{ opacity: 0, y: 12, filter: "blur(4px)" }}
              transition={{ duration: 0.35 }}
              className="flex items-center gap-3 rounded-2xl border border-border/60 bg-black/40 px-3 py-2"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[#BF953F] to-[#B38728] text-[11px] font-bold text-black">
                {it.name[0]}
              </span>
              <div className="flex-1 text-sm">
                <p className="leading-tight">
                  <span className="font-medium">{it.name}</span>{" "}
                  <span className="text-muted-foreground">withdrew</span>{" "}
                  <span className="text-success">${it.amount.toLocaleString()}</span>
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {it.city} · {it.ago}
                </p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-success" />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
