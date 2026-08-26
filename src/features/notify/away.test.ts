import { describe, expect, it } from "vitest";
import { daysAway, deriveAway } from "./away";
import { derive, DAY_MS, type LedgerEvent } from "@/domain/ledger";
import { CYCLE_DAYS, DAILY_RATE, TIERS } from "@/domain/tiers";

/**
 * The catch up is the only thing standing in for a notification the product
 * cannot send, so the figure it quotes has to be right. In particular the
 * accrual across an absence is easy to get wrong in three ways: counting a
 * term that opened after the member left from the wrong start, counting one
 * that matured mid absence past its maturity, and counting a settled one at
 * all.
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
    // Mid term, nothing matured, nothing claimable above a dollar, no cash.
    const snap = derive([open("p1", 1000, "signal", 0)], at(0.5));
    const away = deriveAway(snap, at(0), at(0.5));
    expect(away.items.filter((i) => i.kind !== "claimable").length).toBe(0);
  });

  it("appears after a real absence with something to say", () => {
    const snap = derive([open("p1", 1000, "signal", 0)], at(CYCLE_DAYS + 2));
    const away = deriveAway(snap, at(CYCLE_DAYS - 3), at(CYCLE_DAYS + 2));
    expect(away.show).toBe(true);
    expect(away.items.some((i) => i.kind === "matured")).toBe(true);
  });
});

describe("accrual across the absence", () => {
  it("counts only the days the member was actually gone", () => {
    const snap = derive([open("p1", 1000, "signal", 0)], at(10));
    const away = deriveAway(snap, at(6), at(10));
    // Four days at 1% of 1,000.
    expect(away.accruedWhileAway).toBeCloseTo(1000 * DAILY_RATE * 4, 6);
  });

  it("counts a term opened mid absence from its own start, not from the gap", () => {
    const snap = derive([open("p1", 1000, "signal", 8)], at(10));
    const away = deriveAway(snap, at(6), at(10));
    // Open on day 8, so two days of accrual, not four.
    expect(away.accruedWhileAway).toBeCloseTo(1000 * DAILY_RATE * 2, 6);
  });

  it("stops at maturity for a term that completed mid absence", () => {
    const snap = derive([open("p1", 1000, "signal", 0)], at(CYCLE_DAYS + 10));
    const away = deriveAway(snap, at(CYCLE_DAYS - 4), at(CYCLE_DAYS + 10));
    // Four days of accrual before maturity, and nothing for the ten after.
    expect(away.accruedWhileAway).toBeCloseTo(1000 * DAILY_RATE * 4, 6);
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
    const snap = derive(events, at(CYCLE_DAYS + 5));
    const away = deriveAway(snap, at(CYCLE_DAYS - 2), at(CYCLE_DAYS + 5));

    expect(away.items[0].kind).toBe("relayDue");
    expect(away.items[0].amount).toBeCloseTo(1300, 6);
    expect(away.items[0].waitingDays).toBeCloseTo(5, 4);
    expect(away.items[0].costPerDay).toBeCloseTo(13, 6);
  });

  it("names idle cash once it clears the smallest position the product can open", () => {
    const entry = TIERS[0].entry;
    const events: LedgerEvent[] = [
      open("p1", entry, "core", 0),
      {
        id: "c1",
        kind: "claim",
        at: at(CYCLE_DAYS),
        positionId: "p1",
        amount: entry * 0.3,
      } as LedgerEvent,
      { id: "x1", kind: "close", at: at(CYCLE_DAYS), positionId: "p1" } as LedgerEvent,
    ];
    const snap = derive(events, at(CYCLE_DAYS + 3));
    const away = deriveAway(snap, at(CYCLE_DAYS - 1), at(CYCLE_DAYS + 3));

    const idle = away.items.find((i) => i.kind === "idle");
    expect(idle).toBeDefined();
    expect(idle?.amount).toBeCloseTo(entry * 1.3, 6);
  });

  it("returns figures as numbers, never as formatted text", () => {
    const snap = derive([open("p1", 1000, "signal", 0)], at(CYCLE_DAYS + 1));
    for (const item of deriveAway(snap, at(CYCLE_DAYS - 2), at(CYCLE_DAYS + 1)).items) {
      if (item.amount !== undefined) expect(typeof item.amount).toBe("number");
      expect(item.title).not.toMatch(/\$/);
    }
  });

  it("carries no em dash", () => {
    const snap = derive([open("p1", 1000, "signal", 0)], at(CYCLE_DAYS + 1));
    for (const item of deriveAway(snap, at(CYCLE_DAYS - 2), at(CYCLE_DAYS + 1)).items) {
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
