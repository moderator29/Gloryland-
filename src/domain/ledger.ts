/**
 * The ledger: an append-only event log and the pure functions that derive
 * every figure in the product from it.
 *
 * Nothing here invents a number. Portfolio value, accrued rewards, tier
 * standing and vault progress are all computed from recorded events plus the
 * clock, so the same inputs always produce the same output and the UI can
 * animate against a live-but-deterministic source.
 *
 * Persistence is browser-local. That is a deliberate constraint of the
 * current build, not a design goal: `loadEvents`/`saveEvents` are the only
 * storage-aware functions, so moving to a server means replacing those two
 * and nothing else.
 */

import {
  CYCLE_DAYS,
  DAILY_RATE,
  TIERS,
  tierById,
  tierForAmount,
  type Tier,
  type TierId,
} from "./tiers";

export const DAY_MS = 86_400_000;
const EVENTS_KEY = "rgl_ledger_v1";

export type EventKind = "open" | "claim" | "withdraw" | "close";

export type LedgerEvent =
  /** Capital placed into a vault. Starts a term. */
  | {
      id: string;
      kind: "open";
      at: number;
      amount: number;
      tierId: TierId;
      asset: string;
      network: string;
    }
  /** Accrued rewards moved from a position into available cash. */
  | { id: string; kind: "claim"; at: number; amount: number; positionId: string }
  /** Cash sent out to an external address. */
  | { id: string; kind: "withdraw"; at: number; amount: number; address: string }
  /** A matured position returned its principal to available cash. */
  | { id: string; kind: "close"; at: number; positionId: string };

export type Position = {
  id: string;
  tierId: TierId;
  tier: Tier;
  principal: number;
  openedAt: number;
  maturesAt: number;
  asset: string;
  network: string;
  /** 0..1 through the 30-day term. */
  progress: number;
  /** Days elapsed, fractional, clamped to the term. */
  daysElapsed: number;
  daysRemaining: number;
  /** Total rewards this position has generated so far. */
  accrued: number;
  /** Rewards already moved out via claims. */
  claimed: number;
  /** Rewards available to claim right now. */
  claimable: number;
  /** What the position returns across the whole term. */
  termReward: number;
  dailyReward: number;
  matured: boolean;
  closed: boolean;
};

export type Snapshot = {
  positions: Position[];
  activePositions: Position[];
  /** Principal currently sitting in open vaults. */
  deployed: number;
  /** Lifetime rewards generated across every position. */
  rewardsAccrued: number;
  /** Rewards claimed into cash. */
  rewardsClaimed: number;
  /** Rewards earned but not yet claimed. */
  rewardsPending: number;
  /** Cash available to withdraw: claims plus returned principal, less withdrawals. */
  available: number;
  withdrawn: number;
  /** Everything the member owns right now. */
  portfolioValue: number;
  /** Capital they have ever put in. */
  contributed: number;
  /** portfolioValue + withdrawn - contributed. */
  netGain: number;
  /** netGain as a fraction of contributed. */
  returnPct: number;
  /** Sum of daily accrual across active positions. */
  dailyRate: number;
  tier: Tier | null;
  nextTier: Tier | null;
  /** 0..1 toward the next tier's entry, by lifetime contribution. */
  tierProgress: number;
  /** Capital still required to reach the next tier. */
  toNextTier: number;
  events: LedgerEvent[];
};

/* ── persistence ────────────────────────────────────────────────────────── */

export function loadEvents(): LedgerEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LedgerEvent[]) : [];
  } catch {
    return [];
  }
}

/** Raised when the log cannot be written, so callers can tell the member. */
export type PersistFailure = "quota" | "blocked";
let onPersistFailure: ((reason: PersistFailure) => void) | null = null;
export function setPersistFailureHandler(fn: (reason: PersistFailure) => void) {
  onPersistFailure = fn;
}

function saveEvents(events: LedgerEvent[]) {
  // The log is append-only and every figure is replayed from it, so events are
  // never dropped to make room. Losing the oldest `open` would erase the
  // position it created along with the contribution history behind the member's
  // tier. If the write fails we surface it instead of silently discarding.
  try {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  } catch (e) {
    const quota = e instanceof DOMException && (e.name === "QuotaExceededError" || e.code === 22);
    onPersistFailure?.(quota ? "quota" : "blocked");
  }
}

const listeners = new Set<() => void>();

/** Subscribe to ledger writes. Returns an unsubscribe function. */
export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  listeners.forEach((fn) => fn());
}

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

/** Omit that distributes over a union instead of collapsing it to the shared keys. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type NewEvent = DistributiveOmit<LedgerEvent, "id" | "at"> & { at?: number };

export function append(event: NewEvent): LedgerEvent {
  const full = { ...event, id: newId(), at: event.at ?? Date.now() } as LedgerEvent;
  const next = [...loadEvents(), full];
  saveEvents(next);
  emit();
  return full;
}

/** Wipe the ledger. Used by account reset in settings. */
export function clearLedger() {
  try {
    localStorage.removeItem(EVENTS_KEY);
  } catch {
    /* ignore */
  }
  emit();
}

/* ── derivation ─────────────────────────────────────────────────────────── */

function clamp(n: number, lo: number, hi: number) {
  return n < lo ? lo : n > hi ? hi : n;
}

/**
 * Rewards a position has generated by `now`. Accrual is continuous across the
 * term and stops at maturity, so a matured position holds at exactly 30%.
 */
function accruedAt(principal: number, openedAt: number, now: number, closedAt?: number): number {
  // Accrual stops at whichever comes first: maturity, settlement, or now. Without
  // the settlement bound a position closed early would keep earning to a full
  // term, inflating rewards that can never be claimed against anything.
  const end = closedAt !== undefined ? Math.min(now, closedAt) : now;
  const days = clamp((end - openedAt) / DAY_MS, 0, CYCLE_DAYS);
  return principal * DAILY_RATE * days;
}

export function derive(events: LedgerEvent[], now: number = Date.now()): Snapshot {
  const opens = events.filter(
    (e): e is Extract<LedgerEvent, { kind: "open" }> => e.kind === "open",
  );
  const claims = events.filter(
    (e): e is Extract<LedgerEvent, { kind: "claim" }> => e.kind === "claim",
  );
  const closes = events.filter(
    (e): e is Extract<LedgerEvent, { kind: "close" }> => e.kind === "close",
  );
  const withdraws = events.filter(
    (e): e is Extract<LedgerEvent, { kind: "withdraw" }> => e.kind === "withdraw",
  );

  // When a position was settled, so accrual can be stopped at that instant.
  const closedAtById = new Map<string, number>();
  for (const c of closes) {
    const prev = closedAtById.get(c.positionId);
    if (prev === undefined || c.at < prev) closedAtById.set(c.positionId, c.at);
  }

  const positions: Position[] = opens.map((o) => {
    const tier = tierById(o.tierId) ?? TIERS[0];
    const closedAt = closedAtById.get(o.id);
    const effectiveNow = closedAt !== undefined ? Math.min(now, closedAt) : now;
    const daysElapsed = clamp((effectiveNow - o.at) / DAY_MS, 0, CYCLE_DAYS);
    const accrued = accruedAt(o.amount, o.at, now, closedAt);
    const claimed = claims.filter((c) => c.positionId === o.id).reduce((s, c) => s + c.amount, 0);
    return {
      id: o.id,
      tierId: o.tierId,
      tier,
      principal: o.amount,
      openedAt: o.at,
      maturesAt: o.at + CYCLE_DAYS * DAY_MS,
      asset: o.asset,
      network: o.network,
      progress: daysElapsed / CYCLE_DAYS,
      daysElapsed,
      daysRemaining: Math.max(0, CYCLE_DAYS - daysElapsed),
      accrued,
      claimed,
      claimable: Math.max(0, accrued - claimed),
      termReward: o.amount * DAILY_RATE * CYCLE_DAYS,
      dailyReward: o.amount * DAILY_RATE,
      matured: now >= o.at + CYCLE_DAYS * DAY_MS,
      closed: closedAt !== undefined,
    };
  });

  const active = positions.filter((p) => !p.closed);

  const deployed = active.reduce((s, p) => s + p.principal, 0);
  const rewardsAccrued = positions.reduce((s, p) => s + p.accrued, 0);
  const rewardsClaimed = claims.reduce((s, c) => s + c.amount, 0);
  const rewardsPending = Math.max(0, rewardsAccrued - rewardsClaimed);
  const returnedPrincipal = positions.filter((p) => p.closed).reduce((s, p) => s + p.principal, 0);
  const withdrawn = withdraws.reduce((s, w) => s + w.amount, 0);
  const available = Math.max(0, rewardsClaimed + returnedPrincipal - withdrawn);

  const contributed = opens.reduce((s, o) => s + o.amount, 0);
  const portfolioValue = deployed + rewardsPending + available;
  const netGain = portfolioValue + withdrawn - contributed;

  const tier = tierForAmount(contributed);
  const next = tier ? (TIERS.find((t) => t.rank === tier.rank + 1) ?? null) : TIERS[0];
  const floor = tier?.entry ?? 0;
  const tierProgress = next ? clamp((contributed - floor) / (next.entry - floor), 0, 1) : 1;

  return {
    positions,
    activePositions: active,
    deployed,
    rewardsAccrued,
    rewardsClaimed,
    rewardsPending,
    available,
    withdrawn,
    portfolioValue,
    contributed,
    netGain,
    returnPct: contributed > 0 ? netGain / contributed : 0,
    dailyRate: active.filter((p) => !p.matured).reduce((s, p) => s + p.dailyReward, 0),
    tier,
    nextTier: next,
    tierProgress,
    toNextTier: next ? Math.max(0, next.entry - contributed) : 0,
    events: [...events].sort((a, b) => b.at - a.at),
  };
}

/* ── actions ────────────────────────────────────────────────────────────── */

export function openPosition(input: {
  amount: number;
  tierId: TierId;
  asset: string;
  network: string;
  at?: number;
}) {
  return append({ kind: "open", ...input });
}

export function claimRewards(positionId: string, amount: number) {
  return append({ kind: "claim", positionId, amount });
}

export function recordWithdrawal(amount: number, address: string) {
  return append({ kind: "withdraw", amount, address });
}

export function closePosition(positionId: string) {
  return append({ kind: "close", positionId });
}

/**
 * Historical portfolio value, one point per day, for performance charts.
 * Replays the ledger rather than storing snapshots so the series always
 * matches the current derivation logic.
 */
export function valueSeries(
  events: LedgerEvent[],
  days: number,
  now: number = Date.now(),
): { t: number; v: number }[] {
  const out: { t: number; v: number }[] = [];
  const start = now - days * DAY_MS;
  const step = (now - start) / Math.min(days, 90);
  for (let t = start; t <= now; t += step) {
    const upto = events.filter((e) => e.at <= t);
    out.push({ t, v: derive(upto, t).portfolioValue });
  }
  return out;
}
