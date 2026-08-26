/**
 * The figures the public page repeats, derived once.
 *
 * Three numbers appear a dozen times across the landing sections. Deriving
 * them here rather than typing them into copy means a change to the term
 * structure moves the whole page at once, and there is no literal left over
 * for anyone to update by hand and get wrong.
 */

import { CYCLE_RETURN, DAILY_RATE, TIERS } from "@/domain/tiers";
import { pct } from "@/components/system/format";

/**
 * `pct` signs its output, which is right for a movement and wrong for a
 * published rate. A rate is not a change, so the sign comes off.
 */
export function rate(n: number, decimals = 2): string {
  return pct(n, decimals).replace("+", "");
}

/** Share of principal credited to a position once a day. */
export const DAY_RATE = rate(DAILY_RATE, 2);

/** Share of principal the position has reached at the end of the term. */
export const TERM_RATE = rate(CYCLE_RETURN, 0);

/** The bottom rung of the ladder, named often enough to bind once. */
export const FIRST_TIER = TIERS[0];

/** The top rung. */
export const TOP_TIER = TIERS[TIERS.length - 1];

/** Compact entry label for a control that has to fit six of them at 360px. */
export function entryLabel(n: number): string {
  return n >= 1000 ? `$${n / 1000}K` : `$${n}`;
}
