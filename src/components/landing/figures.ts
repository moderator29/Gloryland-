/**
 * The figures the public page repeats, derived once.
 *
 * A handful of numbers appear a dozen times across the landing sections.
 * Deriving them here rather than typing them into copy means a change to the
 * economics moves the whole page at once, and there is no literal left over
 * for anyone to update by hand and get wrong.
 *
 * This file used to carry a term figure, because the product used to run
 * thirty day terms that closed at a maturity. It does not any more: capital
 * accrues daily for as long as it stays in place, and the only clock left is
 * the withdrawal window. The two figures below replace it, and both are
 * derived from the same two constants the ledger uses.
 */

import { DAILY_RATE, TIERS, WITHDRAW_INTERVAL_DAYS } from "@/domain/tiers";
import { pct } from "@/components/system/format";

/**
 * `pct` signs its output, which is right for a movement and wrong for a
 * published rate. A rate is not a change, so the sign comes off.
 */
export function rate(n: number, decimals = 2): string {
  return pct(n, decimals).replace("+", "");
}

/** Share of principal credited to a position once a day. */
export const DAY_RATE = rate(DAILY_RATE, 0);

/** Days between one withdrawal request and the next. */
export const WINDOW_DAYS = WITHDRAW_INTERVAL_DAYS;

/**
 * Share of principal accrued between one withdrawal window and the next.
 *
 * Straight multiplication, not compounding. Reward accrues against the
 * original principal and nothing folds automatically, so four days at the
 * daily rate is four times the daily rate and the page must not print a
 * compounded figure it cannot pay.
 */
export const WINDOW_RATE = rate(DAILY_RATE * WITHDRAW_INTERVAL_DAYS, 0);

/** The bottom rung of the ladder, named often enough to bind once. */
export const FIRST_TIER = TIERS[0];

/** The top rung. */
export const TOP_TIER = TIERS[TIERS.length - 1];

/** How many rungs there are, quoted on the ladder and in the FAQ. */
export const RUNGS = TIERS.length;

/** Compact entry label for a control that has to fit six of them at 360px. */
export function entryLabel(n: number): string {
  return n >= 1000 ? `$${n / 1000}K` : `$${n}`;
}
