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
 */

import {
  CYCLE_DAYS,
  CYCLE_RETURN,
  DAILY_RATE,
  TIERS,
  dailyReward,
  nextTier,
  termReward,
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
  | "termTotal"
  | "available"
  | "portfolioValue"
  | "standing"
  | "settlementTarget"
  | "maturity"
  | "progress"
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

const TERM_PCT = `${(CYCLE_RETURN * 100).toFixed(0)}%`;
const DAILY_PCT = `${(DAILY_RATE * 100).toFixed(0)}%`;
const ENTRY = TIERS[0];
const TOP = TIERS[TIERS.length - 1];

const LADDER = TIERS.map((t) => `${t.name} from ${money(t.entry)}`).join(", ");
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
    ],
    caveats: [
      "Principal returns to available cash when the position is settled, not when the term matures. Maturity and settlement are two different instants.",
    ],
    related: ["accrued", "termTotal", "maturity"],
  },

  accrued: {
    id: "accrued",
    label: "Accrued rewards",
    short: "What one position has earned so far, measured continuously against the clock.",
    formula: `accrued = principal x ${DAILY_PCT} x days elapsed, days elapsed capped at ${CYCLE_DAYS}`,
    how: [
      "Days elapsed is the distance from the open event to now, whole and fractional.",
      `Rewards accrue at ${DAILY_PCT} of principal per day, continuously through the term rather than as one payment at the end.`,
      `Days elapsed is clamped to the ${CYCLE_DAYS} day term, so accrual stops at maturity and a matured position holds at exactly ${TERM_PCT} of principal.`,
      "If the position was settled, the clock is cut at the settlement instant rather than at now, so a position closed early stops accruing there.",
      "Nothing is stored. The figure is recomputed from your events plus the clock every time it is read, so the same events and the same clock always produce the same number.",
    ],
    caveats: [
      "Accrual stops at maturity. Leaving a matured position open earns nothing further.",
      "Accrual stops at settlement. A position closed early is frozen at what it had earned by that instant.",
    ],
    related: ["daily", "termTotal", "progress", "lifetime"],
  },

  daily: {
    id: "daily",
    label: "Daily accrual",
    short: "What one day of the term adds.",
    formula: `daily = principal x ${DAILY_PCT}`,
    how: [
      `Every vault earns the same ${TERM_PCT} across the same ${CYCLE_DAYS} day term, which is ${DAILY_PCT} of principal per day.`,
      "For a single position, the daily figure is that position's principal at that rate.",
      "Where the figure covers the whole account, it is the sum across open positions that have not yet matured. A matured position contributes nothing, because it has stopped accruing.",
      `The rate does not move with standing. It is identical from ${ENTRY.name} to ${TOP.name}, so climbing the ladder changes access and speed rather than yield.`,
    ],
    caveats: [
      "This is a rate, not a payment. Rewards are added continuously through the day rather than credited once at a fixed hour.",
    ],
    related: ["accrued", "termTotal", "standing"],
  },

  termTotal: {
    id: "termTotal",
    label: "Term reward",
    short: `What a position accrues across a full ${CYCLE_DAYS} day term.`,
    formula: `term reward = principal x ${DAILY_PCT} x ${CYCLE_DAYS} = principal x ${TERM_PCT}`,
    how: [
      `A term is fixed at ${CYCLE_DAYS} days from the open event.`,
      `At ${DAILY_PCT} of principal per day across ${CYCLE_DAYS} days, a completed term has accrued ${TERM_PCT} of principal.`,
      "This is the ceiling on a position. Accrued rewards rise toward it and stop there.",
      "Settling before maturity ends accrual early, so the position keeps what it accrued rather than the whole term figure.",
    ],
    caveats: [
      "The term figure is arithmetic on the model's fixed rate. It describes what the term is defined to accrue, not a forecast of anything outside the model.",
    ],
    related: ["accrued", "principal", "maturity"],
  },

  available: {
    id: "available",
    label: "Available cash",
    short: "Settled money you can withdraw right now.",
    formula: "available = rewards claimed + principal returned by settled vaults - withdrawals",
    how: [
      "Claiming moves accrued rewards out of a position and into available cash. The claim event records the amount that moved.",
      "Settling a position appends a close event and returns that position's principal to available cash.",
      "Every withdraw event subtracts at its recorded amount.",
      "The result is floored at zero, so the figure never reads negative.",
    ],
    caveats: [
      "Rewards still accruing inside a position are not available. They become available once claimed.",
      "Your ledger is stored in this browser in the current build, so this figure is derived from the events recorded here.",
    ],
    related: ["portfolioValue", "redeploy", "settlementTarget"],
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
      "Withdrawn money is not counted. It has left the portfolio, and it is added back only when measuring net gain against lifetime contribution.",
    ],
    caveats: [
      "Settling a vault does not move the total. The principal simply stops counting as deployed and starts counting as available.",
    ],
    related: ["available", "accrued", "principal", "lifetime"],
  },

  standing: {
    id: "standing",
    label: "Standing",
    short: "The rung of the ladder your lifetime contribution has reached.",
    formula: "standing = the highest tier whose entry your lifetime contribution clears",
    how: [
      "Lifetime contribution is the sum of every open event's amount, including vaults you have since settled.",
      `The ladder is walked in order and the highest entry the total clears wins: ${LADDER}.`,
      "Because it is measured on contribution rather than on current balance, standing does not fall when you settle a position or withdraw cash.",
      "Progress to the next rung is the distance travelled from your current entry toward the next entry, as a fraction of the gap between them.",
    ],
    caveats: [
      `Below ${money(ENTRY.entry)} there is no rung yet, and standing reads as unranked.`,
      `Standing does not change the rate. Every rung earns the same ${TERM_PCT} over the same ${CYCLE_DAYS} days.`,
    ],
    related: ["settlementTarget", "principal", "daily"],
  },

  settlementTarget: {
    id: "settlementTarget",
    label: "Settlement target",
    short: "The window the desk works to when you file a withdrawal request.",
    formula: "settlement target = the hours published for your current standing",
    how: [
      `Each rung publishes a target: ${TARGETS}.`,
      "Your target is the one attached to your current standing.",
      "It is measured from the moment the request is filed, not from when a term matures.",
      "It is published so it can be measured against. It is a service target, not a guarantee.",
    ],
    caveats: [
      "Network conditions on the asset you withdraw sit outside the window.",
      "Reaching a faster rung applies to requests filed from then on. It does not reopen a request already in flight.",
    ],
    related: ["standing", "available"],
  },

  maturity: {
    id: "maturity",
    label: "Maturity",
    short: "The instant a term completes and accrual stops.",
    formula: `maturity = open event time + ${CYCLE_DAYS} days`,
    how: [
      `Every term is exactly ${CYCLE_DAYS} days. Maturity is fixed the moment the open event is recorded and nothing moves it.`,
      `At maturity the position holds at ${TERM_PCT} of principal and stops accruing.`,
      "A matured position stays open until you settle it. Settling appends a close event and returns the principal to available cash.",
      "Leaving it open past maturity costs nothing and adds nothing.",
    ],
    caveats: [
      "Maturity and settlement are different instants. The first is fixed when you open, the second happens when you act.",
    ],
    related: ["progress", "accrued", "termTotal"],
  },

  progress: {
    id: "progress",
    label: "Term progress",
    short: "How far through its term a position has travelled.",
    formula: `progress = days elapsed / ${CYCLE_DAYS}`,
    how: [
      "Days elapsed is the distance from the open event to now, capped at the term length.",
      `Dividing by ${CYCLE_DAYS} gives a fraction: zero at open, one at maturity.`,
      "It moves continuously rather than in daily steps, so it advances between one page view and the next.",
      "For a settled position the clock is cut at settlement, so progress holds where it stood at that instant.",
    ],
    caveats: [
      "Progress measures time through the term, not a share of the reward already paid out. The two move together only because accrual is linear.",
    ],
    related: ["maturity", "accrued"],
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
      `The term figure is that amount at the same ${DAILY_PCT} per day across ${CYCLE_DAYS} days as every other vault.`,
    ],
    caveats: [
      `Below ${money(ENTRY.entry)} there is no vault to open, so the prompt does not appear at all.`,
      "Redeploying starts a new term. It does not extend or top up an existing one.",
    ],
    related: ["available", "termTotal", "standing"],
  },

  lifetime: {
    id: "lifetime",
    label: "Lifetime rewards",
    short: "Everything every position has accrued, open and settled.",
    formula: "lifetime = the sum of accrued across every position in your ledger",
    how: [
      "Each position's accrued figure is computed on its own clock, then the positions are summed.",
      "Settled positions stay in the total. Their accrual is frozen at the settlement instant and is never removed.",
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
    ids: ["principal", "accrued", "daily", "termTotal", "progress", "maturity"],
  },
  {
    heading: "The portfolio",
    ids: ["available", "portfolioValue", "lifetime", "redeploy"],
  },
  {
    heading: "The ladder",
    ids: ["standing", "settlementTarget"],
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

/** Day count used by the generic illustration, well inside the term. */
const SAMPLE_DAY = 10;

/**
 * A hypothetical position at a fixed point in its term. Anchored to epoch and
 * a fixed clock so the illustration is deterministic and never reads as if it
 * were an event in the member's own ledger.
 */
function samplePosition(principal: number): Position | null {
  return previewPosition({ principal, openedAt: 0, now: SAMPLE_DAY * DAY_MS });
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
        const state = real.closed
          ? ", frozen at settlement"
          : real.matured
            ? `, held at the ${TERM_PCT} ceiling since maturity`
            : "";
        return `${money(real.principal)} open for ${dayCount(real.daysElapsed)} days has accrued ${money(real.accrued, 2)}${state}.`;
      }
      if (!sample) return `${lead}Accrual is principal x ${DAILY_PCT} x days elapsed.`;
      return `${lead}${money(principal)} at day ${SAMPLE_DAY} of ${CYCLE_DAYS} has accrued ${money(sample.accrued, 2)}, on the way to ${money(sample.termReward, 2)} at maturity.`;
    }

    case "daily": {
      const base = real ?? sample;
      const per = base ? base.dailyReward : dailyReward(principal);
      if (real && real.matured) {
        return `${money(real.principal)} accrued ${money(per, 2)} a day. The term has matured, so it now adds nothing.`;
      }
      return `${lead}${money(principal)} accrues ${money(per, 2)} a day, every day of the term.`;
    }

    case "termTotal": {
      const base = real ?? sample;
      const reward = base ? base.termReward : termReward(principal);
      return `${lead}A ${CYCLE_DAYS} day term on ${money(principal)} accrues ${money(reward, 2)}, and the position releases ${money(principal + reward)} in total once it is settled.`;
    }

    case "available": {
      return `${lead}Settling a ${money(principal)} vault returns ${money(principal)} of principal to available cash. Rewards join it only as you claim them, and every withdrawal comes back off the total.`;
    }

    case "portfolioValue": {
      if (real) {
        return `This position contributes ${money(real.principal)} of deployed principal and ${money(real.claimable, 2)} of unclaimed rewards to portfolio value.`;
      }
      if (!sample)
        return `${lead}Portfolio value is deployed principal plus unclaimed rewards plus available cash.`;
      return `${lead}An open ${money(principal)} vault at day ${SAMPLE_DAY} contributes ${money(principal)} of deployed principal and ${money(sample.accrued, 2)} of unclaimed rewards.`;
    }

    case "standing": {
      if (principal < ENTRY.entry) {
        return `${lead}${money(principal)} of lifetime contribution sits below the ${money(ENTRY.entry)} entry for ${ENTRY.name}, so standing reads as unranked.`;
      }
      const up = nextTier(tier.id);
      const tail = up
        ? `, with ${money(Math.max(0, up.entry - principal))} of further contribution to ${up.name}`
        : ", the top of the ladder";
      return `${lead}${money(principal)} of lifetime contribution clears the ${money(tier.entry)} entry for ${tier.name}${tail}.`;
    }

    case "settlementTarget": {
      if (principal < ENTRY.entry) {
        return `Standing opens at ${ENTRY.name} from ${money(ENTRY.entry)}, which publishes a ${ENTRY.settlementHours} hour target.`;
      }
      return `${tier.name} publishes a ${tier.settlementHours} hour target, counted from the moment a request is filed.`;
    }

    case "maturity": {
      if (real) {
        return `Opened ${fullDate(real.openedAt)}, this term matures ${fullDate(real.maturesAt)}, ${CYCLE_DAYS} days later to the hour.`;
      }
      return `${lead}A term opened today matures ${CYCLE_DAYS} days later, to the same hour. The date is fixed at open.`;
    }

    case "progress": {
      if (real) {
        const held = real.closed ? " The position is settled, so progress holds there." : "";
        return `${dayCount(real.daysElapsed)} of ${CYCLE_DAYS} days elapsed reads ${(real.progress * 100).toFixed(1)}% through the term, with ${dayCount(real.daysRemaining)} days remaining.${held}`;
      }
      if (!sample) return `${lead}Progress is days elapsed divided by ${CYCLE_DAYS}.`;
      return `${lead}At day ${SAMPLE_DAY} of ${CYCLE_DAYS}, a term reads ${(sample.progress * 100).toFixed(1)}% complete.`;
    }

    case "redeploy": {
      const placeable = Math.floor(principal);
      if (placeable < ENTRY.entry) {
        return `${lead}${money(principal, 2)} idle is below the ${money(ENTRY.entry)} entry for ${ENTRY.name}, so there is no vault to open yet.`;
      }
      const t = tierFor(placeable);
      return `${lead}${money(placeable)} idle opens a ${t.name} vault and accrues ${money(termReward(placeable), 2)} across the ${CYCLE_DAYS} day term.`;
    }

    case "lifetime": {
      if (real) {
        return `This position has added ${money(real.accrued, 2)} to the lifetime total so far, and keeps that figure once it is settled.`;
      }
      return `${lead}A completed ${money(principal)} term adds ${money(termReward(principal), 2)} to the lifetime total, and stays in it after the vault is settled.`;
    }
  }
}
