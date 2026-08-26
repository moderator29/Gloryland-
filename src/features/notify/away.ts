import { DAY_MS, type Position, type Snapshot } from "@/domain/ledger";
import { DAILY_RATE, TIERS, WITHDRAW_INTERVAL_DAYS } from "@/domain/tiers";

/**
 * What happened while the member was gone.
 *
 * Six notification categories are stored and none can be delivered, because
 * delivering one needs a push server and there is not one. That gap matters
 * most for exactly the two events worth knowing about: a term reaching
 * maturity, and a relay that has come due and is waiting for the member to
 * return before it can run. Both happen while nobody is looking.
 *
 * This is the half of that problem which is solvable without a server. Nothing
 * is pushed. Instead the product notices, on the next visit, what changed
 * since the last one, and says so once. Every item derives from the ledger and
 * two instants, so there is no queue to drift, nothing that can be delivered
 * twice, and nothing stored that could disagree with the log.
 *
 * The dishonest version of this feature would keep an invented notification
 * history. This one cannot: clear the ledger and there is nothing to report,
 * which is the correct answer.
 *
 * Figures are returned as numbers, never as formatted strings. A derivation
 * that formats currency is a derivation that has to know a locale.
 */

const SEEN_KEY = "rgl_last_seen_v1";

/** Below this, a return is the same visit and there is nothing to catch up on. */
const MIN_GAP_MS = 6 * 3_600_000;

export type AwayItemKind = "relayDue" | "window" | "claimable" | "idle";

export type AwayItem = {
  kind: AwayItemKind;
  /** Ordering weight. Higher is more urgent. */
  weight: number;
  title: string;
  body: string;
  /** Where acting on it starts. */
  to: string;
  action: string;
  /** The figure at stake, unformatted. Absent when there is not one. */
  amount?: number;
  /** Days this has been true, for the items where waiting has a cost. */
  waitingDays?: number;
  /** What the wait costs per day. */
  costPerDay?: number;
};

export type Away = {
  /** When the member was last here, or null on a first visit. */
  lastSeen: number | null;
  /** How long they were gone. Zero on a first visit. */
  gapMs: number;
  /** A real gap, and something to say about it. */
  show: boolean;
  items: AwayItem[];
  /** Accrual added across the absence, on terms that were actually running. */
  accruedWhileAway: number;
};

/* ── the timestamp ──────────────────────────────────────────────────────── */

export function readLastSeen(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = Number(localStorage.getItem(SEEN_KEY));
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  } catch {
    return null;
  }
}

/**
 * Stamp this visit.
 *
 * Called once the digest has been shown rather than on mount, because
 * otherwise the act of arriving erases the thing the member arrived to see.
 */
export function markSeen(at: number = Date.now()) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SEEN_KEY, String(at));
  } catch {
    /* a blocked store costs the digest, never the session */
  }
}

/* ── the derivation ─────────────────────────────────────────────────────── */

/**
 * Build the digest. Pure: a function of the snapshot and two instants, so it
 * never reads a clock in the middle of a render and can be tested exactly.
 */
export function deriveAway(
  snap: Snapshot,
  lastSeen: number | null,
  now: number = Date.now(),
): Away {
  const gapMs = lastSeen === null ? 0 : Math.max(0, now - lastSeen);
  const items: AwayItem[] = [];

  // Accrual across the absence, counted only for the stretch a position was
  // actually running. A position opened after the member left accrues from its
  // own start. Nothing matures any more, so the only upper bound is now.
  let accruedWhileAway = 0;
  if (lastSeen !== null) {
    for (const p of snap.positions) {
      if (p.closed) continue;
      const from = Math.max(lastSeen, p.startsAt);
      if (now > from) accruedWhileAway += p.principal * DAILY_RATE * ((now - from) / DAY_MS);
    }
  }

  // The most expensive thing an absence costs: a relay that came due and could
  // not run, because running it needs the member to be here.
  for (const relay of snap.relaysDue) {
    items.push({
      kind: "relayDue",
      weight: 100,
      title: "A relay is waiting to run",
      body: "It fires the next time you are here, never before, so the wait is capital sitting still.",
      to: `/app/vaults/${relay.positionId}`,
      action: "Run it",
      amount: relay.carries,
      waitingDays: relay.overdueDays,
      costPerDay: relay.forgoneDaily,
    });
  }

  // The withdrawal window opening is the one date the member was waiting on,
  // and it can pass while they are away. Nothing matures any more, so this
  // replaced the matured item entirely.
  if (lastSeen !== null && snap.withdrawAllowed && snap.lastWithdrawAt !== null) {
    items.push({
      kind: "window",
      weight: 90,
      title: "Your withdrawal window is open",
      body: `A request can be made now, and the next one opens ${WITHDRAW_INTERVAL_DAYS} days after it. Nothing closes while you decide.`,
      to: "/app/desk",
      action: "Open the desk",
      amount: snap.available + snap.rewardsPending,
      waitingDays: Math.max(0, (now - snap.withdrawUnlocksAt) / DAY_MS),
    });
  }

  if (snap.rewardsPending >= 1) {
    items.push({
      kind: "claimable",
      weight: 60,
      title: "Rewards are ready to claim",
      body: "Claiming moves what has already accrued into available cash and leaves the position running.",
      to: "/app/rewards",
      action: "Claim",
      amount: snap.rewardsPending,
    });
  }

  // Idle cash never announces itself and never earns.
  if (snap.available >= TIERS[0].entry) {
    items.push({
      kind: "idle",
      weight: 40,
      title: "Cash is sitting still",
      body: "Only capital inside a vault accrues. An available balance earns nothing at all.",
      to: "/app/vaults/new?source=balance",
      action: "Place it",
      amount: snap.available,
      costPerDay: snap.available * DAILY_RATE,
    });
  }

  items.sort((a, b) => b.weight - a.weight || (b.amount ?? 0) - (a.amount ?? 0));

  return {
    lastSeen,
    gapMs,
    show: lastSeen !== null && gapMs >= MIN_GAP_MS && items.length > 0,
    items,
    accruedWhileAway,
  };
}

/** Whole days away, for a heading. Never below one once the gap qualifies. */
export function daysAway(gapMs: number): number {
  return Math.max(1, Math.round(gapMs / DAY_MS));
}
