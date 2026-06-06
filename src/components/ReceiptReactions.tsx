import { useEffect, useState } from "react";
import { Heart, Flame, PartyPopper } from "lucide-react";
import { motion } from "framer-motion";
import { playTap } from "@/lib/sound";
import { tap as hapticTap } from "@/lib/haptic";

const KEY = "ec_receipt_reactions_v1";

type Reactions = Record<string, string[]>;

function read(): Reactions {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}
function write(data: Reactions) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

const OPTS = [
  { key: "fire", Icon: Flame, color: "#f97316" },
  { key: "love", Icon: Heart, color: "#ef4444" },
  { key: "party", Icon: PartyPopper, color: "#a855f7" },
];

export function ReceiptReactions({ receiptId }: { receiptId: string }) {
  const [active, setActive] = useState<string[]>([]);

  useEffect(() => {
    setActive(read()[receiptId] ?? []);
  }, [receiptId]);

  const toggle = (key: string) => {
    playTap();
    hapticTap();
    const all = read();
    const cur = new Set(all[receiptId] ?? []);
    if (cur.has(key)) cur.delete(key);
    else cur.add(key);
    all[receiptId] = Array.from(cur);
    write(all);
    setActive(all[receiptId]);
  };

  return (
    <div className="mt-2 flex items-center gap-1">
      {OPTS.map(({ key, Icon, color }) => {
        const on = active.includes(key);
        return (
          <motion.button
            key={key}
            onClick={() => toggle(key)}
            whileTap={{ scale: 0.85 }}
            animate={on ? { scale: [1, 1.25, 1] } : { scale: 1 }}
            className={`grid h-7 w-7 place-items-center rounded-full border transition-colors ${
              on
                ? "border-transparent bg-white/[0.06]"
                : "border-border/60 bg-transparent text-muted-foreground"
            }`}
            style={on ? { color } : undefined}
          >
            <Icon className="h-3.5 w-3.5" fill={on ? "currentColor" : "none"} />
          </motion.button>
        );
      })}
    </div>
  );
}
