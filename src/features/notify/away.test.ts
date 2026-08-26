import { describe, expect, it } from "vitest";
import { daysAway, deriveAway } from "./away";
import { derive, DAY_MS, type LedgerEvent } from "@/domain/ledger";
import { DAILY_RATE, TIERS, WITHDRAW_INTERVAL_DAYS } from "@/domain/tiers";

/**
 * The catch up is the only thing standing in for a notification the product
 * cannot send, so the figure it quotes has to be right. Accrual across an
 * absence is easy to get wrong in two ways: counting a position that opened
 * after the member left from the wrong start, and counting a closed one at
 * all. It used to be three ways, the third being a position that matured mid
 * absence, but nothing matures now: a position accrues for every day of the
 * gap it existed for, with no upper bound.
 */

const T0 = Date.UTC(2026, 0, 1);
const at = (days: number) => T0 + days * DAY_MS;

function open(id: string, amount: number, tierId: string, day: number): LedgerEvent {
  return {
    id,
    kind: "open",
    at: at(day),
    amount,
    tierId,
    asset: "USDT",
    network: "TRC20",
  } as LedgerEvent;
}

describe("when the digest appears at all", () => {
  it("stays hidden on a first visit, because there is no absence to report", () => {
    const snap = derive([open("p1", 1000, "signal", 0)], at(10));
    expect(deriveAway(snap, null, at(10)).show).toBe(false);
  });

  it("stays hidden across a short gap", () => {
    const snap = derive([open("p1", 1000, "signal", 0)], at(10));
    // Two hours is the same visit.
    const away = deriveAway(snap, at(10) - 2 * 3_600_000, at(10));
    expect(away.show).toBe(false);
  });

  it("stays hidden when a real absence turned up nothing", () => {
    // A young position, nothing claimable above a dollar, no cash, no window.
    const snap = derive([open("p1", 1000, "signal", 0)], at(0.5));
    const away = deriveAway(snap, at(0), at(0.5));
    expect(away.items.filter((i) => i.kind !== "claimable").length).toBe(0);
  });

  it("appears after a real absence with something to say", () => {
    const snap = derive([open("p1", 1000, "signal", 0)], at(12));
    const away = deriveAway(snap, at(7), at(12));
    expect(away.show).toBe(true);
    expect(away.items.some((i) => i.kind === "claimable")).toBe(true);
  });

  /**
   * The item that replaced "your term matured". A member who withdrew before
   * leaving comes back to a window that opened while they were gone, and that
   * is now the only date the product can tell them about.
   */
  it("reports a withdrawal window that opened during the absence", () => {
    const events: LedgerEvent[] = [
      open("p1", 1000, "signal", 0),
      { id: "w1", kind: "withdraw", at: at(1), amount: 10, address: "addr" } as LedgerEvent,
    ];
    const snap = derive(events, at(1 + WITHDRAW_INTERVAL_DAYS + 2));
    const away = deriveAway(snap, at(2), at(1 + WITHDRAW_INTERVAL_DAYS + 2));
    expect(away.items.some((i) => i.kind === "window")).toBe(true);
  });
});

describe("accrual across the absence", () => {
  it("counts only the days the member was actually gone", () => {
    const snap = derive([open("p1", 1000, "signal", 0)], at(10));
    const away = deriveAway(snap, at(6), at(10));
    // Four days at 1% of 1,000.
    expect(away.accruedWhileAway).toBeCloseTo(1000 * DAILY_RATE * 4, 6);
  });

  it("counts a position opened mid absence from its own start, not from the gap", () => {
    const snap = derive([open("p1", 1000, "signal", 8)], at(10));
    const away = deriveAway(snap, at(6), at(10));
    // Open on day 8, so two days of accrual, not four.
    expect(away.accruedWhileAway).toBeCloseTo(1000 * DAILY_RATE * 2, 6);
  });

  /**
   * The regression this replaced went the other way: accrual used to stop at a
   * maturity, and a long absence over a matured term reported only the days
   * before it. There is no maturity now, so a long absence has to report all
   * of it.
   */
  it("does not stop, however long the absence was", () => {
    const snap = derive([open("p1", 1000, "signal", 0)], at(40));
    const away = deriveAway(snap, at(10), at(40));
    expect(away.accruedWhileAway).toBeCloseTo(1000 * DAILY_RATE * 30, 6);
  });

  it("ignores a position that was already settled", () => {
    const events: LedgerEvent[] = [
      open("p1", 1000, "signal", 0),
      { id: "x1", kind: "close", at: at(5), positionId: "p1" } as LedgerEvent,
    ];
    const snap = derive(events, at(20));
    expect(deriveAway(snap, at(10), at(20)).accruedWhileAway).toBe(0);
  });
});

describe("what it reports, and in what order", () => {
  it("puts a waiting relay above everything, because it is the only one costing money", () => {
    const events: LedgerEvent[] = [
      open("p1", 1000, "signal", 0),
      { id: "r1", kind: "relay.set", at: at(1), positionId: "p1", mode: "full" } as LedgerEvent,
    ];
    const snap = derive(events, at(6));
    const away = deriveAway(snap, at(3), at(6));

    expect(away.items[0].kind).toBe("relayDue");
    // Six days at 30% of 1,000, folded whole: principal plus all of it.
    expect(away.items[0].amount).toBeCloseTo(1000 + 1000 * DAILY_RATE * 6, 6);
    expect(away.items[0].costPerDay).toBeCloseTo(1000 * DAILY_RATE * 6 * DAILY_RATE, 6);
  });

  it("names idle cash once it clears the smallest position the product can open", () => {
    const entry = TIERS[0].entry;
    const events: LedgerEvent[] = [
      open("p1", entry, "core", 0),
      {
        id: "c1",
        kind: "claim",
        at: at(1),
        positionId: "p1",
        amount: entry * DAILY_RATE,
      } as LedgerEvent,
      { id: "x1", kind: "close", at: at(1), positionId: "p1" } as LedgerEvent,
    ];
    const snap = derive(events, at(4));
    const away = deriveAway(snap, at(2), at(4));

    const idle = away.items.find((i) => i.kind === "idle");
    expect(idle).toBeDefined();
    expect(idle?.amount).toBeCloseTo(entry * (1 + DAILY_RATE), 6);
  });

  it("returns figures as numbers, never as formatted text", () => {
    const snap = derive([open("p1", 1000, "signal", 0)], at(9));
    for (const item of deriveAway(snap, at(6), at(9)).items) {
      if (item.amount !== undefined) expect(typeof item.amount).toBe("number");
      expect(item.title).not.toMatch(/\$/);
    }
  });

  it("carries no em dash", () => {
    const snap = derive([open("p1", 1000, "signal", 0)], at(9));
    for (const item of deriveAway(snap, at(6), at(9)).items) {
      expect(`${item.title} ${item.body} ${item.action}`).not.toMatch(/[–—]/);
    }
  });
});

describe("the heading", () => {
  it("never reads as zero days", () => {
    expect(daysAway(0)).toBe(1);
    expect(daysAway(7 * 3_600_000)).toBe(1);
    expect(daysAway(3 * DAY_MS)).toBe(3);
  });
});
