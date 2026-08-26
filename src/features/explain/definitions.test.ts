import { describe, expect, it } from "vitest";
import { allDefinitions, getDefinition } from "./definitions";
import { derive, DAY_MS, type LedgerEvent } from "@/domain/ledger";
import { CYCLE_DAYS, CYCLE_RETURN, DAILY_RATE, TIERS } from "@/domain/tiers";

/**
 * Guards against the exact failure this suite was built for.
 *
 * Explain and Provenance exist so a member can check a figure. That makes them
 * the one place in the product where being out of date is worse than being
 * absent, and it is precisely where drift happened: standing changed basis in
 * the ledger and the definition that explains standing kept describing the old
 * rule for hours, with nothing to notice.
 *
 * These tests do not check wording. They check that the words still agree with
 * what `derive` actually does, by deriving the figure and looking for it.
 */

const T0 = Date.UTC(2026, 0, 1);
const at = (days: number) => T0 + days * DAY_MS;

function open(id: string, amount: number, tierId: string, day: number, fromAvailable = false) {
  return {
    id,
    kind: "open",
    at: at(day),
    amount,
    tierId,
    asset: "USDT",
    network: "TRC20",
    ...(fromAvailable ? { fromAvailable } : {}),
  } as LedgerEvent;
}

describe("every definition is complete", () => {
  it("has a label, a short line and at least one step", () => {
    for (const def of allDefinitions()) {
      expect(def.label.length, def.id).toBeGreaterThan(0);
      expect(def.short.length, def.id).toBeGreaterThan(10);
      expect(def.how.length, def.id).toBeGreaterThan(0);
    }
  });

  it("carries no em dash, anywhere", () => {
    for (const def of allDefinitions()) {
      const text = [
        def.label,
        def.short,
        def.formula ?? "",
        ...def.how,
        ...(def.caveats ?? []),
      ].join(" ");
      expect(text, def.id).not.toMatch(/[–—]/);
    }
  });

  it("never points at a related figure that does not exist", () => {
    const ids = new Set(allDefinitions().map((d) => d.id));
    for (const def of allDefinitions()) {
      for (const rel of def.related ?? []) {
        expect(ids.has(rel), `${def.id} points at ${rel}`).toBe(true);
      }
    }
  });
});

describe("standing agrees with the ledger", () => {
  /**
   * The regression. Standing is `max(contributed, peakDeployed)`, and the
   * definition has to say so. Anything describing it as lifetime contribution
   * alone is the old rule and is now wrong.
   */
  it("describes standing as the greater of two figures, not as contribution alone", () => {
    const def = getDefinition("standing");
    const text = [def.short, def.formula ?? "", ...def.how].join(" ").toLowerCase();

    expect(text).toContain("deployed");
    expect(text).toMatch(/greater|max\(/);
    expect(text).not.toContain("lifetime contribution clears");
  });

  it("the rule it describes is the rule derive applies", () => {
    // Compounding: one external deposit, then the same capital re-placed
    // larger. Contribution stays at the deposit; the peak follows the roll.
    const events: LedgerEvent[] = [
      open("p1", 1000, "signal", 0),
      { id: "c1", kind: "claim", at: at(30), positionId: "p1", amount: 300 } as LedgerEvent,
      { id: "x1", kind: "close", at: at(30), positionId: "p1" } as LedgerEvent,
      open("p2", 1300, "signal", 30, true),
    ];
    const snap = derive(events, at(30));

    expect(snap.contributed).toBe(1000);
    expect(snap.peakDeployed).toBe(1300);
    expect(snap.standing).toBe(Math.max(snap.contributed, snap.peakDeployed));
    expect(snap.standing).toBe(1300);

    // And the figure the definition explains is the one the tier reads.
    expect(snap.tier?.id).toBe("signal");
  });

  it("moving the same money in a circle does not climb the ladder", () => {
    const events: LedgerEvent[] = [];
    for (let i = 0; i < 5; i++) {
      events.push(open(`p${i}`, 1000, "signal", i * CYCLE_DAYS, i > 0));
      events.push({
        id: `x${i}`,
        kind: "close",
        at: at((i + 1) * CYCLE_DAYS),
        positionId: `p${i}`,
      } as LedgerEvent);
    }
    const snap = derive(events, at(5 * CYCLE_DAYS));
    expect(snap.standing).toBe(1000);
  });
});

describe("the term figures agree with the constants", () => {
  it("accrued describes the rate the ledger actually applies", () => {
    const def = getDefinition("accrued");
    const text = [def.short, def.formula ?? "", ...def.how].join(" ");
    expect(text).toContain(String(CYCLE_DAYS));
    expect(text).toMatch(new RegExp(`${(DAILY_RATE * 100).toFixed(0)}\\s*%`));
  });

  it("a term returns exactly the published fraction, and stops", () => {
    const snap = derive([open("p1", TIERS[0].entry, "core", 0)], at(CYCLE_DAYS));
    expect(snap.rewardsAccrued).toBeCloseTo(TIERS[0].entry * CYCLE_RETURN, 6);

    const later = derive([open("p1", TIERS[0].entry, "core", 0)], at(CYCLE_DAYS * 3));
    expect(later.rewardsAccrued).toBeCloseTo(snap.rewardsAccrued, 6);
  });

  it("settlement targets in the definition match the ladder", () => {
    const def = getDefinition("settlementTarget");
    const text = [def.short, def.formula ?? "", ...def.how].join(" ");
    for (const tier of TIERS) {
      expect(text, `${tier.name} target missing`).toContain(String(tier.settlementHours));
    }
  });
});

describe("no definition promises a return", () => {
  /**
   * "It is a service target, not a guarantee" is a disclaimer and has to
   * survive. Only an affirmative promise should fail, so negated forms are
   * removed before the check rather than being special cased inside it.
   */
  const withoutDisclaimers = (text: string) =>
    text.replace(/\b(not|never|no|nor|without|rather than)\b[^.]{0,60}?\bguarantee[sd]?\b/gi, "");

  it("avoids the language of a promise", () => {
    const banned =
      /\b(guarantee[sd]?|risk free|riskless|assured returns?|will earn|you will receive)\b/i;
    for (const def of allDefinitions()) {
      const text = withoutDisclaimers(
        [def.short, def.formula ?? "", ...def.how, ...(def.caveats ?? [])].join(" "),
      );
      expect(text, def.id).not.toMatch(banned);
    }
  });

  it("still fails when a promise is actually made", () => {
    const banned = /\b(guarantee[sd]?|risk free|riskless|assured returns?)\b/i;
    expect(withoutDisclaimers("Your capital is guaranteed to return 30%.")).toMatch(banned);
    expect(withoutDisclaimers("This is a target, not a guarantee.")).not.toMatch(banned);
  });
});
