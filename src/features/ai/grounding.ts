/**
 * What the assistants are told about the member, and how their state is read.
 *
 * Two jobs live here. The first is the grounding block: a compact, factual
 * statement of the figures the product has already derived from the member's
 * own ledger, which the server hands to the model as fact. The second is a
 * plain reading of what situation the member is actually in, which both the
 * grounding block and the starter questions need.
 *
 * Nothing in this file computes a figure. Every number is read straight off
 * the snapshot, so the block can never disagree with the screen the member is
 * looking at. Where the ledger holds nothing, the block says so rather than
 * sending zeroes that read as a real position.
 */

import type { Position, Relay, Snapshot } from "@/domain/ledger";
import type { Approach } from "@/domain/identity";
import { TIERS } from "@/domain/tiers";
import { fullDate, money, pct } from "@/components/system/format";

/** Cash below the first rung's entry cannot open anything, so it is not "redeployable". */
const IDLE_FLOOR = TIERS[0].entry;

/** Small enough that claiming it is not worth prompting anyone about. */
const CLAIM_FLOOR = 1;

/** Three quarters of the way up a rung is where the remaining step is a real decision. */
const NEAR_TIER = 0.75;

export type MemberState = {
  /** Nothing has ever been placed. */
  empty: boolean;
  hasOpen: boolean;
  /**
   * Reward sitting outside principal, which earns nothing until it is folded
   * back in. This replaced a matured list: positions no longer end, so the
   * thing worth flagging is idle reward rather than a finished term.
   */
  unfolded: number;
  /** The largest open position, which is the one worth naming first. */
  largest: Position | null;
  claimable: number;
  idleCash: number;
  /** Within reach of the next rung, and there is a next rung. */
  nearNextTier: boolean;
  /** Standing was set by peak deployed rather than by external capital. */
  standingFromPeak: boolean;
  /** Standing instructions currently in force. */
  relaysArmed: Relay[];
  /** Armed, past its fire time and waiting to run. */
  relaysDue: Relay[];
};

export function memberState(snap: Snapshot): MemberState {
  const open = snap.activePositions;
  const largest = [...open].sort((a, b) => b.principal - a.principal)[0] ?? null;

  return {
    empty: snap.positions.length === 0,
    hasOpen: open.length > 0,
    unfolded: snap.rewardsPending,
    largest,
    claimable: snap.rewardsPending,
    idleCash: snap.available,
    nearNextTier: Boolean(snap.nextTier) && snap.tierProgress >= NEAR_TIER && snap.toNextTier > 0,
    standingFromPeak: snap.peakDeployed > snap.contributed,
    relaysArmed: snap.relaysArmed,
    relaysDue: snap.relaysDue,
  };
}

export { IDLE_FLOOR, CLAIM_FLOOR };

/** Positions listed individually before the block starts summarising instead. */
const POSITION_LIMIT = 6;

function positionLine(p: Position): string {
  // No term, so no progress through one: the honest reading is how long it has
  // been running and what it adds each day it keeps running.
  return `  ${p.tier.name}, ${money(p.principal)} principal, opened ${fullDate(p.openedAt)}, running ${p.daysElapsed.toFixed(1)} days, ${money(p.accrued, 2)} accrued, ${money(p.claimable, 2)} claimable, ${money(p.dailyReward, 2)} per day`;
}

/**
 * The member's position, as the assistants receive it.
 *
 * Every line is one derived figure with the name the product uses for it, so
 * the model can quote a figure back without having to work out what it is.
 */
export function positionBriefing(snap: Snapshot, approach: Approach): string {
  const state = memberState(snap);
  const lines: string[] = [];

  if (state.empty) {
    lines.push(
      "No capital has ever been placed. This member's ledger holds no positions, so every figure below would be zero and none of them describe a real position.",
    );
  } else {
    lines.push(
      `Portfolio value: ${money(snap.portfolioValue, 2)}`,
      `Deployed in open vaults: ${money(snap.deployed)}`,
      `Unclaimed rewards: ${money(snap.rewardsPending, 2)}`,
      `Available cash: ${money(snap.available, 2)}`,
      `Accruing per day: ${money(snap.dailyRate, 2)}`,
      `Lifetime rewards accrued: ${money(snap.rewardsAccrued, 2)}`,
      `Rewards claimed to date: ${money(snap.rewardsClaimed, 2)}`,
      `Withdrawn to date: ${money(snap.withdrawn, 2)}`,
      `Contributed (external capital only): ${money(snap.contributed)}`,
      `Peak deployed (most principal open at one instant): ${money(snap.peakDeployed)}`,
      `Standing (the greater of those two, and what tier is measured on): ${money(snap.standing)}`,
      `Net gain: ${money(snap.netGain, 2)}`,
      `Return to date: ${pct(snap.returnPct)}`,
    );
  }

  lines.push(
    snap.tier
      ? `Tier: ${snap.tier.name}, rank ${snap.tier.rank} of ${TIERS.length}, settlement target ${snap.tier.settlementHours} hours`
      : `Tier: unranked, below the ${money(TIERS[0].entry)} ${TIERS[0].name} entry`,
    snap.nextTier
      ? `Next tier: ${snap.nextTier.name} at ${money(snap.nextTier.entry)}, ${money(snap.toNextTier)} of further standing away, ${Math.round(snap.tierProgress * 100)}% of the way there`
      : "Next tier: none, this is the top of the ladder",
  );

  const open = snap.activePositions;
  if (open.length > 0) {
    lines.push(`Open positions: ${open.length}`);
    for (const p of open.slice(0, POSITION_LIMIT)) lines.push(positionLine(p));
    if (open.length > POSITION_LIMIT) {
      lines.push(`  and ${open.length - POSITION_LIMIT} more not listed here`);
    }
  } else if (!state.empty) {
    lines.push("Open positions: none, every position has been closed");
  }

  lines.push(
    snap.withdrawAllowed
      ? "Withdrawal window: open now, a request may be made today"
      : `Withdrawal window: opens ${fullDate(snap.withdrawUnlocksAt)}, ${snap.daysUntilWithdraw.toFixed(1)} days away`,
  );

  if (state.unfolded > 0) {
    lines.push(
      `Reward sitting outside principal: ${money(state.unfolded, 2)}, earning nothing until it is claimed or folded back in by a relay`,
    );
  }

  if (state.relaysArmed.length > 0) {
    const carry = state.relaysArmed.reduce((sum, r) => sum + r.carries, 0);
    lines.push(
      `Relays armed: ${state.relaysArmed.length}, folding ${money(carry)} of accrued reward back into principal when they next run. Modes: ${state.relaysArmed.map((r) => r.mode).join(", ")}.`,
    );
  }
  if (state.relaysDue.length > 0) {
    lines.push(
      `Relays due to run: ${state.relaysDue.length}, carrying ${money(snap.relayCarry)}, currently forgoing ${money(snap.relayForgoneDaily, 2)} a day while they wait.`,
    );
  }

  lines.push(
    `Stated approach: ${approach.name}. ${approach.pitch} Tradeoff the member accepted: ${approach.tradeoff}`,
    "An approach changes what the interface leads with. It never changes the rate, the term or any figure above.",
  );

  return lines.join("\n");
}
