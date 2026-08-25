import { motion } from "framer-motion";
import { Hexagon } from "lucide-react";
import type { Tier, TierId } from "@/domain/tiers";
import { money } from "@/components/system/format";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * TierBadge: where the member stands on the ladder, in one compact mark.
 *
 * Standing is not decided here. The caller passes the tier the ledger derived
 * from lifetime contribution (`snap.tier`), and a member below the first entry
 * threshold is shown as unranked rather than being flattered into Core.
 *
 * Colour is the only thing that changes with rank, and it stays inside the
 * blue family: deep and quiet at Core, bright cyan at Sovereign.
 */

export type TierBadgeProps = {
  /** The member's tier, or null when they have not reached the first entry. */
  tier: Tier | null;
  size?: "sm" | "md";
  /** Show the entry threshold under the name. Ignored at size "sm". */
  showEntry?: boolean;
  className?: string;
};

/**
 * Gradient stops per rank, walking the blue ramp from deep to cyan. Every stop
 * is an existing design token, so the badge introduces no new colour.
 */
const RAMP: Record<TierId, [string, string]> = {
  core: ["var(--accent-deep)", "var(--accent)"],
  signal: ["var(--accent-deep)", "var(--accent-hi)"],
  vector: ["var(--accent)", "var(--accent-hi)"],
  apex: ["var(--accent)", "var(--accent-soft)"],
  meridian: ["var(--accent-hi)", "var(--accent-soft)"],
  sovereign: ["var(--accent-hi)", "var(--accent-cyan)"],
};

export function TierBadge({
  tier,
  size = "md",
  showEntry = false,
  className = "",
}: TierBadgeProps) {
  const reduce = useReducedMotion();
  const pad = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  if (!tier) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[rgba(5,7,15,0.5)] font-semibold text-[var(--text-mid)] ${pad} ${className}`}
        aria-label="Tier standing: unranked"
      >
        <Hexagon className="h-3 w-3 shrink-0" strokeWidth={1.9} aria-hidden="true" />
        Unranked
      </span>
    );
  }

  const [from, to] = RAMP[tier.id];

  return (
    <motion.span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full font-semibold ${pad} ${className}`}
      style={{
        background: `linear-gradient(100deg, ${from}, ${to})`,
        color: "var(--ink-000)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.24)",
      }}
      initial={reduce ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={reduce ? { duration: 0 } : { duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      aria-label={`Tier standing: ${tier.name}, rank ${tier.rank} of 6`}
    >
      <Hexagon className="h-3 w-3 shrink-0" strokeWidth={2.2} aria-hidden="true" />
      <span className="truncate">{tier.name}</span>
      {showEntry && size !== "sm" && (
        <span className="tabular opacity-70">{money(tier.entry)}+</span>
      )}
    </motion.span>
  );
}
