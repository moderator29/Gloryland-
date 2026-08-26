import type { ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { UserProvider } from "@/context/UserContext";
import { MotionProvider } from "@/context/MotionContext";
import { DAY_MS, type LedgerEvent } from "@/domain/ledger";

/**
 * Shared scaffolding for tests above the domain layer.
 *
 * The product reads its state out of storage on mount rather than from props,
 * so a test seeds storage and then renders. Doing it in that order is the whole
 * trick: seeding afterwards would leave the first render looking at an empty
 * account and the assertions racing the store.
 */

/** Storage keys, kept here so a rename breaks the tests loudly. */
export const KEYS = {
  member: "rgl_member_v2",
  ledger: "rgl_ledger_v1",
} as const;

export function signIn(overrides: Partial<Record<string, unknown>> = {}) {
  localStorage.setItem(
    KEYS.member,
    JSON.stringify({
      username: "marcus",
      displayName: "Marcus Adeyemi",
      approach: "steady",
      joinedAt: Date.now() - 40 * DAY_MS,
      ...overrides,
    }),
  );
}

export function seedLedger(events: LedgerEvent[]) {
  localStorage.setItem(KEYS.ledger, JSON.stringify(events));
}

/** One open position, `daysAgo` old, funded from outside. */
export function openEvent(
  id: string,
  amount: number,
  tierId: string,
  daysAgo: number,
  fromAvailable = false,
): LedgerEvent {
  return {
    id,
    kind: "open",
    at: Date.now() - daysAgo * DAY_MS,
    amount,
    tierId,
    asset: "USDT",
    network: "TRC20",
    ...(fromAvailable ? { fromAvailable } : {}),
  } as LedgerEvent;
}

/** A funded account: one mid term position, one nearly matured, one matured. */
export function seedFundedAccount() {
  signIn();
  seedLedger([
    openEvent("p-apex", 5000, "apex", 11),
    openEvent("p-signal", 1000, "signal", 4),
    openEvent("p-vector", 3000, "vector", 34),
  ]);
}

export function renderApp(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, {
    wrapper: ({ children }) => (
      <MemoryRouter>
        <MotionProvider>
          <UserProvider>{children}</UserProvider>
        </MotionProvider>
      </MemoryRouter>
    ),
    ...options,
  });
}
