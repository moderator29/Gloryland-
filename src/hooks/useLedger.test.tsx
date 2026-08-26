import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useLedger } from "./useLedger";
import { DAY_MS, type LedgerEvent } from "@/domain/ledger";
import { CYCLE_DAYS, DAILY_RATE } from "@/domain/tiers";

/**
 * The hook every figure in the product reads.
 *
 * The regression pinned here is worth stating plainly: this hook used to stop
 * ticking when the member preferred reduced motion, which froze the whole
 * product at whatever it held on page load. Reduced motion is a preference
 * about animation, not about being shown a stale portfolio, and the two had
 * been conflated. `Value` is where the preference belongs, and it already
 * honours it by rendering instantly instead of easing.
 */

function seed(amount = 1000, daysAgo = 10) {
  const events: LedgerEvent[] = [
    {
      id: "p1",
      kind: "open",
      at: Date.now() - daysAgo * DAY_MS,
      amount,
      tierId: "signal",
      asset: "USDT",
      network: "TRC20",
    } as LedgerEvent,
  ];
  localStorage.setItem("rgl_ledger_v1", JSON.stringify(events));
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("the figures keep moving", () => {
  it("re-derives on its own clock so accrual visibly advances", () => {
    seed();
    const { result } = renderHook(() => useLedger(1000));
    const first = result.current.rewardsAccrued;

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.rewardsAccrued).toBeGreaterThan(first);
  });

  /**
   * The regression. With `prefers-reduced-motion: reduce` the hook returned
   * early and never started an interval, so every figure in the product sat
   * still until something else wrote to the ledger.
   */
  it("keeps ticking when the member prefers reduced motion", () => {
    window.matchMedia = ((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;

    seed();
    const { result } = renderHook(() => useLedger(1000));
    const first = result.current.rewardsAccrued;

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.rewardsAccrued).toBeGreaterThan(first);
  });

  it("stops while the tab is hidden, because nothing is being read", () => {
    seed();
    const { result } = renderHook(() => useLedger(1000));

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    const beforeHide = result.current.rewardsAccrued;

    act(() => {
      Object.defineProperty(document, "hidden", { value: true, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
      vi.advanceTimersByTime(20_000);
    });
    expect(result.current.rewardsAccrued).toBe(beforeHide);

    // Coming back catches up immediately rather than waiting for a tick.
    act(() => {
      Object.defineProperty(document, "hidden", { value: false, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current.rewardsAccrued).toBeGreaterThan(beforeHide);
  });
});

describe("what it derives", () => {
  it("reads the ledger out of storage on mount", () => {
    seed(3000, 5);
    const { result } = renderHook(() => useLedger(1000));
    expect(result.current.deployed).toBe(3000);
    expect(result.current.rewardsAccrued).toBeCloseTo(3000 * DAILY_RATE * 5, 0);
  });

  it("returns an empty account when there is nothing stored", () => {
    const { result } = renderHook(() => useLedger(1000));
    expect(result.current.positions).toEqual([]);
    expect(result.current.portfolioValue).toBe(0);
    expect(result.current.standing).toBe(0);
  });

  it("holds a matured term at the full term reward and stops", () => {
    seed(1000, CYCLE_DAYS + 5);
    const { result } = renderHook(() => useLedger(1000));
    const atMount = result.current.rewardsAccrued;
    expect(atMount).toBeCloseTo(1000 * DAILY_RATE * CYCLE_DAYS, 6);

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.rewardsAccrued).toBeCloseTo(atMount, 6);
  });
});
