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

export type EventKind = "open" | "claim" | "withdraw" | "close" | "relay.set" | "relay.clear";

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
      /**
       * True when this position was funded from the balance already in the
       * account rather than from money brought in from outside.
       *
       * Without it the two cases are indistinguishable, and settling a term
       * then re-placing the same capital counted as if fresh money had
       * arrived: the balance was credited on settlement and never debited on
       * placement, so the portfolio doubled on every roll and tier standing
       * climbed on money that was only ever deposited once. Absent means
       * external, which is how every event written before this field existed
       * was treated.
       */
      fromAvailable?: boolean;
    }
  /** Accrued rewards moved from a position into available cash. */
  | { id: string; kind: "claim"; at: number; amount: number; positionId: string }
  /** Cash sent out to an external address. */
  | { id: string; kind: "withdraw"; at: number; amount: number; address: string }
  /** A matured position returned its principal to available cash. */
  | { id: string; kind: "close"; at: number; positionId: string }
  /**
   * A standing instruction on a position: at maturity, carry it into a new
   * term rather than letting it sit still. The latest relay event for a
   * position wins, so arming, changing mode and disarming are one mechanism
   * and the whole history stays readable in Ledger.
   */
  | { id: string; kind: "relay.set"; at: number; positionId: string; mode: RelayMode }
  | { id: string; kind: "relay.clear"; at: number; positionId: string };

/** What a relay carries forward. */
export type RelayMode = "full" | "principal";

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

/**
 * A relay as the product sees it, derived rather than stored.
 *
 * `carries` reads the position's own `claimable`, not principal times the
 * term rate, so a member who claimed mid term carries principal plus whatever
 * is actually left. Anything else would quote a figure the ledger cannot pay.
 */
export type Relay = {
  positionId: string;
  mode: RelayMode;
  setAt: number;
  /** The instruction stands: latest event is a set, and the term is still open. */
  armed: boolean;
  /** When it will fire, which is the position's maturity. */
  firesAt: number;
  /** Armed, matured and not yet settled, so it is waiting to run. */
  due: boolean;
  /** What the new term would open with. */
  carries: number;
  /** How long it has been sitting matured and earning nothing. */
  overdueDays: number;
  /** What that idleness costs per day, at the rate the carry would earn. */
  forgoneDaily: number;
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
  /** External capital ever brought in. Excludes anything re-placed from the
   *  account balance, which is money that was already counted once. */
  contributed: number;
  /** The most principal ever deployed at one time. */
  peakDeployed: number;
  /**
   * What tier standing is measured on: the greater of external capital and
   * peak deployed. Contribution alone would strand a member who compounds,
   * and peak alone would ignore capital that was settled and withdrawn.
   * Neither figure can be inflated by moving the same money in a circle.
   */
  standing: number;
  /** portfolioValue + withdrawn - contributed. */
  netGain: number;
  /** netGain as a fraction of contributed. */
  returnPct: number;
  /** Sum of daily accrual across active positions. */
  dailyRate: number;
  tier: Tier | null;
  nextTier: Tier | null;
  /** 0..1 toward the next tier's entry, measured on `standing`. */
  tierProgress: number;
  /** Capital still required to reach the next tier. */
  toNextTier: number;
  /** Every position that has ever had a relay instruction, armed or not. */
  relays: Relay[];
  relaysArmed: Relay[];
  /** Armed relays whose term has matured and which are waiting to run. */
  relaysDue: Relay[];
  /** Total capital those due relays would put back to work. */
  relayCarry: number;
  /** What leaving them unfired costs per day. */
  relayForgoneDaily: number;
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
  return appendMany([event])[0];
}

/**
 * Write several events as one.
 *
 * A relay firing is a claim, a close and an open that only make sense
 * together: persisting them one at a time would leave a log where the term
 * closed and nothing reopened if the write failed halfway. One read, one
 * write, one notification.
 */
export function appendMany(events: NewEvent[]): LedgerEvent[] {
  if (events.length === 0) return [];
  const now = Date.now();
  const written = events.map(
    (e) => ({ ...e, id: (e as { id?: string }).id ?? newId(), at: e.at ?? now }) as LedgerEvent,
  );
  saveEvents([...loadEvents(), ...written]);
  emit();
  return written;
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

  // Capital re-placed from the balance leaves the balance. Capital brought in
  // from outside never touched it, so it must not be debited here.
  const recycled = opens.filter((o) => o.fromAvailable).reduce((s, o) => s + o.amount, 0);
  const available = Math.max(0, rewardsClaimed + returnedPrincipal - withdrawn - recycled);

  const contributed = opens.filter((o) => !o.fromAvailable).reduce((s, o) => s + o.amount, 0);

  // The most principal that was ever deployed at one instant. Replayed rather
  // than accumulated, because a position that closed must lower the running
  // total before the next open raises it again.
  let running = 0;
  let peakDeployed = 0;
  const timeline = [
    ...opens.map((o) => ({ at: o.at, delta: o.amount })),
    ...closes.map((c) => ({
      at: c.at,
      delta: -(opens.find((o) => o.id === c.positionId)?.amount ?? 0),
    })),
  ]
    // A roll settles and re-places in the same instant. Closing first is what
    // stops that instant reading as if both terms were open at once, which
    // would put the peak at the sum of the two rather than the larger.
    .sort((a, b) => a.at - b.at || a.delta - b.delta);
  for (const step of timeline) {
    running += step.delta;
    if (running > peakDeployed) peakDeployed = running;
  }

  // Relays. The latest instruction per position wins, so a member can arm,
  // change mode and disarm without the log needing anything removed from it.
  const byPosition = new Map<string, Extract<LedgerEvent, { kind: "relay.set" | "relay.clear" }>>();
  for (const e of events) {
    if (e.kind !== "relay.set" && e.kind !== "relay.clear") continue;
    const prev = byPosition.get(e.positionId);
    if (prev === undefined || e.at >= prev.at) byPosition.set(e.positionId, e);
  }

  const positionById = new Map(positions.map((p) => [p.id, p]));
  const relays: Relay[] = [];
  for (const [positionId, e] of byPosition) {
    const p = positionById.get(positionId);
    if (!p) continue;
    const mode: RelayMode = e.kind === "relay.set" ? e.mode : "full";
    const armed = e.kind === "relay.set" && !p.closed;
    const due = armed && p.matured;
    const carries = mode === "full" ? p.principal + p.claimable : p.principal;
    relays.push({
      positionId,
      mode,
      setAt: e.at,
      armed,
      firesAt: p.maturesAt,
      due,
      carries,
      overdueDays: due ? Math.max(0, (now - p.maturesAt) / DAY_MS) : 0,
      forgoneDaily: due ? carries * DAILY_RATE : 0,
    });
  }
  relays.sort((a, b) => a.firesAt - b.firesAt);

  const relaysArmed = relays.filter((r) => r.armed);
  const relaysDue = relays.filter((r) => r.due);

  const standing = Math.max(contributed, peakDeployed);
  const portfolioValue = deployed + rewardsPending + available;
  const netGain = portfolioValue + withdrawn - contributed;

  const tier = tierForAmount(standing);
  const next = tier ? (TIERS.find((t) => t.rank === tier.rank + 1) ?? null) : TIERS[0];
  const floor = tier?.entry ?? 0;
  const tierProgress = next ? clamp((standing - floor) / (next.entry - floor), 0, 1) : 1;

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
    peakDeployed,
    standing,
    netGain,
    returnPct: contributed > 0 ? netGain / contributed : 0,
    dailyRate: active.filter((p) => !p.matured).reduce((s, p) => s + p.dailyReward, 0),
    tier,
    nextTier: next,
    tierProgress,
    toNextTier: next ? Math.max(0, next.entry - standing) : 0,
    relays,
    relaysArmed,
    relaysDue,
    relayCarry: relaysDue.reduce((sum, r) => sum + r.carries, 0),
    relayForgoneDaily: relaysDue.reduce((sum, r) => sum + r.forgoneDaily, 0),
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
  /** Set when the placement is funded from the account balance. */
  fromAvailable?: boolean;
}) {
  return append({ kind: "open", ...input });
}

export function claimRewards(positionId: string, amount: number) {
  return append({ kind: "claim", positionId, amount });
}

export function recordWithdrawal(amount: number, address: string) {
  return append({ kind: "withdraw", amount, address });
}

/** Arm a relay, or change the mode on one that is already armed. */
export function armRelay(positionId: string, mode: RelayMode) {
  return append({ kind: "relay.set", positionId, mode });
}

export function disarmRelay(positionId: string) {
  return append({ kind: "relay.clear", positionId });
}

/**
 * Run one due relay: settle the matured term and open the next with what it
 * carried, as a single write.
 *
 * Two rules hold this honest. Every event is stamped now rather than at the
 * maturity date, because backdating would fabricate accrual for the days the
 * capital actually sat still. And the new position is marked as funded from
 * the balance, because the money was already counted when it first arrived,
 * so counting it again would inflate the portfolio and buy tier standing that
 * was never paid for.
 */
export function fireRelay(relay: Relay, position: Position): LedgerEvent[] {
  if (!relay.due) return [];

  const claiming = relay.mode === "full" ? position.claimable : 0;
  const carry = Math.round((position.principal + claiming) * 100) / 100;
  const tier = tierForAmount(carry) ?? position.tier;
  const nextId = newId();

  return appendMany([
    ...(position.claimable >= 0.01
      ? [{ kind: "claim" as const, positionId: position.id, amount: position.claimable }]
      : []),
    { kind: "close" as const, positionId: position.id },
    {
      id: nextId,
      kind: "open" as const,
      amount: carry,
      tierId: tier.id,
      asset: position.asset,
      network: position.network,
      fromAvailable: true,
    } as NewEvent,
    // The chain continues, so a member arms once rather than every month.
    { kind: "relay.set" as const, positionId: nextId, mode: relay.mode },
  ]);
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
