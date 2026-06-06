import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const TIER_COLORS: Record<string, [string, string]> = {
  "Starter Plan": ["#9ca3af", "#e5e7eb"],
  "Bronze Plan": ["#a16207", "#fde68a"],
  "Silver Plan": ["#94a3b8", "#f1f5f9"],
  "Gold Plan": ["#d4af37", "#fcf6ba"],
  "Legendary Plan": ["#9333ea", "#f3e8ff"],
  "Immortal Plan": ["#ef4444", "#fee2e2"],
  "Platinum Plan": ["#cffafe", "#ffffff"],
};

export function TierEmber({ tier }: { tier: string }) {
  const reduce = useReducedMotion();
  const [c1, c2] = TIER_COLORS[tier] ?? TIER_COLORS["Gold Plan"];
  if (reduce) return null;

  const sparks = Array.from({ length: 6 });

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
      {sparks.map((_, i) => (
        <motion.span
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full"
          style={{
            background: `radial-gradient(circle, ${c2}, ${c1} 60%, transparent 80%)`,
            left: `${10 + i * 14}%`,
            bottom: "-8px",
            filter: "blur(0.5px)",
          }}
          animate={{
            y: [0, -120 - i * 10],
            opacity: [0, 0.9, 0],
            scale: [0.6, 1.2, 0.4],
          }}
          transition={{
            duration: 3 + i * 0.3,
            repeat: Infinity,
            delay: i * 0.5,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}
