/**
 * Echelon: one sum placed as several terms that start days apart.
 *
 * A single placement of $3,000 returns $3,900 on one day and nothing on any
 * other day. The same $3,000 placed as six terms of $500, each opened five
 * days after the one before, returns $650 on six separate dates. The rate is
 * the same on every leg, so the total reward is the same too. What changes is
 * when capital is accessible and how much of it rides on any one date.
 *
 * The arithmetic that splits a total into legs is not repeated here. It lives
 * in `stagger` in the ladder planner, which already carries the rule that the
 * remainder rides on leg one so the legs sum to exactly the total the member
 * named. This module adds what `stagger` does not have: a spacing the member
 * chooses rather than one fixed by the number of legs, the dates that follow
 * from it, the combined accrual over time, the point where the schedule
 * settles into a rhythm, and the honest comparison against one placement.
 *
 * Pure. No React, no storage, and both clocks are parameters, so the same
 * inputs always produce the same output.
 *
 * The ladder planner is imported by path rather than through its barrel,
 * because that barrel also exports React components and nothing here should
 * pull a component into a module that is meant to be arithmetic.
 */

import { DAY_MS } from "@/domain/ledger";
import { CYCLE_DAYS, CYCLE_RETURN, DAILY_RATE, type Tier } from "@/domain/tiers";
import { MINIMUM_PLACEMENT, maxParts, stagger, type StaggerLeg } from "@/features/ladder/plan";
import { days, money } from "@/components/system/format";

/** One leg is a placement, not a formation. */
export const MIN_LEGS = 2;

/**
 * The widest spacing an echelon can use. Past one term, leg one has already
 * returned before leg two opens, so nothing overlaps and the formation is
 * really a sequence.
 */
export const MAX_SPACING_DAYS = CYCLE_DAYS;

/**
 * The tightest spacing worth offering. Rewards accrue by the day, so two legs
 * less than a day apart are a distinction the product cannot express.
 */
export const MIN_SPACING_DAYS = 1;

function safe(n: number): number {
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n;
}

/** Spacing that lands the legs evenly across one term, which is the default. */
export function evenSpacing(parts: number): number {
  return CYCLE_DAYS / Math.max(1, Math.floor(safe(parts)));
}

/** Leg counts worth offering for a total, largest first cut off by the minimum. */
export function legChoices(total: number, upTo = 6): number[] {
  const limit = Math.min(maxParts(total), upTo);
  const out: number[] = [];
  for (let n = MIN_LEGS; n <= limit; n++) out.push(n);
  return out;
}

/**
 * Spacings worth offering for a leg count: a fixed ladder of whole days plus
 * the even spacing for this many legs, rounded to a whole day so every date
 * on screen is a date rather than a fraction.
 */
export function spacingChoices(parts: number): number[] {
  const even = clamp(Math.round(evenSpacing(parts)), MIN_SPACING_DAYS, MAX_SPACING_DAYS);
  const set = new Set<number>([2, 3, 5, 7, 10, 14, even]);
  return [...set]
    .filter((n) => n >= MIN_SPACING_DAYS && n <= MAX_SPACING_DAYS)
    .sort((a, b) => a - b);
}

/* ── Whether a plan can actually be placed ──────────────────────────────── */

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
 * Why a plan is not placeable, said plainly rather than by disabling a button
 * and leaving the member to guess.
 *
 * A leg under the minimum and more legs than the total supports are the same
 * condition read two ways, since the smallest leg is the total divided by the
 * legs, so they are reported once with both figures named.
 */
export function validate(
  total: number,
  parts: number,
  spacingDays: number = evenSpacing(parts),
): Validity {
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
    reasons.push("An echelon needs at least two legs. One leg is a single placement.");
  } else if (n > maxLegs) {
    problems.push("legs");
    reasons.push(
      `${money(sum)} splits ${maxLegs} ways at most. At ${n} legs the smallest is ${money(smallestLeg)}, under the ${money(MINIMUM_PLACEMENT)} minimum.`,
    );
  }

  if (spacing < MIN_SPACING_DAYS) {
    problems.push("spacing");
    reasons.push(
      "Rewards accrue by the day, so legs less than a day apart open on the same day. Space them at least one day.",
    );
  } else if (spacing > MAX_SPACING_DAYS) {
    problems.push("spacing");
    reasons.push(
      `Legs ${days(spacing)} days apart never overlap. A term runs ${CYCLE_DAYS} days, so leg one returns before leg two opens, which is a sequence of placements rather than an echelon.`,
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
  /** Position in the formation, 1-indexed. */
  step: number;
  amount: number;
  tier: Tier | null;
  /** Days from the plan's anchor until this leg opens. */
  offsetDays: number;
  opensAt: number;
  maturesAt: number;
  daily: number;
  /** Reward across this leg's own full term. */
  reward: number;
  /** Principal plus reward: what this leg releases at maturity. */
  releases: number;
  /** Whether this leg clears the first entry, so it could be opened at all. */
  openable: boolean;
  /** The open date has arrived, so this leg can be placed now. */
  due: boolean;
  /** Time until the open date. Zero once the leg is due. */
  opensIn: number;
};

/**
 * A leg keeps the amount, rate and tier `stagger` worked out and takes only
 * its dates from the chosen spacing, so the two planners can never disagree
 * about what a leg is worth.
 */
function toLeg(base: StaggerLeg, offsetDays: number, from: number, now: number): EchelonLeg {
  const opensAt = from + Math.round(offsetDays * DAY_MS);
  return {
    step: base.step,
    amount: base.amount,
    tier: base.tier,
    offsetDays,
    opensAt,
    maturesAt: opensAt + CYCLE_DAYS * DAY_MS,
    daily: base.daily,
    reward: base.reward,
    releases: base.releases,
    openable: base.openable,
    due: now >= opensAt,
    opensIn: Math.max(0, opensAt - now),
  };
}

/** Legs running at an instant: opened, not yet matured. */
export function runningAt(plan: EchelonPlan, at: number): EchelonLeg[] {
  return plan.legs.filter((l) => at >= l.opensAt && at < l.maturesAt);
}

/** Principal at work at an instant. */
export function deployedAt(plan: EchelonPlan, at: number): number {
  return runningAt(plan, at).reduce((s, l) => s + l.amount, 0);
}

/* ── Where the schedule settles ─────────────────────────────────────────── */

export type Steady = {
  /** When the last leg opens, which is the first instant every leg is running. */
  fullyDeployedAt: number;
  /** True when the lag is under one term, so the legs genuinely overlap. */
  overlaps: boolean;
  /** The most principal at work at any one instant under this plan. */
  peakDeployed: number;
  /** When maturities start landing on the rhythm, which is the first one. */
  rhythmFrom: number;
  /** And when the rhythm runs out, after `parts` maturities. */
  rhythmTo: number;
  /** Days between one maturity and the next once the rhythm is running. */
  everyDays: number;
  /** First open to last maturity. */
  spanDays: number;
};

/**
 * The most principal at work at one instant.
 *
 * Replayed against the clock rather than summed, because a leg that matures
 * has to lower the running total before the next one raises it again. The tie
 * break puts a maturity before an open at the same instant, matching how the
 * ledger reads its own peak, so a leg maturing on the day another opens never
 * reads as if both were running at once.
 */
function peakOf(legs: EchelonLeg[]): number {
  const steps = [
    ...legs.map((l) => ({ at: l.opensAt, delta: l.amount })),
    ...legs.map((l) => ({ at: l.maturesAt, delta: -l.amount })),
  ].sort((a, b) => a.at - b.at || a.delta - b.delta);

  let running = 0;
  let peak = 0;
  for (const s of steps) {
    running += s.delta;
    if (running > peak) peak = running;
  }
  return peak;
}

/* ── The accrual series ─────────────────────────────────────────────────── */

export type AccrualPoint = {
  /** Days from the plan's anchor. */
  day: number;
  t: number;
  /** Combined reward per day across the legs running on that day. */
  echelon: number;
  /** What the same sum placed at once accrues on that day. */
  single: number;
  /** Principal at work under the echelon on that day. */
  deployed: number;
  /** Reward earned by that day under the echelon. */
  earned: number;
  /** Reward earned by that day under the single placement. */
  singleEarned: number;
};

function pointAt(legs: EchelonLeg[], total: number, from: number, day: number): AccrualPoint {
  const t = from + day * DAY_MS;
  let perDay = 0;
  let deployed = 0;
  let earned = 0;

  for (const leg of legs) {
    // Accrual runs from the open to the maturity and stops dead there, which
    // is exactly how the ledger accrues a real position.
    if (t >= leg.opensAt && t < leg.maturesAt) {
      perDay += leg.daily;
      deployed += leg.amount;
    }
    earned += leg.amount * DAILY_RATE * clamp((t - leg.opensAt) / DAY_MS, 0, CYCLE_DAYS);
  }

  return {
    day,
    t,
    echelon: perDay,
    single: day >= 0 && day < CYCLE_DAYS ? total * DAILY_RATE : 0,
    deployed,
    earned,
    singleEarned: total * DAILY_RATE * clamp(day, 0, CYCLE_DAYS),
  };
}

/**
 * Combined accrual across the whole plan, one point a day.
 *
 * A long plan is strided down rather than drawn point by point, because a
 * chart on a phone has nowhere to put seven hundred samples. The final day is
 * always included so the series ends where the plan does.
 */
function series(legs: EchelonLeg[], total: number, from: number, spanDays: number): AccrualPoint[] {
  const last = Math.ceil(spanDays);
  const stride = Math.max(1, Math.ceil(last / 180));
  const out: AccrualPoint[] = [];
  for (let day = 0; day <= last; day += stride) out.push(pointAt(legs, total, from, day));
  if (out.length === 0 || out[out.length - 1].day !== spanDays) {
    out.push(pointAt(legs, total, from, spanDays));
  }
  return out;
}

/* ── The comparison ─────────────────────────────────────────────────────── */

export type Comparison = {
  /** The same total placed at once, which is what the echelon is measured against. */
  single: EchelonLeg;
  /** The figure that is the same on both sides. Stated, never implied. */
  reward: number;

  /* When capital comes back. */
  lumpMaturesAt: number;
  firstMaturesAt: number;
  lastMaturesAt: number;
  /** How many dates capital returns on. One, against `parts`. */
  dates: number;
  /** The largest amount landing on any one date, each way. */
  largestSingleDate: number;
  largestEchelonDate: number;
  /** That amount as a share of everything returning. One placement is always 1. */
  singleConcentration: number;
  echelonConcentration: number;

  /* What the stagger costs early. */
  /**
   * Reward the echelon has accrued by the day the single placement matures.
   * The legs have run 30, 25, 20 days and so on, so this is always short of
   * the full term reward whenever there is more than one leg.
   */
  accruedByLumpMaturity: number;
  /** The gap on that date, in dollars. */
  shortfallAtLumpMaturity: number;
  /** Days after the single maturity before the echelon has earned the same. */
  lagDays: number;
  /** Average principal at work across the single placement's own thirty days. */
  meanDeployedFirstTerm: number;
  /** The same reading for one placement, which is simply the whole total. */
  singleMeanDeployedFirstTerm: number;
};

function compare(legs: EchelonLeg[], single: EchelonLeg, total: number, lagDays: number) {
  const lumpMaturesAt = single.maturesAt;

  const accruedByLumpMaturity = legs.reduce(
    (s, l) =>
      s + l.amount * DAILY_RATE * clamp((lumpMaturesAt - l.opensAt) / DAY_MS, 0, CYCLE_DAYS),
    0,
  );

  const reward = legs.reduce((s, l) => s + l.reward, 0);
  const releases = legs.reduce((s, l) => s + l.releases, 0);
  const largestEchelonDate = legs.reduce((m, l) => Math.max(m, l.releases), 0);

  return {
    single,
    reward,
    lumpMaturesAt,
    firstMaturesAt: legs[0].maturesAt,
    lastMaturesAt: legs[legs.length - 1].maturesAt,
    dates: legs.length,
    largestSingleDate: single.releases,
    largestEchelonDate,
    singleConcentration: 1,
    echelonConcentration: releases > 0 ? largestEchelonDate / releases : 0,
    accruedByLumpMaturity,
    shortfallAtLumpMaturity: Math.max(0, reward - accruedByLumpMaturity),
    lagDays,
    // Reward is principal times the rate times the days it ran, so dividing
    // the reward earned in the first term by the term rate gives back the
    // average principal that earned it. One derivation, two readings.
    meanDeployedFirstTerm: CYCLE_RETURN > 0 ? accruedByLumpMaturity / CYCLE_RETURN : 0,
    singleMeanDeployedFirstTerm: total,
  } satisfies Comparison;
}

/* ── The plan ───────────────────────────────────────────────────────────── */

export type EchelonPlan = {
  total: number;
  parts: number;
  spacingDays: number;
  /** When leg one opens, which is the plan's anchor. */
  from: number;
  /** The clock this reading was taken against. */
  now: number;
  legs: EchelonLeg[];
  /** Reward summed across every leg. */
  reward: number;
  /** Principal plus reward summed across every leg. */
  releases: number;
  /** Legs whose open date has arrived. These can be placed now. */
  due: EchelonLeg[];
  /** Legs whose open date is still ahead. Planned, not scheduled. */
  planned: EchelonLeg[];
  /** The earliest leg that is due, or null before the anchor. */
  next: EchelonLeg | null;
  firstMaturesAt: number;
  lastMaturesAt: number;
  /** How far the last maturity trails the first: (parts - 1) x spacing. */
  lagDays: number;
  /** First open to last maturity. */
  spanDays: number;
  steady: Steady;
  accrual: AccrualPoint[];
  compare: Comparison;
  validity: Validity;
};

/**
 * Plan a total as several terms opened `spacingDays` apart.
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
  spacingDays: number = evenSpacing(parts),
  from: number = Date.now(),
  now: number = from,
): EchelonPlan {
  const validity = validate(total, parts, spacingDays);

  // Leg amounts, the tier each one lands on and the single placement it is
  // measured against all come from the ladder planner. Only the dates below
  // are this module's own, because only the spacing is.
  const staged = stagger(total, parts, from);
  const spacing = clamp(safe(spacingDays), MIN_SPACING_DAYS, MAX_SPACING_DAYS);

  const legs = staged.legs.map((leg, i) => toLeg(leg, i * spacing, from, now));
  const single = toLeg(staged.single, 0, from, now);

  const lagDays = (legs.length - 1) * spacing;
  const spanDays = lagDays + CYCLE_DAYS;
  const first = legs[0];
  const last = legs[legs.length - 1];
  const due = legs.filter((l) => l.due);

  return {
    total: staged.total,
    parts: staged.parts,
    spacingDays: spacing,
    from,
    now,
    legs,
    reward: staged.reward,
    releases: staged.releases,
    due,
    planned: legs.filter((l) => !l.due),
    next: due[0] ?? null,
    firstMaturesAt: first.maturesAt,
    lastMaturesAt: last.maturesAt,
    lagDays,
    spanDays,
    steady: {
      fullyDeployedAt: last.opensAt,
      overlaps: lagDays < CYCLE_DAYS,
      peakDeployed: peakOf(legs),
      rhythmFrom: first.maturesAt,
      rhythmTo: last.maturesAt,
      everyDays: spacing,
      spanDays,
    },
    accrual: series(legs, staged.total, from, spanDays),
    compare: compare(legs, single, staged.total, lagDays),
    validity,
  };
}
