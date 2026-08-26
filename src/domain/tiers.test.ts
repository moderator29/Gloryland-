import { describe, expect, it } from "vitest";
import {
  CYCLE_DAYS,
  CYCLE_RETURN,
  DAILY_RATE,
  TIERS,
  settlementNote,
  tierForAmount,
} from "./tiers";

/**
 * The ladder is the product's constitution, and the one thing every rung
 * changes is settlement speed. That made it the thing most likely to drift,
 * and it did: Vector carried "48h settlement" in its benefits while its target
 * was 36 hours, so the tier card and an insight quoting the same rung
 * disagreed on screen.
 *
 * These tests hold the two rules that make the ladder mean anything: one rate
 * everywhere, and exactly one place a settlement claim can come from.
 */

describe("one rate, on every rung", () => {
  it("is the same fraction across the same term at every tier", () => {
    for (const tier of TIERS) {
      expect(DAILY_RATE * CYCLE_DAYS, tier.name).toBeCloseTo(CYCLE_RETURN, 12);
    }
  });

  it("earns identically at the top and the bottom on the same principal", () => {
    const principal = 10_000;
    const perDay = TIERS.map(() => principal * DAILY_RATE);
    expect(new Set(perDay).size).toBe(1);
  });

  it("states no rate in a benefit that differs from the published one", () => {
    const published = `${(CYCLE_RETURN * 100).toFixed(0)}%`;
    for (const tier of TIERS) {
      for (const benefit of tier.benefits) {
        const percentages = benefit.match(/\d+(\.\d+)?\s*%/g) ?? [];
        for (const p of percentages) {
          expect(p.replace(/\s/g, ""), `${tier.name}: ${benefit}`).toBe(published);
        }
      }
    }
  });
});

describe("settlement has exactly one source", () => {
  it("gives every rung a distinct target, faster as the ladder rises", () => {
    const hours = TIERS.map((t) => t.settlementHours);
    expect(new Set(hours).size).toBe(TIERS.length);
    for (let i = 1; i < hours.length; i++) {
      expect(hours[i], `${TIERS[i].name} is not faster than ${TIERS[i - 1].name}`).toBeLessThan(
        hours[i - 1],
      );
    }
  });

  /**
   * The regression, pinned. A benefit string that names an hour figure is a
   * second source of truth, and a second source is what drifted.
   */
  it("keeps hour figures out of the benefit list entirely", () => {
    for (const tier of TIERS) {
      for (const benefit of tier.benefits) {
        expect(benefit, `${tier.name}: ${benefit}`).not.toMatch(/\d+\s*(h\b|hour|hr)/i);
        expect(benefit.toLowerCase(), `${tier.name}: ${benefit}`).not.toContain("settlement");
      }
    }
  });

  it("derives the settlement line from the hours it publishes", () => {
    for (const tier of TIERS) {
      expect(settlementNote(tier)).toContain(String(tier.settlementHours));
    }
  });
});

describe("the ladder itself", () => {
  it("rises in entry, and ranks in order", () => {
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIERS[i].entry).toBeGreaterThan(TIERS[i - 1].entry);
      expect(TIERS[i].rank).toBe(TIERS[i - 1].rank + 1);
    }
    expect(TIERS[0].rank).toBe(1);
  });

  it("places an amount on the highest rung it clears, and nowhere below the first", () => {
    expect(tierForAmount(TIERS[0].entry - 1)).toBeNull();
    for (const tier of TIERS) {
      expect(tierForAmount(tier.entry)?.id, `at exactly ${tier.entry}`).toBe(tier.id);
      expect(tierForAmount(tier.entry + 1)?.rank).toBeGreaterThanOrEqual(tier.rank);
    }
    const top = TIERS[TIERS.length - 1];
    expect(tierForAmount(top.entry * 100)?.id).toBe(top.id);
  });

  it("carries no em dash", () => {
    for (const tier of TIERS) {
      expect(`${tier.name} ${tier.blurb} ${tier.benefits.join(" ")}`).not.toMatch(/[–—]/);
    }
  });
});
