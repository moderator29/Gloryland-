/**
 * The intelligence layer: turns a `Snapshot` into a short, ranked list of
 * things the member should actually do something about.
 *
 * Everything here is pure and deterministic — the only inputs are the
 * snapshot and the clock, and every sentence interpolates a real figure that
 * came out of the ledger. Nothing is invented, nothing is sampled, and the
 * same snapshot always produces the same list, so the surface can re-render
 * on every tick without the copy flickering between alternatives.
 */

import { fullDate, money, pct, days as fmtDays } from "@/components/system/format";
import { DAY_MS, type Position, type Snapshot } from "./ledger";
import { CYCLE_DAYS, DAILY_RATE, TIERS, termReward } from "./tiers";

export type Insight = {
  id: string;
  kind: "opportunity" | "milestone" | "performance" | "attention";
  title: string;
  body: string;
  action?: { label: string; to: string };
  priority: number;
};

/* ── thresholds ─────────────────────────────────────────────────────────────
   Each one is a judgement about when a fact becomes worth interrupting
   someone for. They live together so the noise floor of the whole feed can be
   read — and tuned — in one place. */

/**
 * A term is 30 days, so three days is the last tenth of it: long enough that
 * a member can still arrange where the principal goes next, short enough that
 * the notice does not sit in the feed for weeks.
 */
const MATURING_WINDOW_DAYS = 3;

/**
 * Claims are only worth surfacing once the amount clears both a flat floor
 * and a full day of accrual. The flat floor keeps trivial balances quiet on
 * small positions; the daily-accrual test keeps large portfolios — where a
 * single day is worth far more than the floor — from nagging hourly.
 */
const CLAIM_FLOOR = 25;

/**
 * "Within 25% of the next tier" is measured on the gap between the current
 * tier's entry and the next one, which is what `tierProgress` already tracks.
 * Three quarters of the way up a rung is the point where the remaining step
 * is small enough to be a realistic decision rather than an aspiration.
 */
const TIER_PROXIMITY = 0.75;

/**
 * Accrual is 1% a day, so a 10% net return means roughly a third of a term
 * has been completed and compounding is visibly working. Below that the
 * number is too young to be worth congratulating anyone over.
 */
const STRONG_RETURN = 0.1;

/**
 * Cash is only "redeployable" once it clears the lowest tier entry — below
 * that there is no vault to put it into, so the prompt would be a dead end.
 */
const IDLE_CASH_FLOOR = TIERS[0].entry;

/** Highest priority first; every rule's weight is visible in one block. */
const P = {
  matured: 100,
  onboarding: 92,
  maturing: 88,
  claim: 74,
  tier: 62,
  idleCash: 54,
  performance: 30,
} as const;

const MAX_INSIGHTS = 5;

/** Defensive read: a malformed or partial snapshot must never throw. */
function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function list<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

/**
 * Days left on a term, measured against the caller's clock rather than the
 * snapshot's, so an insight list built for a specific instant stays honest
 * even if the snapshot was derived a moment earlier.
 */
function daysLeft(p: Position, now: number): number {
  const matures = num(p.maturesAt);
  if (matures > 0) return Math.max(0, (matures - now) / DAY_MS);
  return Math.max(0, num(p.daysRemaining));
}

export function buildInsights(snap: Snapshot, now: number = Date.now()): Insight[] {
  const out: Insight[] = [];
  if (!snap) return out;

  const positions = list<Position>(snap.positions);
  const active = list<Position>(snap.activePositions).length
    ? list<Position>(snap.activePositions)
    : positions.filter((p) => !p.closed);

  /* No capital has ever been placed: one clear way in, and nothing else,
     because every other rule would either be empty or read as noise. */
  if (positions.length === 0) {
    const entry = TIERS[0];
    return [
      {
        id: "onboarding",
        kind: "opportunity",
        title: "Open your first vault",
        body: `Every vault runs a ${CYCLE_DAYS}-day term at ${(DAILY_RATE * 100).toFixed(
          0,
        )}% a day. A ${money(entry.entry)} placement in ${entry.name} returns ${money(
          termReward(entry.entry),
        )} across the term.`,
        action: { label: "Browse vaults", to: "/app/vaults" },
        priority: P.onboarding,
      },
    ];
  }

  /* Principal that finished its term and is still sitting in the vault earns
     nothing — accrual stops at maturity — so this outranks everything else. */
  const matured = active.filter((p) => daysLeft(p, now) <= 0);
  if (matured.length > 0) {
    const principal = matured.reduce((s, p) => s + num(p.principal), 0);
    const claimable = matured.reduce((s, p) => s + num(p.claimable), 0);
    const one = matured[0];
    out.push({
      id: "matured-idle",
      kind: "attention",
      title:
        matured.length === 1
          ? `${one.tier?.name ?? "Vault"} position has matured`
          : `${matured.length} positions have matured`,
      body: `${money(principal)} finished its ${CYCLE_DAYS}-day term and stopped accruing${
        claimable > 0 ? `, with ${money(claimable)} in rewards still unclaimed` : ""
      }. Close it to move the principal into available cash.`,
      action: { label: "Review positions", to: "/app/vaults" },
      priority: P.matured,
    });
  }

  /* The soonest maturity inside the window. Only one is surfaced: a list of
     five near-identical countdowns would crowd out every other insight. */
  const maturingSoon = active
    .filter((p) => {
      const left = daysLeft(p, now);
      return left > 0 && left <= MATURING_WINDOW_DAYS;
    })
    .sort((a, b) => daysLeft(a, now) - daysLeft(b, now));
  const soonest = maturingSoon[0];
  if (soonest) {
    const remaining = daysLeft(soonest, now);
    out.push({
      id: `maturing-${soonest.id}`,
      kind: "attention",
      title: `${soonest.tier?.name ?? "Vault"} matures in ${fmtDays(remaining)} days`,
      body: `${money(num(soonest.principal))} plus ${money(
        num(soonest.termReward),
      )} in rewards unlocks on ${fullDate(num(soonest.maturesAt))}${
        maturingSoon.length > 1 ? `, with ${maturingSoon.length - 1} more close behind` : ""
      }. Decide now whether it redeploys or settles.`,
      action: { label: "Plan the term", to: "/app/vaults" },
      priority: P.maturing,
    });
  }

  /* Rewards earned but not yet moved into cash. */
  const pending = num(snap.rewardsPending);
  const dailyRate = num(snap.dailyRate);
  if (pending >= Math.max(CLAIM_FLOOR, dailyRate)) {
    out.push({
      id: "claimable",
      kind: "opportunity",
      title: `${money(pending)} ready to claim`,
      body: `Your positions have generated ${money(pending)} in unclaimed rewards${
        dailyRate > 0 ? `, growing by ${money(dailyRate)} a day` : ""
      }. Claiming moves it into available cash.`,
      action: { label: "Claim rewards", to: "/app/rewards" },
      priority: P.claim,
    });
  }

  /* Close enough to the next rung that the remaining capital is a decision. */
  const next = snap.nextTier;
  const toNext = num(snap.toNextTier);
  if (next && toNext > 0 && num(snap.tierProgress) >= TIER_PROXIMITY) {
    out.push({
      id: "tier-proximity",
      kind: "milestone",
      title: `${money(toNext)} from ${next.name}`,
      body: `Lifetime contribution stands at ${money(
        num(snap.contributed),
      )} against the ${money(next.entry)} ${next.name} entry. ${money(
        toNext,
      )} more unlocks ${next.settlementHours}h settlement.`,
      action: { label: "See the ladder", to: "/app/tiers" },
      priority: P.tier,
    });
  }

  /* Cash that clears the lowest entry is capital choosing not to accrue. */
  const availableCash = num(snap.available);
  if (availableCash >= IDLE_CASH_FLOOR) {
    out.push({
      id: "idle-cash",
      kind: "opportunity",
      title: `${money(availableCash)} sitting idle`,
      body: `Available cash does not accrue. Redeployed across a ${CYCLE_DAYS}-day term it would return ${money(
        termReward(availableCash),
      )}.`,
      action: { label: "Redeploy capital", to: "/app/vaults" },
      priority: P.idleCash,
    });
  }

  /* Performance is the one rule that asks for nothing — it has no action and
     the lowest weight, so it fills the feed only when nothing needs doing. */
  const returnPct = num(snap.returnPct);
  if (num(snap.contributed) > 0 && returnPct >= STRONG_RETURN) {
    out.push({
      id: "performance",
      kind: "performance",
      title: `Up ${pct(returnPct).replace(/^\+/, "")} since inception`,
      body: `${money(num(snap.portfolioValue))} against ${money(
        num(snap.contributed),
      )} contributed — a net gain of ${money(num(snap.netGain))}.`,
      priority: P.performance,
    });
  }

  /* Priority first, id second: the tiebreak keeps the order stable across
     renders even when two rules land on the same weight. */
  return out
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
    .slice(0, MAX_INSIGHTS);
}
