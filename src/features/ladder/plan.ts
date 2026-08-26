/**
 * Planning the next position.
 *
 * A position that is already running cannot be changed. Its principal was
 * fixed the moment it opened and every figure it produces follows from that
 * one number, so nothing here edits a live position. What this file plans is
 * the next one: where a candidate amount lands on the ladder, and what it
 * would add to the accrual already running.
 *
 * No figure is invented, and no figure here assumes a length. There is no term
 * and no maturity, so how long capital stays in place is the member's decision
 * and never this module's: every total is either per day or takes a day count
 * as an argument. Rates and entries come from the tier ladder, the member's
 * side comes from the derived snapshot, and the functions are pure, so the
 * same inputs always produce the same output.
 */

import { type Snapshot } from "@/domain/ledger";
import {
  TIERS,
  dailyReward,
  nextTier as tierAbove,
  tierForAmount,
  type Tier,
} from "@/domain/tiers";

/** The smallest position that can be opened: the first rung's entry. */
export const MINIMUM_PLACEMENT = TIERS[0].entry;

/** The last rung on the ladder. */
export const TOP_TIER = TIERS[TIERS.length - 1];

function safe(n: number): number {
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/* ── A candidate placement ──────────────────────────────────────────────── */

export type Plan = {
  /** The candidate amount, floored at zero. */
  amount: number;
  /** The rung this amount clears, or null below the first entry. */
  tier: Tier | null;
  /** Whether a vault can actually be opened at this amount. */
  openable: boolean;
  /** The rung above the one this amount clears, or null at the top. */
  nextTier: Tier | null;
  /** Capital between this amount and the next rung's entry. Zero at the top. */
  gapToNext: number;
  /** Reward this amount accrues per day. */
  daily: number;
  /** When accrual would start, which is the clock passed in. */
  opensAt: number;
  /** Daily accrual across the positions already open. */
  currentDaily: number;
  /** What that daily accrual becomes with this position running beside them. */
  combinedDaily: number;
};

/**
 * What a candidate amount does, read against what the member already has
 * running. `currentDaily` is the snapshot's own figure, so a closed position
 * that has stopped accruing is already excluded from it.
 */
export function planFor(snap: Snapshot, amount: number, from: number = Date.now()): Plan {
  const value = safe(amount);
  const tier = tierForAmount(value);
  const above = tierAbove(tier?.id ?? null);
  const daily = dailyReward(value);

  return {
    amount: value,
    tier,
    openable: value >= MINIMUM_PLACEMENT,
    nextTier: above,
    gapToNext: above ? Math.max(0, above.entry - value) : 0,
    daily,
    opensAt: from,
    currentDaily: snap.dailyRate,
    combinedDaily: snap.dailyRate + daily,
  };
}

/* ── The rungs still above the member ───────────────────────────────────── */

export type LadderStep = {
  tier: Tier;
  /** Contribution still required to stand at this rung. Always above zero. */
  gap: number;
  /**
   * What the member would actually place. A vault cannot be opened below the
   * first entry, so a gap smaller than that rounds up to it and the row says
   * so rather than naming an amount the deposit form would reject.
   */
  placement: number;
  /** True when the gap was rounded up to reach the minimum placement. */
  roundedUp: boolean;
  /** Reward that placement accrues per day. */
  daily: number;
  /** Daily accrual across every open position once that placement is running. */
  combinedDaily: number;
};

/**
 * Every rung above the member's current standing, with the capital it costs
 * to get there.
 *
 * Standing is measured on lifetime contribution rather than on any single
 * position, which is why the gap is read against `snap.contributed`. Several
 * smaller placements reach the same rung as one large one.
 */
export function ladderSteps(snap: Snapshot): LadderStep[] {
  const standing = snap.tier?.rank ?? 0;

  return TIERS.filter((t) => t.rank > standing).map((tier) => {
    const gap = Math.max(0, tier.entry - snap.contributed);
    // Ceil the gap so the placement genuinely clears the entry rather than
    // landing a fraction of a dollar short of it.
    const placement = Math.max(Math.ceil(gap), MINIMUM_PLACEMENT);
    const daily = dailyReward(placement);

    return {
      tier,
      gap,
      placement,
      roundedUp: Math.ceil(gap) < MINIMUM_PLACEMENT,
      daily,
      combinedDaily: snap.dailyRate + daily,
    };
  });
}

/**
 * The most legs a total can be split into with every leg still large enough
 * to open. Lets a view offer only the divisions that can actually be placed.
 */
export function maxParts(total: number): number {
  return Math.max(1, Math.floor(safe(total) / MINIMUM_PLACEMENT));
}
