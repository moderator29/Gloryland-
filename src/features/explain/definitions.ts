/**
 * Provenance: the registry behind every "where does this come from?" answer.
 *
 * A member should never have to take a figure on trust. Every entry here
 * describes the arithmetic the product actually runs, in plain words, with the
 * constants read from `@/domain/tiers` rather than typed out by hand. If the
 * model changes, this copy changes with it instead of quietly disagreeing.
 *
 * Two rules govern what may be written here.
 *   1. Nothing may be stated that the ledger cannot derive. No projections, no
 *      averages across other members, no claims about licences, partners,
 *      custody or regulation. Only the model and the member's own events.
 *   2. Worked examples run through `derive` in `@/domain/ledger`. Nothing in
 *      this file recomputes accrual by hand, so an example can never drift
 *      away from the figure the member is looking at.
 *
 * A third rule arrived with the economics. A position has no end date, so no
 * entry here may state what one will reach: how long capital stays in place is
 * the member's decision, and a total would be a figure the ledger cannot
 * derive. Days that have actually run, and the rate, are the only two honest
 * inputs to any sentence below.
 */

import {
  DAILY_RATE,
  TIERS,
  WITHDRAW_INTERVAL_DAYS,
  dailyReward,
  nextTier,
  rewardOver,
  tierForAmount,
  type Tier,
} from "@/domain/tiers";
import { DAY_MS, derive, type LedgerEvent, type Position } from "@/domain/ledger";
import { fullDate, money } from "@/components/system/format";

/* ── the figures a member can ask about ─────────────────────────────────── */

export type FigureId =
  | "principal"
  | "accrued"
  | "daily"
  | "daysAccruing"
  | "compounding"
  | "available"
  | "portfolioValue"
  | "standing"
  | "settlementTarget"
  | "withdrawWindow"
  | "redeploy"
  | "lifetime";

export type Definition = {
  id: FigureId;
  /** What the figure is called wherever it appears on screen. */
  label: string;
  /** One line. What it is, before any arithmetic. */
  short: string;
  /** The computation in symbols, rendered in a tabular treatment. */
  formula?: string;
  /** The same computation as ordered steps, in plain words. */
  how: string[];
  /** Where the figure is easy to misread. Shown in a warn treatment. */
  caveats?: string[];
  related?: FigureId[];
};

/** Optional real inputs, so an example can be the member's own numbers. */
export type ExplainContext = {
  principal?: number;
  openedAt?: number;
  now?: number;
  closedAt?: number;
};

/* ── constants, interpolated rather than transcribed ────────────────────── */

const DAILY_PCT = `${(DAILY_RATE * 100).toFixed(0)}%`;
const ENTRY = TIERS[0];
const TOP = TIERS[TIERS.length - 1];

const LADDER = `${TIERS.length} rungs, ${TIERS[0].name} from ${money(TIERS[0].entry)} up to ${TOP.name} from ${money(TOP.entry)}`;
const TARGETS = TIERS.map((t) => `${t.name} ${t.settlementHours}h`).join(", ");

/**
 * Days at the precision the arithmetic actually runs at.
 *
 * The shared `days` formatter rounds above ten, which is right on a countdown
 * and wrong here: a rounded day count printed beside an exact dollar figure
 * reads as though the two disagree, which is the doubt this feature exists to
 * remove. Provenance shows the number the model multiplied by.
 */
export function dayCount(n: number): string {
  return n.toFixed(2);
}

/** Where the full reference lives, so a deep link is written down once. */
export const GLOSSARY_PATH = "/app/glossary";

/** Deep link to one definition's anchored section. */
export function glossaryHref(id: FigureId): string {
  return `${GLOSSARY_PATH}#${id}`;
}

/* ── the registry ───────────────────────────────────────────────────────── */

const REGISTRY: Record<FigureId, Definition> = {
  principal: {
    id: "principal",
    label: "Principal",
    short: "The capital an open event placed into a vault.",
    formula: "principal = the amount recorded on the open event",
    how: [
      "Opening a vault appends one open event to your ledger, carrying the amount, the tier, the asset and the network.",
      "That amount is the principal. Nothing after it changes the figure: a claim moves rewards, a withdrawal moves cash, and neither touches what the open event recorded.",
      `The smallest principal the ladder accepts is ${money(ENTRY.entry)}, the entry point of the ${ENTRY.name} tier.`,
      "Principal is also the only thing that accrues. Reward sitting unclaimed inside a position is not principal and earns nothing until it is folded in.",
    ],
    caveats: [
      "Principal returns to available cash when you close the position. Nothing closes it for you, and there is no date on which it closes itself.",
    ],
    related: ["accrued", "compounding", "daysAccruing"],
  },

  accrued: {
    id: "accrued",
    label: "Accrued rewards",
    short: "What one position has earned so far, measured continuously against the clock.",
    formula: `accrued = principal x ${DAILY_PCT} x days accruing`,
    how: [
      "Days accruing is the distance from the open event to now, whole and fractional.",
      `Rewards accrue at ${DAILY_PCT} of principal per day, continuously rather than as one payment at any point.`,
      "Nothing caps the days. A position has no term and no maturity, so a hundred days in place is a hundred days of accrual.",
      "If the position was closed, the clock is cut at that instant rather than at now, so a closed position stops accruing there.",
      "Nothing is stored. The figure is recomputed from your events plus the clock every time it is read, so the same events and the same clock always produce the same number.",
    ],
    caveats: [
      "Accrual stops when you close the position, and only then. Nothing is forfeited by closing: the days that ran are paid for.",
      "Accrual is linear on principal. Reward already accrued does not itself accrue until it is folded back into principal.",
    ],
    related: ["daily", "compounding", "daysAccruing", "lifetime"],
  },

  daily: {
    id: "daily",
    label: "Daily accrual",
    short: "What one day adds.",
    formula: `daily = principal x ${DAILY_PCT}`,
    how: [
      `Every vault earns the same ${DAILY_PCT} of principal per day.`,
      "For a single position, the daily figure is that position's principal at that rate.",
      "Where the figure covers the whole account, it is the sum across open positions that have started. Nothing removes a position from the sum except closing it.",
      `The rate does not move with standing. It is identical from ${ENTRY.name} to ${TOP.name}, so climbing the ladder changes access and speed rather than yield.`,
    ],
    caveats: [
      "This is a rate, not a payment. Rewards are added continuously through the day rather than credited once at a fixed hour.",
      "It is a stated structure rather than a promise of payment, and capital placed into a vault is at risk.",
    ],
    related: ["accrued", "compounding", "standing"],
  },

  daysAccruing: {
    id: "daysAccruing",
    label: "Days accruing",
    short: "How long a position has been earning, whole and fractional.",
    formula: "days accruing = (now or the close, whichever is first) - the start",
    how: [
      "The start is the open event, unless the placement named a later date, in which case it is that date.",
      "The end is now for an open position, and the close event for one that has been closed.",
      "The count is not rounded and not capped. It moves continuously, so it advances between one page view and the next.",
      "It is the only length in the product. There is no term to be a fraction of, and no date the position runs out.",
    ],
    caveats: [
      "A position committed with a later start date accrues nothing until that date. It is still your capital, and it is held apart from deployed principal until it begins.",
    ],
    related: ["accrued", "daily", "principal"],
  },

  compounding: {
    id: "compounding",
    label: "Compounding",
    short: "Folding a position's reward into its principal, so the reward starts earning too.",
    formula: "new principal = principal + unclaimed reward",
    how: [
      `Accrual runs on principal alone at ${DAILY_PCT} a day, so reward left inside a position earns nothing while it sits there.`,
      "Compounding claims what is unclaimed, closes the position and opens a new one at principal plus that reward, as a single write.",
      "The new position is recorded as funded from your account balance, so the same capital is never counted twice as new contribution.",
      "A relay is the same movement as a standing instruction: armed once, it folds the reward in whenever a whole day of it has accrued.",
      "What it folds is read off the position's own unclaimed figure, never off what it has ever generated, so rewards you already claimed cannot be placed a second time.",
    ],
    caveats: [
      "Compounding is a decision, not an automatic behaviour. Nothing folds a reward in unless you do it or arm a relay.",
      "It restarts the day count on the new position, because the new principal genuinely started earning then.",
    ],
    related: ["accrued", "principal", "daysAccruing"],
  },

  available: {
    id: "available",
    label: "Available cash",
    short: "Settled money in your balance.",
    formula: "available = rewards claimed + principal returned by closed vaults - withdrawals",
    how: [
      "Claiming moves accrued rewards out of a position and into available cash. The claim event records the amount that moved.",
      "Closing a position appends a close event and returns that position's principal to available cash.",
      "Every withdraw event subtracts at its recorded amount.",
      "The result is floored at zero, so the figure never reads negative.",
    ],
    caveats: [
      "Rewards still accruing inside a position are not available. They become available once claimed.",
      "Available cash accrues nothing. It sits still until it is placed into a vault or withdrawn.",
      "Your ledger is stored in this browser in the current build, so this figure is derived from the events recorded here.",
    ],
    related: ["portfolioValue", "redeploy", "withdrawWindow"],
  },

  portfolioValue: {
    id: "portfolioValue",
    label: "Portfolio value",
    short: "Everything your ledger says you hold at this moment.",
    formula: "portfolio value = deployed principal + unclaimed rewards + available cash",
    how: [
      "Deployed principal is the sum of principal across vaults that are still open.",
      "Unclaimed rewards is lifetime accrued less everything already claimed, floored at zero.",
      "Available cash is settled money that has not been withdrawn.",
      "Withdrawn money is not counted. It has left the portfolio, and it is added back only when measuring net gain against the capital you brought in.",
    ],
    caveats: [
      "Closing a vault does not move the total. The principal simply stops counting as deployed and starts counting as available.",
    ],
    related: ["available", "accrued", "principal", "lifetime"],
  },

  standing: {
    id: "standing",
    label: "Standing",
    short: "The rung of the ladder your standing figure has reached.",
    formula: "standing = max(capital brought in, most ever deployed at once)",
    how: [
      "Capital brought in is the sum of every placement funded from outside the account. A placement funded from your own balance is excluded, because that money was already counted when it first arrived.",
      "Most ever deployed at once replays your opens and closes in order and records the highest total that was running at any single instant.",
      "Standing is the greater of the two. Taking the greater is what lets a member who compounds keep climbing, since a folded position brings in no new capital, while neither figure can be inflated by moving the same money in a circle.",
      `The ladder is walked in order and the highest entry that standing clears wins: ${LADDER}.`,
      "Because neither figure falls, standing does not drop when you close a position or withdraw cash.",
      "Progress to the next rung is the distance travelled from your current entry toward the next entry, as a fraction of the gap between them.",
    ],
    caveats: [
      `Below ${money(ENTRY.entry)} there is no rung yet, and standing reads as unranked.`,
      `Standing does not change the rate. Every rung earns the same ${DAILY_PCT} a day.`,
    ],
    related: ["settlementTarget", "withdrawWindow", "principal", "daily"],
  },

  settlementTarget: {
    id: "settlementTarget",
    label: "Settlement target",
    short: "The window the desk works to when you file a withdrawal request.",
    formula: "settlement target = the hours published for your current standing",
    how: [
      `Each rung publishes a target: ${TARGETS}.`,
      "Your target is the one attached to your current standing.",
      "It is measured from the moment the request is filed.",
      "It is published so it can be measured against. It is a service target, not a guarantee.",
    ],
    caveats: [
      "Network conditions on the asset you withdraw sit outside the window.",
      "Reaching a faster rung applies to requests filed from then on. It does not reopen a request already in flight.",
      "A faster target is how quickly one request is worked, never how often you may file one.",
    ],
    related: ["standing", "withdrawWindow", "available"],
  },

  withdrawWindow: {
    id: "withdrawWindow",
    label: "Withdrawal window",
    short: `How often cash may leave the account: once every ${WITHDRAW_INTERVAL_DAYS} days.`,
    formula: `next request allowed = last request + ${WITHDRAW_INTERVAL_DAYS} days`,
    how: [
      `A withdrawal request may be filed once every ${WITHDRAW_INTERVAL_DAYS} days.`,
      "A first request is allowed immediately. The interval measures the gap after a request, and there is no gap before the first one.",
      "The date is derived from your latest withdraw event and from nothing else, so it does not depend on any position.",
      `Once a request is filed, the next one can be made ${WITHDRAW_INTERVAL_DAYS} days later, to the hour.`,
    ],
    caveats: [
      "The window is the same at every rung. Standing buys a faster target on a request, never a more frequent one.",
      "The window governs cash leaving the account. Claiming rewards and closing a position are not withdrawals and are not held by it.",
    ],
    related: ["available", "settlementTarget", "standing"],
  },

  redeploy: {
    id: "redeploy",
    label: "Redeploy",
    short: "Idle cash, and the vault it would open today.",
    formula: "redeploy = available cash, floored to whole dollars",
    how: [
      "The amount is available cash: settled money sitting still rather than accruing.",
      "It is floored to whole dollars, so the amount named is the amount the form receives.",
      `The tier shown is the highest rung that exact amount clears, starting at ${money(ENTRY.entry)} for ${ENTRY.name}.`,
      `Placed, it accrues at the same ${DAILY_PCT} a day as every other vault, for as long as you leave it there.`,
    ],
    caveats: [
      `Below ${money(ENTRY.entry)} there is no vault to open, so the prompt does not appear at all.`,
      "Redeploying opens a new position. It does not extend or top up an existing one, because a position's principal is fixed by the event that opened it.",
    ],
    related: ["available", "compounding", "standing"],
  },

  lifetime: {
    id: "lifetime",
    label: "Lifetime rewards",
    short: "Everything every position has accrued, open and closed.",
    formula: "lifetime = the sum of accrued across every position in your ledger",
    how: [
      "Each position's accrued figure is computed on its own clock, then the positions are summed.",
      "Closed positions stay in the total. Their accrual is frozen at the close instant and is never removed.",
      "Claiming does not change it. A claim moves rewards into available cash and is tracked separately as claimed.",
      "Unclaimed rewards is this total less everything claimed, floored at zero.",
    ],
    caveats: [
      "The total is recomputed from events every time it is read, so clearing or correcting the ledger changes it.",
    ],
    related: ["accrued", "available", "portfolioValue"],
  },
};

/**
 * Reading order for the reference, grouped the way a member meets the figures:
 * one position first, then the account around it, then the ladder.
 */
export const FIGURE_GROUPS: { heading: string; ids: FigureId[] }[] = [
  {
    heading: "A position",
    ids: ["principal", "accrued", "daily", "daysAccruing", "compounding"],
  },
  {
    heading: "The portfolio",
    ids: ["available", "portfolioValue", "lifetime", "redeploy"],
  },
  {
    heading: "The ladder",
    ids: ["standing", "settlementTarget", "withdrawWindow"],
  },
];

export function getDefinition(id: FigureId): Definition {
  return REGISTRY[id];
}

/** Every definition, in reading order. */
export function allDefinitions(): Definition[] {
  return FIGURE_GROUPS.flatMap((g) => g.ids.map((id) => REGISTRY[id]));
}

/** Narrow the reference by title or body. Empty query returns everything. */
export function searchDefinitions(query: string): Definition[] {
  const q = query.trim().toLowerCase();
  if (!q) return allDefinitions();
  return allDefinitions().filter((d) =>
    [d.label, d.short, d.formula ?? "", ...d.how, ...(d.caveats ?? [])]
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
}

/* ── worked examples ────────────────────────────────────────────────────── */

/**
 * A synthetic single position ledger, run through the real `derive`.
 *
 * The point is that a worked example cannot drift: the numbers below come out
 * of the same function that produces the figure on screen. Asset and network
 * are left blank because no derived figure reads them, and a blank value
 * cannot be mistaken for a real recorded event.
 */
export function previewPosition(ctx: ExplainContext): Position | null {
  const { principal, openedAt } = ctx;
  if (principal === undefined || principal <= 0 || openedAt === undefined) return null;

  const events: LedgerEvent[] = [
    {
      id: "explain-preview",
      kind: "open",
      at: openedAt,
      amount: principal,
      tierId: (tierForAmount(principal) ?? ENTRY).id,
      asset: "",
      network: "",
    },
  ];
  if (ctx.closedAt !== undefined) {
    events.push({
      id: "explain-preview-close",
      kind: "close",
      at: ctx.closedAt,
      positionId: "explain-preview",
    });
  }

  return derive(events, ctx.now ?? Date.now()).positions[0] ?? null;
}

/**
 * Days used by the generic illustration.
 *
 * A round handful, named as a length someone chose rather than a length the
 * product imposes. Nothing in the model prefers this number to any other, and
 * the sentences that use it say so.
 */
const SAMPLE_DAYS = 10;

/**
 * A hypothetical position after a fixed run of days. Anchored to epoch and a
 * fixed clock so the illustration is deterministic and never reads as if it
 * were an event in the member's own ledger.
 */
function samplePosition(principal: number): Position | null {
  return previewPosition({ principal, openedAt: 0, now: SAMPLE_DAYS * DAY_MS });
}

function tierFor(amount: number): Tier {
  return tierForAmount(amount) ?? ENTRY;
}

/**
 * One sentence of arithmetic, worked. Uses the member's own inputs when the
 * caller has them and a clearly hypothetical tier example when it does not.
 */
export function explainValue(id: FigureId, ctx: ExplainContext = {}): string {
  const hasPrincipal = ctx.principal !== undefined && ctx.principal > 0;
  const principal = hasPrincipal ? (ctx.principal as number) : ENTRY.entry;
  const real = previewPosition(ctx);
  const sample = samplePosition(principal);
  const tier = tierFor(principal);
  const lead = hasPrincipal ? "" : `Worked example at the ${ENTRY.name} entry. `;

  switch (id) {
    case "principal": {
      if (real) {
        return `This open event recorded ${money(real.principal)} on ${fullDate(real.openedAt)}. Every later event leaves that figure alone.`;
      }
      return `${lead}An open event of ${money(principal)} records ${money(principal)} of principal, and no event after it changes the figure.`;
    }

    case "accrued": {
      if (real) {
        const state = real.closed ? ", frozen where it stood when the position closed" : "";
        return `${money(real.principal)} accruing for ${dayCount(real.daysElapsed)} days has earned ${money(real.accrued, 2)}${state}.`;
      }
      if (!sample) return `${lead}Accrual is principal x ${DAILY_PCT} x days accruing.`;
      return `${lead}${money(principal)} left in place for ${SAMPLE_DAYS} days has accrued ${money(sample.accrued, 2)}. Left longer it keeps going, at the same rate.`;
    }

    case "daily": {
      const base = real ?? sample;
      const per = base ? base.dailyReward : dailyReward(principal);
      if (real && real.closed) {
        return `${money(real.principal)} accrued ${money(per, 2)} a day. The position is closed, so it now adds nothing.`;
      }
      return `${lead}${money(principal)} accrues ${money(per, 2)} a day, every day it is left in place.`;
    }

    case "daysAccruing": {
      if (real) {
        const held = real.closed ? " The position is closed, so the count holds there." : "";
        return `This position has been accruing for ${dayCount(real.daysElapsed)} days, which at ${money(real.dailyReward, 2)} a day is ${money(real.accrued, 2)}.${held}`;
      }
      return `${lead}${money(principal)} accruing for ${SAMPLE_DAYS} days is ${SAMPLE_DAYS} days of ${money(dailyReward(principal), 2)}. Nothing stops the count but closing the position.`;
    }

    case "compounding": {
      if (real && real.claimable > 0) {
        const folded = real.principal + real.claimable;
        return `Folding this position's ${money(real.claimable, 2)} of unclaimed reward into its ${money(real.principal)} principal opens a ${money(folded, 2)} position, which accrues ${money(dailyReward(folded), 2)} a day instead of ${money(real.dailyReward, 2)}.`;
      }
      const oneDay = dailyReward(principal);
      const folded = principal + oneDay;
      return `${lead}${money(principal)} accrues ${money(oneDay, 2)} in a day. Folded in, the position becomes ${money(folded, 2)} and accrues ${money(dailyReward(folded), 2)} a day. Left unfolded, that reward earns nothing.`;
    }

    case "available": {
      return `${lead}Closing a ${money(principal)} vault returns ${money(principal)} of principal to available cash, along with anything unclaimed. Every withdrawal comes back off the total.`;
    }

    case "portfolioValue": {
      if (real) {
        return `This position contributes ${money(real.principal)} of deployed principal and ${money(real.claimable, 2)} of unclaimed rewards to portfolio value.`;
      }
      if (!sample)
        return `${lead}Portfolio value is deployed principal plus unclaimed rewards plus available cash.`;
      return `${lead}An open ${money(principal)} vault after ${SAMPLE_DAYS} days contributes ${money(principal)} of deployed principal and ${money(sample.accrued, 2)} of unclaimed rewards.`;
    }

    case "standing": {
      if (principal < ENTRY.entry) {
        return `${lead}a standing of ${money(principal)} sits below the ${money(ENTRY.entry)} entry for ${ENTRY.name}, so it reads as unranked.`;
      }
      const up = nextTier(tier.id);
      const tail = up
        ? `, with ${money(Math.max(0, up.entry - principal))} of further contribution to ${up.name}`
        : ", the top of the ladder";
      return `${lead}a standing of ${money(principal)} clears the ${money(tier.entry)} entry for ${tier.name}${tail}.`;
    }

    case "settlementTarget": {
      if (principal < ENTRY.entry) {
        return `Standing opens at ${ENTRY.name} from ${money(ENTRY.entry)}, which publishes a ${ENTRY.settlementHours} hour target.`;
      }
      return `${tier.name} publishes a ${tier.settlementHours} hour target, counted from the moment a request is filed.`;
    }

    case "withdrawWindow": {
      return `A withdrawal can be requested once every ${WITHDRAW_INTERVAL_DAYS} days, and the first one is allowed immediately. File one today and the next can be filed ${WITHDRAW_INTERVAL_DAYS} days later, to the hour, at ${tier.name} exactly as at ${ENTRY.name}.`;
    }

    case "redeploy": {
      const placeable = Math.floor(principal);
      if (placeable < ENTRY.entry) {
        return `${lead}${money(principal, 2)} idle is below the ${money(ENTRY.entry)} entry for ${ENTRY.name}, so there is no vault to open yet.`;
      }
      const t = tierFor(placeable);
      return `${lead}${money(placeable)} idle opens a ${t.name} vault and accrues ${money(dailyReward(placeable), 2)} a day from the moment it is placed.`;
    }

    case "lifetime": {
      if (real) {
        return `This position has added ${money(real.accrued, 2)} to the lifetime total so far, and keeps that figure once it is closed.`;
      }
      return `${lead}${money(principal)} accruing for ${SAMPLE_DAYS} days adds ${money(rewardOver(principal, SAMPLE_DAYS), 2)} to the lifetime total, and stays in it after the vault is closed.`;
    }
  }
}
