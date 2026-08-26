/**
 * The intelligence layer: turns a `Snapshot` into a short, ranked list of
 * things the member should actually do something about.
 *
 * Everything here is pure and deterministic, the only inputs are the
 * snapshot and the clock, and every sentence interpolates a real figure that
 * came out of the ledger. Nothing is invented, nothing is sampled, and the
 * same snapshot always produces the same list, so the surface can re-render
 * on every tick without the copy flickering between alternatives.
 */

import { fullDate, money, pct, days as fmtDays } from "@/components/system/format";
import { DAY_MS, type Position, type Relay, type Snapshot } from "./ledger";
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
   read, and tuned, in one place. */

/**
 * A term is 30 days, so three days is the last tenth of it: long enough that
 * a member can still arrange where the principal goes next, short enough that
 * the notice does not sit in the feed for weeks.
 */
const MATURING_WINDOW_DAYS = 3;

/**
 * Claims are only worth surfacing once the amount clears both a flat floor
 * and a full day of accrual. The flat floor keeps trivial balances quiet on
 * small positions; the daily-accrual test keeps large portfolios, where a
 * single day is worth far more than the floor, from nagging hourly.
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
 * Cash is only "redeployable" once it clears the lowest tier entry, below
 * that there is no vault to put it into, so the prompt would be a dead end.
 */
const IDLE_CASH_FLOOR = TIERS[0].entry;

/** Highest priority first; every rule's weight is visible in one block. */
const P = {
  matured: 100,
  /**
   * Just under `matured`, because a due relay is a matured term with the
   * decision already made: the member said carry it, and it is sitting still
   * anyway. It is one action away from being fixed, which is why it outranks
   * everything below it.
   */
  relayDue: 96,
  onboarding: 92,
  maturing: 88,
  claim: 74,
  tier: 62,
  idleCash: 54,
  performance: 30,
} as const;

const MAX_INSIGHTS = 5;

/**
 * The two figures in the tier proximity line, rounded once so they add up.
 *
 * The surface's whole claim is that its arithmetic can be checked, so a member
 * who reads "standing is $1,690 against the $3,000 entry, $1,310 more" must be
 * able to add the first and the last and get the middle. Rounding standing and
 * the gap separately breaks that on any half cent, so the gap is measured from
 * the standing as it will be printed rather than from the raw figure.
 */
export function tierProximity(standing: number, entry: number): { shown: number; gap: number } {
  const shown = Math.round(standing);
  return { shown, gap: Math.max(0, entry - shown) };
}

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

  /* A relay that has come due is a matured term the member already decided
     about. It is reported before the general matured rule and its positions
     are taken out of that rule, so the same idle capital is never counted in
     two insights at once. */
  const relaysDue = list<Relay>(snap.relaysDue);
  const relayed = new Set(relaysDue.map((r) => r.positionId));
  if (relaysDue.length > 0) {
    const carry = num(snap.relayCarry);
    const forgone = num(snap.relayForgoneDaily);
    const worst = relaysDue.reduce((a, b) => (num(a.overdueDays) > num(b.overdueDays) ? a : b));
    out.push({
      id: "relay-due",
      kind: "attention",
      title:
        relaysDue.length === 1
          ? "A relay is waiting to run"
          : `${relaysDue.length} relays are waiting to run`,
      // The carry and the daily cost, and nothing beyond them. Multiplying the
      // idle rate out across a term would quote a figure for a month of
      // inaction nobody has taken, which is a projection rather than a fact.
      body: `${money(carry)} has been sitting matured for ${fmtDays(
        num(worst.overdueDays),
      )} days and is not accruing, which is ${money(
        forgone,
        2,
      )} a day. Firing it carries the whole amount straight into a new ${CYCLE_DAYS}-day term.`,
      action: { label: "Fire it now", to: "/app" },
      priority: P.relayDue,
    });
  }

  /* Principal that finished its term and is still sitting in the vault earns
     nothing, accrual stops at maturity, so this outranks everything else. */
  const matured = active.filter((p) => daysLeft(p, now) <= 0 && !relayed.has(p.id));
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
      // The advice is the relay, not a review. Settling and re-placing by hand
      // is the chore that leaves capital idle in the first place, and a relay
      // is the standing instruction that removes it.
      body: `${money(principal)} finished its ${CYCLE_DAYS}-day term and stopped accruing${
        claimable > 0 ? `, with ${money(claimable)} in rewards still unclaimed` : ""
      }. Roll it into a new term, settle it to cash, or arm a relay so the next one carries itself.`,
      action:
        matured.length === 1
          ? { label: "Arm a relay", to: `/app/vaults/${one.id}` }
          : { label: "Review positions", to: "/app/vaults" },
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
  const { shown, gap } = tierProximity(num(snap.standing), next?.entry ?? 0);
  // `gap > 0` drops the sub-dollar case, where standing rounds to the entry it
  // has not actually crossed. A "$0 away" line would be the same arithmetic
  // failure in the other direction, and the tier itself lands within the day.
  if (next && toNext > 0 && gap > 0 && num(snap.tierProgress) >= TIER_PROXIMITY) {
    // Standing is the greater of what came in and the most ever at work, so a
    // member who compounded reads a figure larger than anything they deposited.
    // Naming which of the two it is here is the difference between a number
    // that checks out and a number that looks wrong.
    const basis =
      shown > Math.round(num(snap.contributed))
        ? "the most you have had at work at one time"
        : "everything you have brought in";
    out.push({
      id: "tier-proximity",
      kind: "milestone",
      title: `${money(gap)} from ${next.name}`,
      body: `Standing is ${money(shown)}, ${basis}, against the ${money(next.entry)} ${
        next.name
      } entry. ${money(gap)} more reaches it, and ${next.name} settles in ${
        next.settlementHours
      }h.`,
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

  /* Performance is the one rule that asks for nothing, it has no action and
     the lowest weight, so it fills the feed only when nothing needs doing. */
  const returnPct = num(snap.returnPct);
  if (num(snap.contributed) > 0 && returnPct >= STRONG_RETURN) {
    out.push({
      id: "performance",
      kind: "performance",
      title: `Up ${pct(returnPct).replace(/^\+/, "")} since inception`,
      body: `${money(num(snap.portfolioValue))} against ${money(
        num(snap.contributed),
      )} contributed, a net gain of ${money(num(snap.netGain))}.`,
      priority: P.performance,
    });
  }

  /* Priority first, id second: the tiebreak keeps the order stable across
     renders even when two rules land on the same weight. */
  return out
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
    .slice(0, MAX_INSIGHTS);
}
