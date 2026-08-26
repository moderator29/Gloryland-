import { describe, expect, it } from "vitest";
import {
  DAILY_RATE,
  TIERS,
  WITHDRAW_INTERVAL_DAYS,
  dailyReward,
  rewardOver,
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
 * These tests hold the rules that make the ladder mean anything: one rate
 * everywhere, exactly one place a settlement claim can come from, and twenty
 * rungs that rise in entry while falling in settlement.
 *
 * They also pin the shape of the economics itself. Capital used to run a fixed
 * thirty day term at 1% a day and stop at maturity. It now accrues 30% a day
 * for as long as it is left in place, and liquidity is a four day withdrawal
 * window rather than an end date. Nothing here may reintroduce a term.
 */

describe("one rate, on every rung", () => {
  it("publishes thirty percent of principal per day", () => {
    expect(DAILY_RATE).toBe(0.3);
    expect(dailyReward(1000)).toBe(300);
    expect(dailyReward(0)).toBe(0);
  });

  it("earns identically at the top and the bottom on the same principal", () => {
    const principal = 10_000;
    const perDay = TIERS.map(() => principal * DAILY_RATE);
    expect(new Set(perDay).size).toBe(1);
    expect(new Set(TIERS.map(() => dailyReward(principal))).size).toBe(1);
  });

  it("returns the same multiple of principal on every rung, over any run", () => {
    for (const days of [1, 4, 30, 31, 200]) {
      const multiples = TIERS.map((t) => rewardOver(t.entry, days) / t.entry);
      expect(new Set(multiples.map((m) => m.toFixed(9))).size, `over ${days} days`).toBe(1);
      expect(multiples[0]).toBeCloseTo(DAILY_RATE * days, 9);
    }
  });

  it("states no rate in a benefit or a blurb that differs from the published one", () => {
    const published = `${(DAILY_RATE * 100).toFixed(0)}%`;
    for (const tier of TIERS) {
      for (const line of [tier.blurb, ...tier.benefits]) {
        const percentages = line.match(/\d+(\.\d+)?\s*%/g) ?? [];
        for (const p of percentages) {
          expect(p.replace(/\s/g, ""), `${tier.name}: ${line}`).toBe(published);
        }
      }
    }
  });
});

describe("accrual has no end date", () => {
  /**
   * The regression this whole rewrite exists to prevent. Every figure used to
   * be capped at a thirty day term, and a helper that assumed a length is how
   * that cap would creep back in.
   */
  it("keeps paying past any old term boundary", () => {
    expect(rewardOver(1000, 31)).toBeGreaterThan(rewardOver(1000, 30));
    expect(rewardOver(1000, 60)).toBeCloseTo(rewardOver(1000, 30) * 2, 9);
    expect(rewardOver(1000, 365)).toBeCloseTo(1000 * DAILY_RATE * 365, 9);
  });

  it("is linear in the days, with no step at any date", () => {
    for (let d = 1; d <= 120; d++) {
      expect(rewardOver(500, d), `day ${d}`).toBeCloseTo(500 * DAILY_RATE * d, 9);
    }
  });

  it("earns nothing before it starts", () => {
    expect(rewardOver(1000, 0)).toBe(0);
    expect(rewardOver(1000, -5)).toBe(0);
  });
});

describe("liquidity is a window, not a maturity", () => {
  it("opens a withdrawal every four days", () => {
    expect(WITHDRAW_INTERVAL_DAYS).toBe(4);
  });

  it("is the same interval at every rung, because it is not a tier benefit", () => {
    for (const tier of TIERS) {
      for (const line of [tier.blurb, ...tier.benefits]) {
        expect(line, `${tier.name}: ${line}`).not.toMatch(
          new RegExp(`\\b${WITHDRAW_INTERVAL_DAYS}\\s*day`, "i"),
        );
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

  it("steps down from seventy two hours to two", () => {
    expect(TIERS[0].settlementHours).toBe(72);
    expect(TIERS[TIERS.length - 1].settlementHours).toBe(2);
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
  it("is twenty rungs from three hundred to forty thousand", () => {
    expect(TIERS.length).toBe(20);
    expect(TIERS.map((t) => t.entry)).toEqual([
      300, 500, 750, 1000, 1500, 2000, 3000, 4000, 5000, 6500, 8000, 10000, 12500, 15000, 18000,
      22000, 26000, 30000, 35000, 40000,
    ]);
  });

  it("opens at Core and ends at Sovereign", () => {
    expect(TIERS[0].id).toBe("core");
    expect(TIERS[TIERS.length - 1].id).toBe("sovereign");
  });

  it("gives every rung its own id and its own name", () => {
    expect(new Set(TIERS.map((t) => t.id)).size).toBe(TIERS.length);
    expect(new Set(TIERS.map((t) => t.name)).size).toBe(TIERS.length);
  });

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

  it("describes no term, no maturity and no fixed length anywhere", () => {
    for (const tier of TIERS) {
      const text = `${tier.name} ${tier.blurb} ${tier.benefits.join(" ")}`.toLowerCase();
      expect(text, tier.name).not.toMatch(/\bmatur/);
      expect(text, tier.name).not.toMatch(/\bterms?\b/);
      expect(text, tier.name).not.toMatch(/\b\d+\s*[- ]?day\b/);
    }
  });

  it("carries no em dash", () => {
    for (const tier of TIERS) {
      expect(`${tier.name} ${tier.blurb} ${tier.benefits.join(" ")}`).not.toMatch(/[–—]/);
    }
  });
});
