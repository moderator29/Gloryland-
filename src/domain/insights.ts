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
import { DAILY_RATE, TIERS, WITHDRAW_INTERVAL_DAYS, dailyReward } from "./tiers";

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
 * Unclaimed reward is only worth surfacing once the amount clears both a flat
 * floor and a full day of accrual. The flat floor keeps trivial balances quiet
 * on small positions; the daily-accrual test keeps large portfolios, where a
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
 * A net return worth remarking on. Accrual is fast enough that a fraction of a
 * day clears this, so it is set where the figure has stopped being an artefact
 * of the first hours and starts describing the position.
 */
const STRONG_RETURN = 0.1;

/**
 * Cash is only "redeployable" once it clears the lowest tier entry, below
 * that there is no vault to put it into, so the prompt would be a dead end.
 */
const IDLE_CASH_FLOOR = TIERS[0].entry;

/** Highest priority first; every rule's weight is visible in one block. */
const P = {
  /**
   * The top weight, because a due relay is reward sitting outside a principal
   * with the decision already made: the member said fold it in, and it is
   * sitting still anyway. It is one action away from being fixed.
   */
  relayDue: 96,
  onboarding: 92,
  /** The same idle reward with no instruction on it, which is a decision. */
  reward: 88,
  /** Cash that cannot leave yet is a constraint, not a chore. */
  withdrawWindow: 74,
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
        body: `A vault accrues ${(DAILY_RATE * 100).toFixed(0)}% of its principal every day it is left in place, with no end date. A ${money(
          entry.entry,
        )} placement in ${entry.name} accrues ${money(
          dailyReward(entry.entry),
          2,
        )} a day. Withdrawals can be requested once every ${WITHDRAW_INTERVAL_DAYS} days.`,
        action: { label: "Browse vaults", to: "/app/vaults" },
        priority: P.onboarding,
      },
    ];
  }

  /* A relay that has come due is idle reward the member already decided about.
     It is reported before the general reward rule and its positions are taken
     out of that rule, so the same reward is never counted in two insights at
     once. */
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
      // The amount and the daily cost, and nothing beyond them. Multiplying the
      // idle rate out across a month would quote a figure for a stretch of
      // inaction nobody has taken, which is a projection rather than a fact.
      body: `${money(carry)} has been waiting ${fmtDays(
        num(worst.overdueDays),
      )} days to move${forgone > 0 ? `, which is ${money(forgone, 2)} a day of accrual it is not earning` : ""}. Running it writes the instruction you already gave.`,
      action: { label: "Fire it now", to: "/app" },
      priority: P.relayDue,
    });
  }

  /* Reward accrues on principal alone, so reward sitting outside a principal
     earns nothing at all. Folding it in is what puts it to work, and claiming
     it at least makes it spendable. Either way, leaving it is the one thing
     that costs something. */
  const idleReward = active
    .filter((p) => !relayed.has(p.id))
    .reduce((s, p) => s + num(p.claimable), 0);
  const dailyRate = num(snap.dailyRate);
  if (idleReward >= Math.max(CLAIM_FLOOR, dailyRate)) {
    const compounded = dailyReward(idleReward);
    out.push({
      id: "reward-idle",
      kind: "attention",
      title: `${money(idleReward)} in reward is not accruing`,
      body: `Reward accrues on principal, so this is sitting still. Folded back into principal it would add ${money(
        compounded,
        2,
      )} a day of its own. Claiming moves it to your balance instead, where it also sits still but can be withdrawn.`,
      action: { label: "Claim or compound", to: "/app/rewards" },
      priority: P.reward,
    });
  }

  /* Cash that cannot leave yet. Only worth saying when there is cash and a
     previous request to measure the window from: a closed window over an empty
     balance is a rule, not a fact about this member.

     The days are measured against the caller's clock rather than the
     snapshot's, so a list built for a specific instant stays honest even if the
     snapshot was derived a moment earlier. */
  const availableCash = num(snap.available);
  const unlocksAt = num(snap.withdrawUnlocksAt);
  const lastWithdrawAt = snap.lastWithdrawAt ?? null;
  if (availableCash > 0 && lastWithdrawAt !== null && now < unlocksAt) {
    const until = (unlocksAt - now) / DAY_MS;
    out.push({
      id: "withdraw-window",
      kind: "attention",
      title: `Withdrawals reopen in ${fmtDays(until)} days`,
      body: `${money(availableCash)} is in your balance. A withdrawal can be requested once every ${WITHDRAW_INTERVAL_DAYS} days, and the last request was ${fullDate(
        lastWithdrawAt,
      )}, so the next one can be made on ${fullDate(unlocksAt)}.`,
      action: { label: "See the window", to: "/app/horizon" },
      priority: P.withdrawWindow,
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
  if (availableCash >= IDLE_CASH_FLOOR) {
    out.push({
      id: "idle-cash",
      kind: "opportunity",
      title: `${money(availableCash)} sitting idle`,
      body: `Available cash does not accrue. Placed into a vault it would add ${money(
        dailyReward(availableCash),
        2,
      )} a day, for as long as you left it there.`,
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
