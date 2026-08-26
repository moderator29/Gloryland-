/**
 * Planning the next position.
 *
 * A term that is already running cannot be changed. Its principal was fixed
 * the moment it opened and every figure it produces follows from that one
 * number, so nothing here edits a live position. What this file plans is the
 * next one: where a candidate amount lands on the ladder, what it would add
 * to the accrual already running, and what a total looks like when it is
 * staged into several terms instead of placed as one.
 *
 * No figure is invented. Rates, entries and term length come from the tier
 * ladder, and the member's side of every calculation comes from the derived
 * snapshot. Pure functions only: no React, no storage, and the clock is a
 * parameter so the same inputs always produce the same output.
 */

import { DAY_MS, type Snapshot } from "@/domain/ledger";
import {
  CYCLE_DAYS,
  TIERS,
  dailyReward,
  nextTier as tierAbove,
  termReward,
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
  /** Reward this amount returns across one full term. */
  term: number;
  /** Principal plus term reward: what the position releases at maturity. */
  atMaturity: number;
  /** When the term would start, which is the clock passed in. */
  opensAt: number;
  /** Thirty days on from that start. */
  maturesAt: number;
  /** Daily accrual across the positions already open. */
  currentDaily: number;
  /** What that daily accrual becomes with this position running beside them. */
  combinedDaily: number;
};

/**
 * What a candidate amount does, read against what the member already has
 * running. `currentDaily` is the snapshot's own figure, so a matured position
 * that has stopped accruing is already excluded from it.
 */
export function planFor(snap: Snapshot, amount: number, from: number = Date.now()): Plan {
  const value = safe(amount);
  const tier = tierForAmount(value);
  const above = tierAbove(tier?.id ?? null);
  const daily = dailyReward(value);
  const term = termReward(value);

  return {
    amount: value,
    tier,
    openable: value >= MINIMUM_PLACEMENT,
    nextTier: above,
    gapToNext: above ? Math.max(0, above.entry - value) : 0,
    daily,
    term,
    atMaturity: value + term,
    opensAt: from,
    maturesAt: from + CYCLE_DAYS * DAY_MS,
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
  /** Reward that placement returns across one full term. */
  term: number;
  /** Principal plus term reward for that placement. */
  atMaturity: number;
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
    const term = termReward(placement);

    return {
      tier,
      gap,
      placement,
      roundedUp: Math.ceil(gap) < MINIMUM_PLACEMENT,
      daily,
      term,
      atMaturity: placement + term,
      combinedDaily: snap.dailyRate + daily,
    };
  });
}

/* ── Staging a total across the term ────────────────────────────────────── */

export type StaggerLeg = {
  /** Position in the sequence, 1-indexed. */
  step: number;
  amount: number;
  opensAt: number;
  maturesAt: number;
  daily: number;
  /** Reward across the full term. */
  reward: number;
  /** Principal plus reward: what this leg releases at maturity. */
  releases: number;
  /** Whether this leg clears the first entry, so it could be opened at all. */
  openable: boolean;
  tier: Tier | null;
};

export type StaggerPlan = {
  total: number;
  /** How many terms the total was split across. */
  parts: number;
  legs: StaggerLeg[];
  /** Days between one maturity and the next once the ladder is running. */
  spacingDays: number;
  /** Reward summed across every leg. */
  reward: number;
  /** Principal plus reward summed across every leg. */
  releases: number;
  /** True when every leg clears the first entry. */
  viable: boolean;
  /** The same total placed at once, which is what staging is measured against. */
  single: StaggerLeg;
};

function buildLeg(step: number, amount: number, opensAt: number): StaggerLeg {
  const reward = termReward(amount);
  return {
    step,
    amount,
    opensAt,
    maturesAt: opensAt + CYCLE_DAYS * DAY_MS,
    daily: dailyReward(amount),
    reward,
    releases: amount + reward,
    openable: amount >= MINIMUM_PLACEMENT,
    tier: tierForAmount(amount),
  };
}

/**
 * A total split into `parts` positions opened at even intervals across one
 * term, so maturities arrive on a rolling schedule instead of on a single day.
 *
 * The rate is the same on every leg, so the reward is identical either way.
 * What staging changes is when capital comes back, and `single` is carried on
 * the plan so a view can show both readings side by side rather than implying
 * the ladder earns more.
 */
export function stagger(total: number, parts: number, from: number = Date.now()): StaggerPlan {
  const sum = safe(total);
  // A term is thirty days, so it cannot be divided into more legs than days.
  const n = Math.min(Math.max(Math.floor(safe(parts)) || 1, 1), CYCLE_DAYS);
  const spacingDays = CYCLE_DAYS / n;

  // Whole dollars per leg, with the remainder carried by the first placement
  // so the legs add up to exactly the total the member named.
  const base = Math.floor(sum / n);
  const remainder = sum - base * n;

  const legs = Array.from({ length: n }, (_, i) =>
    buildLeg(i + 1, i === 0 ? base + remainder : base, from + Math.round(i * spacingDays * DAY_MS)),
  );

  return {
    total: sum,
    parts: n,
    legs,
    spacingDays,
    reward: legs.reduce((s, l) => s + l.reward, 0),
    releases: legs.reduce((s, l) => s + l.releases, 0),
    viable: legs.every((l) => l.openable),
    single: buildLeg(1, sum, from),
  };
}

/**
 * The most legs a total can be split into with every leg still large enough
 * to open. Lets a view offer only the divisions that can actually be placed.
 */
export function maxParts(total: number): number {
  return Math.max(1, Math.floor(safe(total) / MINIMUM_PLACEMENT));
}
