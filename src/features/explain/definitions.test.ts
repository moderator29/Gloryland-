import { describe, expect, it } from "vitest";
import { allDefinitions, getDefinition } from "./definitions";
import { derive, DAY_MS, type LedgerEvent } from "@/domain/ledger";
import { DAILY_RATE, TIERS, WITHDRAW_INTERVAL_DAYS } from "@/domain/tiers";

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
      open("p1", 1000, "vector", 0),
      { id: "c1", kind: "claim", at: at(1), positionId: "p1", amount: 300 } as LedgerEvent,
      { id: "x1", kind: "close", at: at(1), positionId: "p1" } as LedgerEvent,
      open("p2", 1300, "vector", 1, true),
    ];
    const snap = derive(events, at(1));

    expect(snap.contributed).toBe(1000);
    expect(snap.peakDeployed).toBe(1300);
    expect(snap.standing).toBe(Math.max(snap.contributed, snap.peakDeployed));
    expect(snap.standing).toBe(1300);

    // And the figure the definition explains is the one the tier reads.
    expect(snap.tier?.id).toBe("vector");
  });

  it("moving the same money in a circle does not climb the ladder", () => {
    const events: LedgerEvent[] = [];
    for (let i = 0; i < 5; i++) {
      events.push(open(`p${i}`, 1000, "vector", i * 2, i > 0));
      events.push({
        id: `x${i}`,
        kind: "close",
        at: at((i + 1) * 2),
        positionId: `p${i}`,
      } as LedgerEvent);
    }
    const snap = derive(events, at(10));
    expect(snap.standing).toBe(1000);
  });
});

describe("the accrual figures agree with the constants", () => {
  it("accrued describes the rate the ledger actually applies", () => {
    const def = getDefinition("accrued");
    const text = [def.short, def.formula ?? "", ...def.how].join(" ");
    expect(text).toMatch(new RegExp(`${(DAILY_RATE * 100).toFixed(0)}\\s*%`));
    expect(text.toLowerCase()).toContain("per day");
  });

  /**
   * The regression this rewrite exists to prevent, in the definitions layer.
   * Accrual used to stop dead at a thirty day maturity and the copy said so.
   * Nothing stops now, and the words have to agree with that or Provenance is
   * explaining a model the ledger no longer runs.
   */
  it("says accrual has no end date, and derive agrees", () => {
    const def = getDefinition("accrued");
    const text = [def.short, def.formula ?? "", ...def.how, ...(def.caveats ?? [])]
      .join(" ")
      .toLowerCase();
    expect(text).toContain("no term");
    expect(text).toContain("no maturity");
    expect(withoutNegations(text)).not.toMatch(/\bmatur/);

    const entry = TIERS[0].entry;
    const thirty = derive([open("p1", entry, "core", 0)], at(30));
    const ninety = derive([open("p1", entry, "core", 0)], at(90));
    expect(thirty.rewardsAccrued).toBeCloseTo(entry * DAILY_RATE * 30, 6);
    expect(ninety.rewardsAccrued).toBeCloseTo(thirty.rewardsAccrued * 3, 6);
  });

  it("only a close stops the clock, exactly as the definition says", () => {
    const entry = TIERS[0].entry;
    const closed = derive(
      [
        open("p1", entry, "core", 0),
        { id: "x1", kind: "close", at: at(6), positionId: "p1" } as LedgerEvent,
      ],
      at(40),
    );
    expect(closed.rewardsAccrued).toBeCloseTo(entry * DAILY_RATE * 6, 6);
  });

  it("names the withdrawal interval the ledger enforces", () => {
    const def = getDefinition("withdrawWindow");
    const text = [def.short, def.formula ?? "", ...def.how].join(" ");
    expect(text).toContain(String(WITHDRAW_INTERVAL_DAYS));

    const snap = derive(
      [
        open("p1", TIERS[0].entry, "core", 0),
        { id: "w1", kind: "withdraw", at: at(2), amount: 1, address: "x" } as LedgerEvent,
      ],
      at(2),
    );
    expect(snap.withdrawAllowed).toBe(false);
    expect(snap.daysUntilWithdraw).toBeCloseTo(WITHDRAW_INTERVAL_DAYS, 6);
  });

  it("settlement targets in the definition match the ladder", () => {
    const def = getDefinition("settlementTarget");
    const text = [def.short, def.formula ?? "", ...def.how].join(" ");
    for (const tier of TIERS) {
      expect(text, `${tier.name} target missing`).toContain(String(tier.settlementHours));
    }
  });
});

/**
 * Saying "there is no maturity" is the correction, not the drift, so a naked
 * ban on the word would fail the sentences doing the work. Negated forms are
 * removed before the check rather than special cased inside it, the same way
 * the disclaimer test below handles "not a guarantee".
 */
const withoutNegations = (text: string) =>
  text.replace(/\b(no|not|never|nothing|without)\b[^.]{0,80}?\b(matur\w*|terms?)\b/gi, "");

describe("no definition describes a maturity that cannot happen", () => {
  it("keeps affirmative term and maturity language out of every entry", () => {
    for (const def of allDefinitions()) {
      const text = withoutNegations(
        [def.label, def.short, def.formula ?? "", ...def.how, ...(def.caveats ?? [])]
          .join(" ")
          .toLowerCase(),
      );
      expect(text, def.id).not.toMatch(/\bmatur/);
      expect(text, def.id).not.toMatch(/\bterm reward\b/);
      expect(text, def.id).not.toMatch(/\b30[- ]day\b/);
    }
  });

  it("still fails when a maturity is actually described", () => {
    expect(withoutNegations("the position matures on day thirty")).toMatch(/\bmatur/);
    expect(withoutNegations("a position has no term and no maturity")).not.toMatch(/\bmatur/);
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
