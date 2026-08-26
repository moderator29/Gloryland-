/**
 * Tier ladder and the economics behind it.
 *
 * One rule governs every tier: capital placed into a vault accrues 30% of its
 * principal per day, every day, for as long as it is left in place. There is
 * no term and no maturity date. A position opened today and left alone for
 * four months accrues for four months.
 *
 * Tiers do not differ on rate. They differ on how fast the desk targets a
 * withdrawal request and on what standing unlocks. Keeping the rate uniform
 * means the number on screen is always the same structure, and progression is
 * about what a member unlocks rather than a better yield.
 *
 * Liquidity is a window rather than a maturity. A member may request a
 * withdrawal once every four days. That interval is a property of the
 * programme, not of a rung: it is identical at the bottom and at the top.
 */

/** Fraction of principal earned per day, on every rung, without exception. */
export const DAILY_RATE = 0.3;

/**
 * Days between one withdrawal request and the next one a member may make.
 *
 * The window is the only thing standing between capital and cash, so it lives
 * beside the rate rather than inside a component. A member who has never
 * withdrawn is inside the window already: the interval measures the gap after
 * a withdrawal, and there is no gap before the first one.
 */
export const WITHDRAW_INTERVAL_DAYS = 4;

export type TierId =
  | "core"
  | "signal"
  | "beacon"
  | "vector"
  | "compass"
  | "sextant"
  | "azimuth"
  | "bearing"
  | "apex"
  | "meridian"
  | "quadrant"
  | "vernier"
  | "astrolabe"
  | "lodestar"
  | "parallax"
  | "zenith"
  | "prism"
  | "lumen"
  | "polaris"
  | "sovereign";

export type Tier = {
  id: TierId;
  name: string;
  entry: number;
  /** Ordinal position in the ladder, 1-indexed. */
  rank: number;
  blurb: string;
  /**
   * What this rung adds over the one below it.
   *
   * Settlement is deliberately absent from this list. It is the one thing
   * every rung changes, `settlementHours` is the single source for it, and a
   * hand written copy drifted: Vector said "48h settlement" in its benefits
   * while its target was 36 hours, so the tier card and the insight quoting
   * the same rung disagreed on screen. Surfaces render the derived line from
   * `settlementHours` instead, and a test keeps an hour figure out of here.
   *
   * The rate is absent for the same reason. It is one constant, it is the
   * same on all twenty rungs, and a rung that printed it would be a second
   * place it could drift from.
   */
  benefits: string[];
  /** Hours the desk targets for a withdrawal request at this tier. */
  settlementHours: number;
};

/**
 * The settlement line for a rung, derived rather than written.
 *
 * Every surface that mentions a target reads this, so there is exactly one
 * place a settlement claim can come from.
 */
export function settlementNote(tier: Tier): string {
  return `Withdrawal requests targeted inside ${tier.settlementHours} hours`;
}

export const TIERS: Tier[] = [
  {
    id: "core",
    name: "Core",
    entry: 300,
    rank: 1,
    blurb: "Entry into the vault programme, on the same rate as every rung above it.",
    benefits: ["Daily accrual from the day capital lands", "The whole ladder visible from day one"],
    settlementHours: 72,
  },
  {
    id: "signal",
    name: "Signal",
    entry: 500,
    rank: 2,
    blurb: "Adds performance analytics across your open positions.",
    benefits: ["Everything in Core", "Performance analytics"],
    settlementHours: 66,
  },
  {
    id: "beacon",
    name: "Beacon",
    entry: 750,
    rank: 3,
    blurb: "Adds reward projections worked from the published rate.",
    benefits: ["Everything in Signal", "Reward projections"],
    settlementHours: 60,
  },
  {
    id: "vector",
    name: "Vector",
    entry: 1000,
    rank: 4,
    blurb: "Adds portfolio intelligence across everything you hold.",
    benefits: ["Everything in Beacon", "Portfolio intelligence"],
    settlementHours: 54,
  },
  {
    id: "compass",
    name: "Compass",
    entry: 1500,
    rank: 5,
    blurb: "Adds the withdrawal window planner.",
    benefits: ["Everything in Vector", "Withdrawal window planner"],
    settlementHours: 48,
  },
  {
    id: "sextant",
    name: "Sextant",
    entry: 2000,
    rank: 6,
    blurb: "Adds management of several vaults at once.",
    benefits: ["Everything in Compass", "Multi vault management"],
    settlementHours: 44,
  },
  {
    id: "azimuth",
    name: "Azimuth",
    entry: 3000,
    rank: 7,
    blurb: "Adds placement rhythms, so capital enters on a plan.",
    benefits: ["Everything in Sextant", "Placement rhythms"],
    settlementHours: 40,
  },
  {
    id: "bearing",
    name: "Bearing",
    entry: 4000,
    rank: 8,
    blurb: "Adds provenance exports for every figure the ledger derives.",
    benefits: ["Everything in Azimuth", "Provenance exports"],
    settlementHours: 36,
  },
  {
    id: "apex",
    name: "Apex",
    entry: 5000,
    rank: 9,
    blurb: "Adds priority placement in the withdrawal queue.",
    benefits: ["Everything in Bearing", "Priority queue"],
    settlementHours: 32,
  },
  {
    id: "meridian",
    name: "Meridian",
    entry: 6500,
    rank: 10,
    blurb: "Adds dedicated coverage from the desk.",
    benefits: ["Everything in Apex", "Dedicated coverage"],
    settlementHours: 28,
  },
  {
    id: "quadrant",
    name: "Quadrant",
    entry: 8000,
    rank: 11,
    blurb: "Adds a named contact who knows the account.",
    benefits: ["Everything in Meridian", "Named desk contact"],
    settlementHours: 24,
  },
  {
    id: "vernier",
    name: "Vernier",
    entry: 10000,
    rank: 12,
    blurb: "Adds an allowlist, so capital can only leave to addresses you fixed.",
    benefits: ["Everything in Quadrant", "Withdrawal address allowlist"],
    settlementHours: 21,
  },
  {
    id: "astrolabe",
    name: "Astrolabe",
    entry: 12500,
    rank: 13,
    blurb: "Adds reporting cut the way you need to read it.",
    benefits: ["Everything in Vernier", "Custom reporting"],
    settlementHours: 18,
  },
  {
    id: "lodestar",
    name: "Lodestar",
    entry: 15000,
    rank: 14,
    blurb: "Adds early access to instruments before they open generally.",
    benefits: ["Everything in Astrolabe", "Early access to new instruments"],
    settlementHours: 15,
  },
  {
    id: "parallax",
    name: "Parallax",
    entry: 18000,
    rank: 15,
    blurb: "Adds a quarterly review of the whole position with the desk.",
    benefits: ["Everything in Lodestar", "Quarterly portfolio review"],
    settlementHours: 12,
  },
  {
    id: "zenith",
    name: "Zenith",
    entry: 22000,
    rank: 16,
    blurb: "Adds a second signature on every withdrawal that leaves the account.",
    benefits: ["Everything in Parallax", "Co-signed withdrawal approval"],
    settlementHours: 10,
  },
  {
    id: "prism",
    name: "Prism",
    entry: 26000,
    rank: 17,
    blurb: "Adds a wider set of assets and networks to move capital on.",
    benefits: ["Everything in Zenith", "Wider asset and network coverage"],
    settlementHours: 8,
  },
  {
    id: "lumen",
    name: "Lumen",
    entry: 30000,
    rank: 18,
    blurb: "Adds a direct line to the desk rather than a queue.",
    benefits: ["Everything in Prism", "Direct line to the desk"],
    settlementHours: 6,
  },
  {
    id: "polaris",
    name: "Polaris",
    entry: 35000,
    rank: 19,
    blurb: "Adds first call on new capacity as it opens.",
    benefits: ["Everything in Lumen", "Priority on new capacity"],
    settlementHours: 4,
  },
  {
    id: "sovereign",
    name: "Sovereign",
    entry: 40000,
    rank: 20,
    blurb: "The full programme, arranged privately around the account.",
    benefits: ["Everything in Polaris", "Private arrangements"],
    settlementHours: 2,
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

/** Reward per day for a position of this size. */
export function dailyReward(principal: number): number {
  return principal * DAILY_RATE;
}

/**
 * Reward a position of this size accrues over a stretch of days.
 *
 * The number of days is always an argument. Nothing in the product may assume
 * a length, because there is no term: how long a position runs is entirely the
 * member's choice, and a function that picked a default would be inventing
 * one on their behalf.
 */
export function rewardOver(principal: number, days: number): number {
  return principal * DAILY_RATE * Math.max(0, days);
}
