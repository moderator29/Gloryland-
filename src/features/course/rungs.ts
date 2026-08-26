import { CYCLE_DAYS, DAILY_RATE, TIERS, type Tier } from "@/domain/tiers";
import { DAY_MS, type Course, type Snapshot } from "@/domain/ledger";

/**
 * What a course reaches, and when.
 *
 * This is the whole argument for the feature: the ladder is a lump sum problem
 * and nothing in the product turns $10,000 into a plan. Given an amount and a
 * rhythm, these functions say which leg crosses each rung and on what date, so
 * the commitment is made against real dates rather than a vague intention.
 *
 * Pure, and the clock is a parameter, so the same inputs always produce the
 * same schedule.
 */

export type Rung = {
  tier: Tier;
  /** Standing once this leg is filled. */
  cumulative: number;
  /** The leg that crosses this rung, one based. */
  leg: number;
  /** When that leg is due. */
  dueAt: number;
  /** Days from the start of the course. */
  dayOffset: number;
  /** Already reached on the member's current standing. */
  held: boolean;
};

export type Plan = {
  amount: number;
  everyDays: number;
  legs: number;
  /** Capital entering terms across any thirty day stretch. */
  per30: number;
  /** What one leg does across its own term. */
  perLegDaily: number;
  perLegReward: number;
  perLegReleases: number;
  /** Total capital the plan places, or null when it is open ended. */
  commits: number | null;
  /** Every rung above where the member stands today. */
  rungs: Rung[];
  /** The last rung the plan reaches, if any. */
  reaches: Rung | null;
};

export const MIN_LEG = TIERS[0].entry;
export const MAX_EVERY_DAYS = 90;

/** Intervals offered as one press, with the custom field for anything else. */
export const INTERVALS = [7, 14, 30] as const;

/**
 * Build the plan.
 *
 * `standing` starts from what the member already holds, because a course adds
 * to a position rather than starting from zero, and a member at Vector should
 * not be shown the Signal rung as something still ahead of them.
 */
export function planCourse(
  amount: number,
  everyDays: number,
  legs: number,
  standing: number,
  startAt: number,
): Plan {
  const every = Math.max(1, Math.min(MAX_EVERY_DAYS, Math.round(everyDays)));
  const perLegDaily = amount * DAILY_RATE;

  // Open ended still needs a bound to search within, and 60 legs is well past
  // the top rung at any amount the product accepts.
  const searchLegs = legs > 0 ? legs : 60;

  const rungs: Rung[] = [];
  for (const tier of TIERS) {
    if (standing >= tier.entry) {
      rungs.push({
        tier,
        cumulative: standing,
        leg: 0,
        dueAt: startAt,
        dayOffset: 0,
        held: true,
      });
      continue;
    }
    // The first leg after which standing clears this rung.
    const needed = Math.ceil((tier.entry - standing) / amount);
    if (needed > searchLegs) continue;
    rungs.push({
      tier,
      cumulative: standing + needed * amount,
      leg: needed,
      dueAt: startAt + (needed - 1) * every * DAY_MS,
      dayOffset: (needed - 1) * every,
      held: false,
    });
  }

  const ahead = rungs.filter((r) => !r.held);

  return {
    amount,
    everyDays: every,
    legs,
    per30: amount * Math.floor(CYCLE_DAYS / every),
    perLegDaily,
    perLegReward: perLegDaily * CYCLE_DAYS,
    perLegReleases: amount + perLegDaily * CYCLE_DAYS,
    commits: legs > 0 ? amount * legs : null,
    rungs,
    reaches: ahead.length > 0 ? ahead[ahead.length - 1] : null,
  };
}

/** Why a plan cannot be set, in the member's terms. Null when it can. */
export function planProblem(amount: number, everyDays: number, legs: number): string | null {
  if (!Number.isFinite(amount) || amount < MIN_LEG) {
    return `A leg has to be at least ${MIN_LEG.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}, the smallest position the product can open.`;
  }
  if (!Number.isFinite(everyDays) || everyDays < 1 || everyDays > MAX_EVERY_DAYS) {
    return `An interval has to be between 1 and ${MAX_EVERY_DAYS} days.`;
  }
  if (!Number.isFinite(legs) || legs < 0 || legs > 60) {
    return "A course runs for up to 60 legs, or open ended.";
  }
  return null;
}

/**
 * The plan a running course is actually on, so the index and the setup form
 * quote the same figures.
 */
export function planForCourse(course: Course, snap: Snapshot): Plan {
  return planCourse(course.amount, course.everyDays, course.legs, snap.standing, course.startAt);
}
