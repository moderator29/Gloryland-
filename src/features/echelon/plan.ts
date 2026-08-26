/**
 * Echelon: what splitting one sum into placements days apart now costs.
 *
 * This module used to plan a formation. One sum placed as several terms that
 * started days apart returned capital on several dates instead of one, and the
 * whole argument was the stagger of those maturities: same total reward either
 * way, but less riding on any single date.
 *
 * That argument is gone, and it is worth saying why rather than quietly
 * reshaping the surface around a new one.
 *
 * 1. There are no maturities. A position accrues from the day it opens and
 *    keeps accruing until the member closes it, so no capital "comes back" on
 *    a date, and there are no dates to stagger.
 * 2. Liquidity is a member level window, not a position level one. A
 *    withdrawal may be requested once every four days regardless of how many
 *    positions are open, so splitting a sum buys no extra access to cash.
 * 3. Because accrual starts at the placement, capital that waits to be placed
 *    earns nothing while it waits. A leg opened five days late has five days
 *    of accrual it will never recover, and since both plans accrue at the same
 *    rate from then on, the gap never closes.
 *
 * So the honest form of this module is not a planner. It is the arithmetic of
 * what a stagger costs, stated plainly enough that a member can decide against
 * it. Nothing here recommends splitting a sum, and the surface that renders it
 * says the same.
 *
 * Pure. No React, no storage, and the clock is a parameter, so the same inputs
 * always produce the same output.
 *
 * The ladder planner is imported by path rather than through its barrel,
 * because that barrel also exports React components and nothing here should
 * pull a component into a module that is meant to be arithmetic.
 */

import { DAY_MS } from "@/domain/ledger";
import {
  DAILY_RATE,
  WITHDRAW_INTERVAL_DAYS,
  dailyReward,
  tierForAmount,
  type Tier,
} from "@/domain/tiers";
import { MINIMUM_PLACEMENT, maxParts } from "@/features/ladder/plan";
import { money } from "@/components/system/format";

/** One leg is a placement, not a formation. */
export const MIN_LEGS = 2;

/** The tightest spacing worth expressing. Accrual is quoted by the day. */
export const MIN_SPACING_DAYS = 1;

/**
 * The widest spacing the planner will model.
 *
 * A calendar month, chosen so the cost of a long delay can be shown rather
 * than because anything in the model changes there. Nothing happens on day 30.
 */
export const MAX_SPACING_DAYS = 30;

function safe(n: number): number {
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n;
}

/** Leg counts worth offering for a total, cut off by the minimum placement. */
export function legChoices(total: number, upTo = 6): number[] {
  const limit = Math.min(maxParts(total), upTo);
  const out: number[] = [];
  for (let n = MIN_LEGS; n <= limit; n++) out.push(n);
  return out;
}

/** Spacings worth offering, in whole days so every date on screen is a date. */
export function spacingChoices(): number[] {
  return [1, 2, 3, WITHDRAW_INTERVAL_DAYS, 7, 14, 30].filter(
    (n, i, a) => a.indexOf(n) === i && n >= MIN_SPACING_DAYS && n <= MAX_SPACING_DAYS,
  );
}

/* ── Whether a split can actually be placed ─────────────────────────────── */

export type EchelonProblem = "total" | "legs" | "spacing";

export type Validity = {
  ok: boolean;
  problems: EchelonProblem[];
  /** One sentence per problem, in the member's terms, in the same order. */
  reasons: string[];
  /** The most legs this total supports with every leg still openable. */
  maxLegs: number;
  /** The smallest leg this split produces. */
  smallestLeg: number;
  /** What every leg has to clear. */
  minimum: number;
  maxSpacingDays: number;
};

/**
 * Why a split is not placeable, said plainly rather than by disabling a button
 * and leaving the member to guess.
 *
 * A leg under the minimum and more legs than the total supports are the same
 * condition read two ways, since the smallest leg is the total divided by the
 * legs, so they are reported once with both figures named.
 */
export function validate(total: number, parts: number, spacingDays: number): Validity {
  const sum = safe(total);
  const n = Math.floor(safe(parts));
  const spacing = safe(spacingDays);
  const maxLegs = Math.floor(sum / MINIMUM_PLACEMENT);
  // Leg one carries the remainder, so the base is the smallest leg there is.
  const smallestLeg = n > 0 ? Math.floor(sum / n) : 0;

  const problems: EchelonProblem[] = [];
  const reasons: string[] = [];

  if (sum < MINIMUM_PLACEMENT) {
    problems.push("total");
    reasons.push(
      `${money(MINIMUM_PLACEMENT)} is the smallest position Rigel opens, so a total under it cannot be placed at all, as one leg or as several.`,
    );
  } else if (maxLegs < MIN_LEGS) {
    problems.push("legs");
    reasons.push(
      `${money(sum)} cannot be split. A second leg would fall under the ${money(MINIMUM_PLACEMENT)} minimum.`,
    );
  } else if (n < MIN_LEGS) {
    problems.push("legs");
    reasons.push("A split needs at least two legs. One leg is a single placement.");
  } else if (n > maxLegs) {
    problems.push("legs");
    reasons.push(
      `${money(sum)} splits ${maxLegs} ways at most. At ${n} legs the smallest is ${money(smallestLeg)}, under the ${money(MINIMUM_PLACEMENT)} minimum.`,
    );
  }

  if (spacing < MIN_SPACING_DAYS) {
    problems.push("spacing");
    reasons.push(
      "Accrual is quoted by the day, so legs less than a day apart open on the same day. Space them at least one day.",
    );
  } else if (spacing > MAX_SPACING_DAYS) {
    problems.push("spacing");
    reasons.push(
      `The planner models spacings up to ${MAX_SPACING_DAYS} days. Past that the cost simply keeps growing at the same rate, so there is nothing new to show.`,
    );
  }

  return {
    ok: problems.length === 0,
    problems,
    reasons,
    maxLegs,
    smallestLeg,
    minimum: MINIMUM_PLACEMENT,
    maxSpacingDays: MAX_SPACING_DAYS,
  };
}

/* ── The legs ───────────────────────────────────────────────────────────── */

export type EchelonLeg = {
  /** Position in the sequence, 1-indexed. */
  step: number;
  amount: number;
  tier: Tier | null;
  /** Days from the plan's anchor until this leg would be placed. */
  offsetDays: number;
  opensAt: number;
  /** What this leg accrues per day once it is placed. */
  daily: number;
  /**
   * Accrual this leg never earns because it waited.
   *
   * A permanent shortfall rather than a temporary one: once the leg is open,
   * it accrues at exactly the rate it would have accrued at on day one, so the
   * days it sat out are never made up.
   */
  forgone: number;
  /** Whether this leg clears the first entry, so it could be opened at all. */
  openable: boolean;
  /** The date has arrived, so this leg would be placed now. */
  due: boolean;
  /** Time until the date. Zero once the leg is due. */
  opensIn: number;
};

/* ── The comparison ─────────────────────────────────────────────────────── */

export type Comparison = {
  /** What the whole sum accrues per day once every leg is placed. */
  dailyWhenComplete: number;
  /** What the same sum accrues per day placed today, which is the same figure. */
  dailyAtOnce: number;
  /** Days from the first leg to the last. */
  lagDays: number;
  /**
   * Total accrual the stagger gives up, summed across the legs that waited.
   *
   * The whole comparison, in one number. It is not recovered later: from the
   * day the last leg opens both plans hold the same principal and accrue at
   * the same rate, so the gap is fixed at exactly this figure forever.
   */
  forgone: number;
  /** That shortfall expressed as days of the full sum's own accrual. */
  forgoneDays: number;
  /** Principal that is out of the market on the first day, and on the last. */
  deployedOnDayOne: number;
  /** Withdrawal windows either way. The same, because the window is per member. */
  withdrawIntervalDays: number;
};

export type EchelonPlan = {
  total: number;
  parts: number;
  spacingDays: number;
  /** When leg one would be placed, which is the plan's anchor. */
  from: number;
  /** The clock this reading was taken against. */
  now: number;
  legs: EchelonLeg[];
  /** Legs whose date has arrived. */
  due: EchelonLeg[];
  /** Legs whose date is still ahead. Planned, not scheduled. */
  planned: EchelonLeg[];
  /** The earliest leg that is due, or null before the anchor. */
  next: EchelonLeg | null;
  compare: Comparison;
  validity: Validity;
};

/**
 * Split a total into whole dollar legs, remainder on leg one.
 *
 * Leg one carries the remainder so the legs add up to exactly the total the
 * member named. Anything else would show a plan that places a different sum
 * from the one they typed.
 */
function split(total: number, parts: number): number[] {
  const base = Math.floor(total / parts);
  const remainder = total - base * parts;
  return Array.from({ length: parts }, (_, i) => (i === 0 ? base + remainder : base));
}

/**
 * Model a total placed as several legs `spacingDays` apart, and what that
 * costs against placing it at once.
 *
 * Two clocks, because a plan outlives the moment it was made. `from` anchors
 * leg one, and `now` is when the plan is being read, so a member who returns a
 * week later sees leg two come due rather than the whole schedule sliding
 * forward to meet them.
 *
 * Nothing here is scheduled. A leg opens when the member opens it.
 */
export function echelon(
  total: number,
  parts: number,
  spacingDays: number,
  from: number = Date.now(),
  now: number = from,
): EchelonPlan {
  const validity = validate(total, parts, spacingDays);
  const sum = safe(total);
  const n = Math.max(1, Math.floor(safe(parts)) || 1);
  const spacing = clamp(safe(spacingDays), MIN_SPACING_DAYS, MAX_SPACING_DAYS);

  const legs: EchelonLeg[] = split(sum, n).map((amount, i) => {
    const offsetDays = i * spacing;
    const opensAt = from + Math.round(offsetDays * DAY_MS);
    return {
      step: i + 1,
      amount,
      tier: tierForAmount(amount),
      offsetDays,
      opensAt,
      daily: dailyReward(amount),
      // The days this leg sat out, at the rate it will earn once it is in.
      forgone: amount * DAILY_RATE * offsetDays,
      openable: amount >= MINIMUM_PLACEMENT,
      due: now >= opensAt,
      opensIn: Math.max(0, opensAt - now),
    };
  });

  const due = legs.filter((l) => l.due);
  const forgone = legs.reduce((s, l) => s + l.forgone, 0);
  const dailyAtOnce = dailyReward(sum);

  return {
    total: sum,
    parts: n,
    spacingDays: spacing,
    from,
    now,
    legs,
    due,
    planned: legs.filter((l) => !l.due),
    next: due[0] ?? null,
    compare: {
      dailyWhenComplete: dailyAtOnce,
      dailyAtOnce,
      lagDays: (n - 1) * spacing,
      forgone,
      // Reward is principal times the rate times the days, so dividing the
      // shortfall by what the whole sum earns in a day gives back the days.
      // One derivation, two readings.
      forgoneDays: dailyAtOnce > 0 ? forgone / dailyAtOnce : 0,
      deployedOnDayOne: legs[0]?.amount ?? 0,
      withdrawIntervalDays: WITHDRAW_INTERVAL_DAYS,
    },
    validity,
  };
}
