/**
 * Tier ladder and the economics behind it.
 *
 * One rule governs every tier: capital placed into a vault accrues a fixed
 * 30% over a 30-day term, which is 1% of principal per day. Tiers do not
 * differ on rate — they differ on access, limits and service. Keeping the
 * rate uniform means the number on screen is always the same promise, and
 * progression is about what a member unlocks rather than a better yield.
 */

export const CYCLE_DAYS = 30;
export const CYCLE_RETURN = 0.3;
/** Fraction of principal earned per day. */
export const DAILY_RATE = CYCLE_RETURN / CYCLE_DAYS;

export type TierId = "core" | "signal" | "vector" | "apex" | "meridian" | "sovereign";

export type Tier = {
  id: TierId;
  name: string;
  entry: number;
  /** Ordinal position in the ladder, 1-indexed. */
  rank: number;
  blurb: string;
  benefits: string[];
  /** Hours the desk targets for a withdrawal request at this tier. */
  settlementHours: number;
};

export const TIERS: Tier[] = [
  {
    id: "core",
    name: "Core",
    entry: 400,
    rank: 1,
    blurb: "Entry into the vault programme with the full 30-day term.",
    benefits: ["Full 30% term rate", "Daily accrual", "Standard settlement"],
    settlementHours: 72,
  },
  {
    id: "signal",
    name: "Signal",
    entry: 1000,
    rank: 2,
    blurb: "Adds performance analytics and reward projections.",
    benefits: ["Everything in Core", "Performance analytics", "Reward projections"],
    settlementHours: 48,
  },
  {
    id: "vector",
    name: "Vector",
    entry: 3000,
    rank: 3,
    blurb: "Portfolio intelligence and faster settlement windows.",
    benefits: ["Everything in Signal", "Portfolio intelligence", "48h settlement"],
    settlementHours: 36,
  },
  {
    id: "apex",
    name: "Apex",
    entry: 5000,
    rank: 4,
    blurb: "Priority queue placement and multi-vault management.",
    benefits: ["Everything in Vector", "Priority queue", "Multi-vault management"],
    settlementHours: 24,
  },
  {
    id: "meridian",
    name: "Meridian",
    entry: 8000,
    rank: 5,
    blurb: "Dedicated coverage and early access to new vault terms.",
    benefits: ["Everything in Apex", "Dedicated coverage", "Early vault access"],
    settlementHours: 12,
  },
  {
    id: "sovereign",
    name: "Sovereign",
    entry: 10000,
    rank: 6,
    blurb: "The full programme: same-day settlement and private terms.",
    benefits: ["Everything in Meridian", "Same-day settlement", "Private terms"],
    settlementHours: 6,
  },
];

export function tierById(id: string): Tier | undefined {
  return TIERS.find((t) => t.id === id);
}

/** The highest tier a given amount of capital qualifies for. */
export function tierForAmount(amount: number): Tier | null {
  let match: Tier | null = null;
  for (const t of TIERS) if (amount >= t.entry) match = t;
  return match;
}

/** The next rung above a tier, or null at the top of the ladder. */
export function nextTier(id: TierId | null): Tier | null {
  if (!id) return TIERS[0];
  const t = tierById(id);
  if (!t) return TIERS[0];
  return TIERS.find((x) => x.rank === t.rank + 1) ?? null;
}

/** Reward a position of this size returns over one full term. */
export function termReward(principal: number): number {
  return principal * CYCLE_RETURN;
}

/** Reward per day for a position of this size. */
export function dailyReward(principal: number): number {
  return principal * DAILY_RATE;
}
