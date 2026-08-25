import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Crown } from "lucide-react";

const SUBS_KEY = "hal_subscribed_plans";

const TIER_RANK: Record<string, number> = {
  "Starter Plan": 1,
  "Bronze Plan": 2,
  "Silver Plan": 3,
  "Gold Plan": 4,
  "Legendary Plan": 5,
  "Immortal Plan": 6,
  "Platinum Plan": 7,
};

const TIER_GRADIENT: Record<string, string> = {
  "Starter Plan": "linear-gradient(135deg, #cbd5e1, #94a3b8)",
  "Bronze Plan": "linear-gradient(135deg, #fde68a, #a16207)",
  "Silver Plan": "linear-gradient(135deg, #f1f5f9, #94a3b8)",
  "Gold Plan": "linear-gradient(135deg, #F6E7B4, #E8C25C, #8A6A1E)",
  "Legendary Plan": "linear-gradient(135deg, #f3e8ff, #a855f7, #6b21a8)",
  "Immortal Plan": "linear-gradient(135deg, #fee2e2, #ef4444, #7f1d1d)",
  "Platinum Plan": "linear-gradient(135deg, #ffffff, #e0e7ff, #cffafe, #fef3c7)",
};

function readTopTier(): string | null {
  try {
    const list: string[] = JSON.parse(localStorage.getItem(SUBS_KEY) || "[]");
    if (!list.length) return null;
    return list.sort((a, b) => (TIER_RANK[b] ?? 0) - (TIER_RANK[a] ?? 0))[0];
  } catch {
    return null;
  }
}

export function TierBadge() {
  const [tier, setTier] = useState<string | null>(null);

  useEffect(() => {
    const read = () => setTier(readTopTier());
    read();
    window.addEventListener("focus", read);
    window.addEventListener("storage", read);
    const id = window.setInterval(read, 1500);
    return () => {
      window.removeEventListener("focus", read);
      window.removeEventListener("storage", read);
      window.clearInterval(id);
    };
  }, []);

  if (!tier) return null;
  const short = tier.replace(" Plan", "");

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-black/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md"
      style={{
        boxShadow: "0 0 16px -2px rgba(232,194,92,0.5), inset 0 1px 0 rgba(246,231,180,0.25)",
      }}
    >
      <span
        aria-hidden
        className="grid h-3.5 w-3.5 place-items-center rounded-full"
        style={{ background: TIER_GRADIENT[tier] ?? TIER_GRADIENT["Gold Plan"] }}
      >
        <Crown className="h-2 w-2 text-black/60" />
      </span>
      <span className="text-gradient-gold">{short}</span>
    </motion.div>
  );
}
