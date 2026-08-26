/**
 * The product, written down as data.
 *
 * Both assistants need to know what Rigel actually is: every surface, the term
 * arithmetic, the ladder, the flows a member walks through, what the ledger
 * stores and where it lives. That knowledge used to be a paragraph of prose
 * pasted into a system prompt, which is exactly the kind of copy that drifts
 * away from the code the week after it is written.
 *
 * Three rules hold this module together.
 *
 * 1. Every figure is computed from `./tiers` at module load. Nothing here
 *    types out a dollar amount, a rate or a term length by hand, so changing a
 *    constant rewrites the briefing instead of leaving it stale.
 * 2. Nothing may be stated that the product cannot derive. No licences, no
 *    regulators, no partners, no member counts, no track record, no promise of
 *    a return. `LIMITS` carries those prohibitions as data so they travel with
 *    the facts rather than sitting in a separate paragraph someone can forget.
 * 3. No browser and no node specific imports, and relative import paths only.
 *    This module is loaded by the client bundle and by the serverless function
 *    in `api/ai`, and the `@/` alias does not resolve inside the function.
 *
 * The funding assets are read from the market feature for the same anti drift
 * reason: that file is where the deposit form gets its list, so it is the only
 * honest place to read it from.
 */

import {
  CYCLE_DAYS,
  CYCLE_RETURN,
  DAILY_RATE,
  TIERS,
  dailyReward,
  termReward,
  type TierId,
} from "./tiers";
import { APPROACHES, type ApproachId } from "./identity";
import { ASSETS } from "../features/market/assets";

/* ── formatting, local so the module carries no dependencies ────────────── */

/** Dollars with thousands separators. Deterministic, and identical on a server. */
export function usd(n: number, decimals = 0): string {
  const fixed = Math.abs(n).toFixed(decimals);
  const [whole, frac] = fixed.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${n < 0 ? "-" : ""}$${grouped}${frac ? `.${frac}` : ""}`;
}

/** A rate as a percentage, with trailing zeros trimmed: 0.3 reads as 30%. */
function pctText(value: number): string {
  return `${Number((value * 100).toFixed(2))}%`;
}

export const TERM_PCT = pctText(CYCLE_RETURN);
export const DAY_PCT = pctText(DAILY_RATE);

const ENTRY_TIER = TIERS[0];
const TOP_TIER = TIERS[TIERS.length - 1];

/* ── the platform ───────────────────────────────────────────────────────── */

export type PlatformFacts = {
  name: string;
  /** One line, the way the product describes itself. */
  what: string;
  /** What is real in this build and what is not. Stated, never implied. */
  buildState: string[];
};

export const PLATFORM: PlatformFacts = {
  name: "Rigel",
  what: "A private digital asset vault platform. Capital is placed into a fixed term vault, accrues at a published rate, and is settled or placed again at maturity.",
  buildState: [
    "This is a preview build. A member's ledger is held in their own browser, not on a server.",
    "There is no account server, no custody, no settlement network and no chain watcher connected yet.",
    "Clearing site data clears the ledger, and opening the product on another device shows an empty account.",
    "The deposit form shows a funding address to copy, but this build has no chain watcher and takes no custody. Confirming a deposit records a position in the browser, it does not receive or move funds.",
    "Every figure on every surface is derived from the member's own recorded events plus the clock. Nothing is stored as a number someone typed.",
  ],
};

/* ── term mechanics ─────────────────────────────────────────────────────── */

export type TermMechanics = {
  days: number;
  termReturn: number;
  dailyRate: number;
  termPct: string;
  dailyPct: string;
  /** The arithmetic, one statement per line, in the order it is applied. */
  arithmetic: string[];
  /** What each action does to a running term. */
  lifecycle: { action: string; effect: string }[];
  /** A worked example at the first rung, built from the constants. */
  worked: string[];
};

const workedPrincipal = ENTRY_TIER.entry;

export const TERM: TermMechanics = {
  days: CYCLE_DAYS,
  termReturn: CYCLE_RETURN,
  dailyRate: DAILY_RATE,
  termPct: TERM_PCT,
  dailyPct: DAY_PCT,
  arithmetic: [
    `A term is exactly ${CYCLE_DAYS} days. It is fixed at the instant the position opens and nothing moves it.`,
    `Accrual is ${DAY_PCT} of original principal per day, continuous rather than credited once a day at a fixed hour.`,
    "Accrued rewards = principal x daily rate x days elapsed, where days elapsed is whole and fractional.",
    `Days elapsed is clamped to ${CYCLE_DAYS}, so accrual stops at maturity and a matured position holds at exactly ${TERM_PCT} of principal.`,
    `Term reward = principal x ${TERM_PCT}. That is the ceiling on a position.`,
    "Accrual is linear and does not compound inside a term.",
    "If a position is settled before maturity, the accrual clock is cut at the settlement instant rather than at maturity.",
    "Available cash = rewards claimed + principal returned by settled vaults - withdrawals - capital re-placed from the balance, floored at zero.",
    "Portfolio value = deployed principal + unclaimed rewards + available cash. Withdrawn money is not counted in it.",
    "Net gain = portfolio value + withdrawn - contributed. Return to date = net gain / contributed.",
  ],
  lifecycle: [
    {
      action: "Open",
      effect: `Capital is placed and the ${CYCLE_DAYS} day term starts at that instant. There is no daily batch to wait for and no advantage to opening at a particular hour.`,
    },
    {
      action: "Claim",
      effect:
        "Moves rewards that have already accrued into available cash. The term keeps running and accrual is unaffected.",
    },
    {
      action: "Maturity",
      effect: `Reached ${CYCLE_DAYS} days after opening. Accrual stops. The position stays open until the member settles it, and leaving it open past maturity costs nothing and adds nothing.`,
    },
    {
      action: "Settle",
      effect:
        "Closes the position and returns its principal to available cash. Settling before maturity ends accrual at that instant.",
    },
    {
      action: "Roll",
      effect:
        "Settles a matured term and places the capital straight into a new one. Because that capital came from the balance rather than from outside, it is recorded as such and is not counted a second time as new contribution.",
    },
    {
      action: "Withdraw",
      effect: "Sends available cash to an external address. It does not touch an open position.",
    },
    {
      action: "Relay",
      effect:
        "A standing instruction on one position: at maturity, carry it into a new term rather than letting it sit still. Armed once, it keeps running term after term until it is disarmed.",
    },
  ],
  worked: [
    `${usd(workedPrincipal)} placed at ${ENTRY_TIER.name} accrues ${usd(dailyReward(workedPrincipal), 2)} a day.`,
    `Across ${CYCLE_DAYS} days that is ${usd(termReward(workedPrincipal))} in rewards.`,
    `At maturity the position holds ${usd(workedPrincipal + termReward(workedPrincipal))} in total, principal plus term reward.`,
    `The same arithmetic runs at every rung. ${usd(TOP_TIER.entry)} at ${TOP_TIER.name} accrues ${usd(dailyReward(TOP_TIER.entry), 2)} a day and ${usd(termReward(TOP_TIER.entry))} across the term.`,
  ],
};

/* ── the ladder ─────────────────────────────────────────────────────────── */

export type TierFact = {
  id: TierId;
  name: string;
  rank: number;
  entry: number;
  settlementHours: number;
  /** What one day of the term returns at this rung's entry amount. */
  dailyAtEntry: number;
  /** What a full term returns at this rung's entry amount. */
  termAtEntry: number;
  /** Principal plus term reward at this rung's entry amount. */
  maturityAtEntry: number;
  /** Further contribution needed to cross from the rung below. Zero at the first. */
  stepFromBelow: number;
  unlocks: string[];
  blurb: string;
};

export const TIER_FACTS: TierFact[] = TIERS.map((t, i) => ({
  id: t.id,
  name: t.name,
  rank: t.rank,
  entry: t.entry,
  settlementHours: t.settlementHours,
  dailyAtEntry: dailyReward(t.entry),
  termAtEntry: termReward(t.entry),
  maturityAtEntry: t.entry + termReward(t.entry),
  stepFromBelow: i === 0 ? 0 : t.entry - TIERS[i - 1].entry,
  unlocks: t.benefits,
  blurb: t.blurb,
}));

/** How the rung a member sits on is worked out. Kept apart from the rungs themselves. */
export const STANDING: string[] = [
  "Standing is the rung of the ladder a member has reached. It is not per position: several smaller placements reach the same rung as one large one.",
  "Standing is measured on the greater of two figures. The first is contributed, which is external capital ever brought in and excludes anything re-placed from the account balance. The second is peak deployed, which is the most principal that was ever open at one instant.",
  "Taking the greater of the two is deliberate. Contribution alone would strand a member who keeps rolling the same capital, and peak alone would ignore capital that was settled and withdrawn. Neither figure can be inflated by moving the same money in a circle.",
  "Standing does not fall when a position is settled or when cash is withdrawn.",
  `Below ${usd(ENTRY_TIER.entry)} there is no rung yet and standing reads as unranked.`,
  "Progress to the next rung is the distance travelled from the current rung's entry toward the next one, as a fraction of the gap between them.",
  `Standing never changes the rate. Every rung earns the same ${TERM_PCT} across the same ${CYCLE_DAYS} days. What changes with standing is settlement speed, access and tooling.`,
];

/* ── surfaces ───────────────────────────────────────────────────────────── */

export type Surface = {
  /** The name in docs/NAMING.md, which is what the sidebar shows. */
  name: string;
  route: string;
  purpose: string;
  /** What a member can actually do on this surface. */
  can: string[];
  /** Older names carried so a member who says the old word still lands. */
  aka?: string[];
};

export const SURFACES: Surface[] = [
  {
    name: "Home",
    route: "/app",
    purpose: "The overview: portfolio value, standing, and what needs attention.",
    can: [
      "Read portfolio value, available cash, deployed principal and the daily rate",
      "See the nearest maturity and the current rung",
      "Reorder the sections of the page with Arrange",
    ],
  },
  {
    name: "Desk",
    route: "/app/desk",
    purpose: "Where a member acts: fund the account, move value out, read the market.",
    can: [
      "Pick a funding asset and copy its network address",
      "File a withdrawal by entering an amount up to available cash and a destination address",
      "Read live prices for the funding assets",
      "Start the guided deposit",
    ],
    aka: ["Portal", "Command"],
  },
  {
    name: "Vaults",
    route: "/app/vaults",
    purpose: "Every position and the term it is running.",
    can: [
      "See principal, term progress, accrued rewards and maturity date per position",
      "Open a position to settle it or claim from it",
    ],
    aka: ["Portfolio", "Packages", "Positions"],
  },
  {
    name: "Open a vault",
    route: "/app/vaults/new",
    purpose: "The guided deposit: three steps from an amount to a recorded position.",
    can: [
      "Enter an amount or tap a rung's entry figure",
      "See per day, term reward and value at maturity before committing",
      "Choose a funding asset, copy the address and confirm",
      "Save a receipt carrying a quotable reference",
    ],
  },
  {
    name: "Vault detail",
    route: "/app/vaults/:id",
    purpose: "One position in full, with its own arithmetic explained in place.",
    can: [
      "Read the position's own figures",
      "Claim from it or settle it",
      "Arm, change or disarm a relay on it",
    ],
  },
  {
    name: "Tiers",
    route: "/app/tiers",
    purpose: "The ladder, and where the member currently stands on it.",
    can: [
      "Read every rung's entry, settlement target and what it unlocks",
      "See current standing and the distance to the next rung",
    ],
    aka: ["Plans", "Packages", "Programme"],
  },
  {
    name: "Compare",
    route: "/app/tiers/compare",
    purpose: "Two rungs side by side, showing only the lines that actually differ.",
    can: ["Pick any two rungs and read the difference between them"],
  },
  {
    name: "Tier Match",
    route: "/app/tiers/match",
    purpose: "Four questions, scored against the published tier table.",
    can: [
      "Answer on capital, how quickly access matters, tooling wanted and current stance",
      "Read which rung the answers point at and why, in the member's own words",
    ],
    aka: ["Tier quiz", "Find my tier"],
  },
  {
    name: "Tier detail",
    route: "/app/tiers/:tierId",
    purpose: "One rung in full: entry, per day, per term, settlement target and what is included.",
    can: ["Read one rung's figures and how current standing sits against it"],
  },
  {
    name: "Yield",
    route: "/app/rewards",
    purpose: "Claiming what has accrued, and reading earnings over time.",
    can: [
      "Claim across every open position at once",
      "See claimable per position, lifetime accrued and lifetime claimed",
      "File a withdrawal from available cash",
    ],
    aka: ["Rewards"],
  },
  {
    name: "Horizon",
    route: "/app/horizon",
    purpose: "The maturity calendar: every date the open positions have already committed to.",
    can: [
      "Read maturities one month at a time and on a ninety day rail",
      "Plan a staggered placement with the split planner",
    ],
    aka: ["Payout calendar"],
  },
  {
    name: "Markets",
    route: "/app/market",
    purpose:
      "Live prices for the assets a member can fund with. Reference, never a recommendation.",
    can: ["Read prices and recent movement", "Open one asset for detail"],
    aka: ["Market reference"],
  },
  {
    name: "Signal",
    route: "/app/signal",
    purpose: "The channel the platform publishes to. Members read and save; nobody posts into it.",
    can: ["Read published posts", "Filter by kind", "Save posts to read again"],
  },
  {
    name: "Insight",
    route: "/app/insights",
    purpose: "Observations drawn from the member's own ledger, ranked by what needs doing.",
    can: [
      "Read a short list of things worth acting on, each carrying a real figure from the ledger",
    ],
  },
  {
    name: "Telemetry",
    route: "/app/analytics",
    purpose: "How a member's capital has performed over time.",
    can: ["Read performance, rewards and allocation charts across selectable ranges"],
    aka: ["Analytics"],
  },
  {
    name: "Ledger",
    route: "/app/activity",
    purpose: "The complete record of every event on the account.",
    can: ["Read every open, claim, withdraw and close event", "Filter the record by kind"],
    aka: ["Activity", "History"],
  },
  {
    name: "Copilot",
    route: "/app/copilot",
    purpose:
      "The analyst assistant. Explains the member's own position and the mechanics behind it.",
    can: ["Ask about a position, the term structure or the ladder"],
  },
  {
    name: "Support",
    route: "/app/support",
    purpose: "The practical help assistant. Explains how to use the product.",
    can: ["Ask how to do something, where a surface is, or what a word means"],
  },
  {
    name: "Circle",
    route: "/app/circle",
    purpose: "The invite surface: a stable code and the link that carries it.",
    can: ["Copy the invite code and link", "See a code this browser arrived with"],
    aka: ["Referrals", "Invites"],
  },
  {
    name: "Atlas",
    route: "/app/atlas",
    purpose:
      "One index over the whole product: surfaces, rungs, actions, published posts and terms.",
    can: ["Browse the product by area", "Search across everything and jump straight to it"],
  },
  {
    name: "Glossary",
    route: "/app/glossary",
    purpose:
      "The full reference behind every figure, with the arithmetic worked on the member's own position where there is one.",
    can: ["Look up any figure and read how it is computed", "Search the reference"],
  },
  {
    name: "Orientation",
    route: "/app/orientation",
    purpose: "The first run introduction, reachable by address at any time.",
    can: ["Read four panels on how a term works and where things live"],
  },
  {
    name: "Settings",
    route: "/app/settings",
    purpose: "The control centre.",
    can: ["Reach profile, appearance, notifications and data"],
  },
  {
    name: "Profile",
    route: "/app/settings/profile",
    purpose: "Display name, handle and the stated approach.",
    can: ["Change the display name", "Change the approach"],
  },
  {
    name: "Appearance",
    route: "/app/settings/appearance",
    purpose: "Motion level and interface sound.",
    can: ["Reduce motion", "Turn interface sound off"],
  },
  {
    name: "Notifications",
    route: "/app/settings/notifications",
    purpose: "What the product is allowed to tell a member about.",
    can: ["Choose which notices are shown"],
  },
  {
    name: "Data",
    route: "/app/settings/data",
    purpose: "The member's own record: export it, or reset the account entirely.",
    can: ["Export the ledger", "Erase the account and everything stored in this browser"],
  },
  {
    name: "Terms of Service",
    route: "/legal/terms",
    purpose: "The terms a member accepts by using Rigel.",
    can: ["Read the vault terms, the funding and withdrawal terms and the tier terms"],
  },
  {
    name: "Privacy Policy",
    route: "/legal/privacy",
    purpose: "What is collected and what is not.",
    can: ["Read what is collected, why, and what rights apply"],
  },
  {
    name: "Risk Disclosure",
    route: "/legal/risk",
    purpose: "What can go wrong. The most important document on the platform.",
    can: ["Read the loss, lock up, counterparty, network, security and regulatory risks"],
  },
];

export function surfaceByRoute(route: string): Surface | undefined {
  return SURFACES.find((s) => s.route === route);
}

/* ── the flows a member walks through ───────────────────────────────────── */

export type FlowStep = { title: string; detail: string };

export type FlowId = "deposit" | "withdraw" | "claim" | "settle" | "roll" | "relay";

export type Flow = {
  id: FlowId;
  name: string;
  route: string;
  steps: FlowStep[];
  /** Honest notes about what this build does and does not do. */
  notes: string[];
};

const FUNDING_ASSETS = ASSETS.map((a) => `${a.symbol} on ${a.network}`).join(", ");

export const FLOWS: Flow[] = [
  {
    id: "deposit",
    name: "Guided deposit: opening a vault",
    route: "/app/vaults/new",
    steps: [
      {
        title: "Amount",
        detail: `Type an amount or tap a rung's entry figure. The minimum is ${usd(ENTRY_TIER.entry)}, the ${ENTRY_TIER.name} entry. Below that there is no rung and no vault to open.`,
      },
      {
        title: "Read the projection",
        detail: `Once the amount clears the minimum the form shows per day, term reward and value at maturity, computed at ${DAY_PCT} a day across ${CYCLE_DAYS} days, plus the rung the amount clears.`,
      },
      {
        title: "Funding asset",
        detail: `Choose one of the funding assets: ${FUNDING_ASSETS}. The form shows the live unit rate and the units that amount converts to.`,
      },
      {
        title: "Address",
        detail:
          "Copy the network address for the chosen asset. Sending an asset on the wrong network is generally unrecoverable by anyone.",
      },
      {
        title: "Acknowledge",
        detail: `Tick the acknowledgement: capital is committed for the ${CYCLE_DAYS} day term, projections are illustrative rather than guaranteed, and digital asset investments carry risk including loss of principal.`,
      },
      {
        title: "Confirm",
        detail:
          "Confirming writes one open event to the ledger carrying the amount, the rung, the asset and the network. The term starts at that instant.",
      },
      {
        title: "Receipt",
        detail:
          "The last step shows a confirmation tracker and a receipt carrying a short quotable reference derived from the event id. The receipt can be saved as an image.",
      },
    ],
    notes: [
      "The confirmation tracker advances on a timer because this build has no chain watcher. The surface says so in place rather than implying a live network reading.",
      "A roll arrives at the same form with the capital carried across, and is recorded as funded from the account balance so it is not counted twice as new contribution.",
      "This build records the position in the browser. Custody and settlement require the production backend.",
    ],
  },
  {
    id: "withdraw",
    name: "Withdrawing available cash",
    route: "/app/desk",
    steps: [
      {
        title: "Have available cash",
        detail:
          "Only available cash can be withdrawn. Rewards still inside a position are not available until they are claimed, and principal is not available until the position is settled.",
      },
      {
        title: "Amount",
        detail:
          "Enter an amount up to the available balance. A MAX control fills the whole balance.",
      },
      { title: "Destination", detail: "Enter the destination address." },
      {
        title: "File the request",
        detail:
          "Submitting writes one withdraw event carrying the amount and the destination. Available cash falls by that amount.",
      },
      {
        title: "Settlement",
        detail: `The settlement target attached to the member's rung is the window the desk works to, counted from when the request is filed rather than from when a term matured. Targets run from ${ENTRY_TIER.settlementHours} hours at ${ENTRY_TIER.name} to ${TOP_TIER.settlementHours} hours at ${TOP_TIER.name}.`,
      },
    ],
    notes: [
      "A settlement target is an operational target, published so it can be measured against. It is not a contractual deadline and it is not a network guarantee.",
      "The Terms describe withdrawals going only to destinations registered in advance, with a hold window on a new destination. That registration is part of the production service and is not in this preview build.",
      "Withdrawals can also be filed from Yield.",
    ],
  },
  {
    id: "claim",
    name: "Claiming rewards",
    route: "/app/rewards",
    steps: [
      {
        title: "Rewards accrue continuously",
        detail:
          "Anything accrued and not yet claimed is claimable at any point during the term. There is nothing to wait for.",
      },
      {
        title: "Claim",
        detail:
          "Claiming sweeps every open position holding at least one cent, writing one claim event per position.",
      },
      {
        title: "Where it lands",
        detail:
          "Claimed rewards move into available cash. The term keeps running and accrual is unaffected.",
      },
    ],
    notes: [
      "Claiming and settling are different moves. A claim moves rewards and leaves the term open. Settling closes the position and returns principal.",
    ],
  },
  {
    id: "settle",
    name: "Settling a position",
    route: "/app/vaults",
    steps: [
      {
        title: "Maturity",
        detail: `A position matures ${CYCLE_DAYS} days after it opened and stops accruing there.`,
      },
      {
        title: "Settle",
        detail:
          "Settling writes one close event and returns that position's principal to available cash.",
      },
      {
        title: "Then what",
        detail: "The principal can be withdrawn, or placed into a new term.",
      },
    ],
    notes: [
      "A matured position left open earns nothing further. That is the single most common reason a member's daily rate stops moving.",
      "Settling before maturity is an exception handled at the platform's discretion. It forfeits accrual on the unfinished term and may not be granted at all.",
    ],
  },
  {
    id: "relay",
    name: "Relay: rolling a term without deciding again",
    route: "/app/vaults/:id",
    steps: [
      {
        title: "Arm it",
        detail:
          "A relay is armed on one position, from that position's own panel. The first time a member arms one they confirm explicitly, because a relay writes to the ledger later without asking again.",
      },
      {
        title: "Choose what it carries",
        detail:
          "Full carries principal plus whatever rewards are still unclaimed on that position. Principal carries the principal alone and leaves the rewards to be claimed.",
      },
      {
        title: "It fires at maturity",
        detail:
          "When the term matures, the relay settles it and opens a new one with what it carried, as a single write. The new position is armed too, so a member arms once rather than every term.",
      },
      {
        title: "Disarm any time",
        detail:
          "Disarming leaves the term running and the position settles by hand instead. The instruction can be changed or removed while the term is still open.",
      },
    ],
    notes: [
      "A relay fires when the member next opens the product after maturity, never before. Nothing runs while nobody is there.",
      "Its events are stamped at the moment they are written, never backdated to the maturity date. Backdating would fabricate accrual for days the capital actually sat still.",
      "What it carries is read off the position's own claimable figure, not principal times the term rate, so a member who claimed mid term carries what is genuinely left.",
      "The new position is recorded as funded from the account balance, so a relay never inflates contributed or buys standing that was not paid for.",
      "Automatic firing can be turned off, in which case due relays are run by hand.",
    ],
  },
  {
    id: "roll",
    name: "Rolling a matured term by hand",
    route: "/app/vaults/new",
    steps: [
      {
        title: "Settle and re-place",
        detail:
          "A roll settles the matured term and places the capital straight into a new one, in the same movement.",
      },
      {
        title: "What carries",
        detail:
          "Principal carries. Rewards carry too if they have been claimed into the balance first.",
      },
      {
        title: "How it is recorded",
        detail:
          "The new open event is marked as funded from the account balance, so contributed does not rise on money that was only ever brought in once.",
      },
    ],
    notes: [
      "Standing is measured on the greater of contributed and peak deployed, so rolling still moves a member up the ladder as the position grows.",
    ],
  },
];

/* ── referrals ──────────────────────────────────────────────────────────── */

export type ReferralModel = {
  surface: string;
  route: string;
  facts: string[];
  /** What the product deliberately does not claim, and why. */
  notYet: string[];
};

export const REFERRALS: ReferralModel = {
  surface: "Circle",
  route: "/app/circle",
  facts: [
    "Every member has an invite code in the form RG followed by six characters.",
    "The code is derived from the member's own name rather than allocated by a server, so the same member always sees the same code and it survives a reload with nothing stored.",
    "The alphabet excludes O, 0, I and 1, so a code read aloud or copied off a screen cannot be mistyped into someone else's.",
    "The invite link carries the code as a ref query parameter on the site root.",
    "A browser arriving through such a link records the code once. First touch wins: an existing inbound code is never overwritten by a later link.",
  ],
  notYet: [
    "There is no join count, no referral earnings figure and no leaderboard. Attribution needs the production backend, and the product does not print a number it cannot derive.",
    "There is no referral bonus, rate uplift or commission in this build. If a member asks what they earn for an invite, the honest answer is that nothing is defined yet.",
  ],
};

/* ── the ledger ─────────────────────────────────────────────────────────── */

export type LedgerModel = {
  events: { kind: string; carries: string; meaning: string }[];
  derived: string[];
  storage: string[];
};

export const LEDGER_MODEL: LedgerModel = {
  events: [
    {
      kind: "open",
      carries:
        "amount, tier, asset, network, and a flag when the capital came from the account balance",
      meaning: "Capital placed into a vault. Starts a term.",
    },
    {
      kind: "claim",
      carries: "position id and amount",
      meaning: "Accrued rewards moved from a position into available cash.",
    },
    {
      kind: "withdraw",
      carries: "amount and destination address",
      meaning: "Cash sent out to an external address.",
    },
    {
      kind: "close",
      carries: "position id",
      meaning: "A position settled and returned its principal to available cash.",
    },
    {
      kind: "relay.set",
      carries: "position id and mode, either full or principal",
      meaning:
        "A standing instruction to carry this position into a new term at maturity. The latest instruction for a position wins, so arming, changing mode and disarming are one mechanism and the whole history stays readable.",
    },
    {
      kind: "relay.clear",
      carries: "position id",
      meaning: "The standing instruction on that position is withdrawn.",
    },
  ],
  derived: [
    "The log is append only. Events are never edited or deleted to make a figure come out differently.",
    "Every figure in the product is replayed from that log plus the clock: portfolio value, accrued rewards, available cash, standing, term progress, the maturity calendar and the performance charts.",
    "The same events and the same clock always produce the same figures, which is why two surfaces never disagree.",
  ],
  storage: [
    "In this build the log lives in the member's own browser, in local storage.",
    "It is not synced, not backed up and not visible to anyone else, including the platform.",
    "Clearing site data clears it. Another browser or another device starts empty.",
    "It can be exported, and the account can be erased, from Settings then Data.",
  ],
};

/* ── approaches ─────────────────────────────────────────────────────────── */

export type ApproachFact = {
  id: ApproachId;
  name: string;
  pitch: string;
  effect: string;
  tradeoff: string;
};

export const APPROACH_FACTS: ApproachFact[] = APPROACHES.map((a) => ({
  id: a.id,
  name: a.name,
  pitch: a.pitch,
  effect: a.effect,
  tradeoff: a.tradeoff,
}));

export const APPROACH_RULE =
  "An approach is a stated intention, not a product a member buys. It changes what the interface leads with and nothing else: never the rate, never the term, never what the ledger computes.";

/* ── glossary ───────────────────────────────────────────────────────────── */

export type GlossaryEntry = { term: string; definition: string };

export const GLOSSARY: GlossaryEntry[] = [
  {
    term: "Vault",
    definition:
      "One position: capital placed under a fixed term. A member can run several at once.",
  },
  {
    term: "Term",
    definition: `The fixed ${CYCLE_DAYS} day window a vault runs, starting the instant capital is placed.`,
  },
  {
    term: "Principal",
    definition:
      "The capital an open event placed into a vault. Nothing after it changes the figure.",
  },
  {
    term: "Accrual",
    definition: `${DAY_PCT} of principal per day, continuous through the term rather than paid in a lump at the end.`,
  },
  {
    term: "Accrued rewards",
    definition:
      "What one position has earned so far, measured against the clock and capped at the term.",
  },
  {
    term: "Claimable",
    definition: "Accrued rewards a position has not yet had claimed out of it.",
  },
  {
    term: "Claim",
    definition:
      "Moving accrued rewards out of a position and into available cash. The term keeps running.",
  },
  {
    term: "Term reward",
    definition: `What a position accrues across a full term: principal x ${TERM_PCT}. It is a ceiling, not a forecast.`,
  },
  {
    term: "Maturity",
    definition: `The instant a term completes, ${CYCLE_DAYS} days after opening. Accrual stops and the position holds at ${TERM_PCT}.`,
  },
  {
    term: "Settle",
    definition:
      "Closing a position so its principal returns to available cash. Distinct from maturity, which is fixed at open.",
  },
  {
    term: "Roll",
    definition:
      "Settling a matured term and placing the same capital into a new one in one movement.",
  },
  {
    term: "Redeploy",
    definition: "Putting idle cash back to work in a new term. Idle cash accrues nothing.",
  },
  {
    term: "Relay",
    definition:
      "A standing instruction on one position: at maturity, carry it into a new term rather than letting it sit still. Armed once, it continues term after term until disarmed.",
  },
  {
    term: "Relay mode",
    definition:
      "What a relay carries. Full carries principal plus whatever rewards are still unclaimed on that position. Principal carries the principal alone.",
  },
  {
    term: "Available cash",
    definition:
      "Settled money that can be withdrawn right now: claims plus returned principal, less withdrawals and less anything re-placed from the balance.",
  },
  {
    term: "Deployed",
    definition: "Principal currently sitting inside open vaults.",
  },
  {
    term: "Portfolio value",
    definition:
      "Deployed principal plus unclaimed rewards plus available cash. Withdrawn money is not counted.",
  },
  {
    term: "Contributed",
    definition:
      "External capital ever brought in. Capital re-placed from the account balance is excluded, because it was already counted once.",
  },
  {
    term: "Peak deployed",
    definition:
      "The most principal that was ever open at one instant, replayed from the log rather than accumulated.",
  },
  {
    term: "Standing",
    definition: "What the rung is measured on: the greater of contributed and peak deployed.",
  },
  {
    term: "Tier",
    definition: `A rung of the ladder. ${TIERS.length} rungs from ${usd(ENTRY_TIER.entry)} to ${usd(TOP_TIER.entry)}, differing on settlement speed, access and tooling, never on rate.`,
  },
  {
    term: "Settlement target",
    definition:
      "The window the desk works to on a withdrawal request, counted from when the request is filed. A target, not a guarantee.",
  },
  {
    term: "Net gain",
    definition: "Portfolio value plus withdrawn, less contributed.",
  },
  {
    term: "Return to date",
    definition: "Net gain as a fraction of contributed.",
  },
  {
    term: "Daily rate",
    definition:
      "The sum of daily accrual across open positions that have not yet matured. A matured position contributes nothing to it.",
  },
  {
    term: "Ledger",
    definition: "The append only log of events, and the surface that shows it.",
  },
  {
    term: "Event",
    definition:
      "One recorded fact: an open, a claim, a withdraw or a close. Every figure is replayed from these.",
  },
  {
    term: "Horizon",
    definition:
      "The maturity calendar. Not a forecast: the dates open positions have already committed to.",
  },
  {
    term: "Trajectory",
    definition: "The forward timeline of capital maturing.",
  },
  {
    term: "Signal",
    definition:
      "The channel the platform publishes to. Members read and save; nobody posts into it.",
  },
  {
    term: "Insight",
    definition:
      "An observation derived from the member's own ledger, ranked by what needs doing. Never a market call.",
  },
  {
    term: "Telemetry",
    definition: "Performance charts drawn by replaying the ledger.",
  },
  {
    term: "Atlas",
    definition: "The index over the whole product, browsable by area and searchable.",
  },
  {
    term: "Circle",
    definition: "The invite surface, and the member's own invite code.",
  },
  {
    term: "Copilot",
    definition: "The analyst assistant. Explains a member's own position and the mechanics.",
  },
  {
    term: "Support",
    definition: "The practical help assistant. Explains how to use the product.",
  },
  {
    term: "Tier Match",
    definition:
      "Four questions scored against the published tier table. It reports a rung and its reasoning, and never tells anyone what to do.",
  },
  {
    term: "Compare",
    definition: "Two rungs side by side, showing only the lines that differ.",
  },
  {
    term: "Approach",
    definition:
      "A member's stated way of running the instrument: steady, compounding, laddered or watching. It changes emphasis, never arithmetic.",
  },
  {
    term: "Cadence",
    definition: "The consecutive day counter.",
  },
  {
    term: "Pulse",
    definition:
      "The live band of activity. Where it shows illustrative activity rather than observed activity, it is labelled.",
  },
  {
    term: "Orientation",
    definition: "The first run introduction, reachable by address at any time.",
  },
  {
    term: "Wayfinder",
    definition: "Contextual help, shown beside the thing it explains.",
  },
  {
    term: "First Light",
    definition:
      "The panel shown before a first placement. It is an explanation of the ordinary term arithmetic, not an offer and not a bonus.",
  },
  {
    term: "Crest",
    definition: "The aperture mark, the platform's logo.",
  },
  {
    term: "Member reference",
    definition: "A short quotable code derived from the handle, for use in a support message.",
  },
  {
    term: "Deposit reference",
    definition:
      "A short quotable code on a deposit receipt, derived from the open event id so the same position always yields the same code.",
  },
];

export function glossaryTerm(name: string): GlossaryEntry | undefined {
  const q = name.trim().toLowerCase();
  return GLOSSARY.find((g) => g.term.toLowerCase() === q);
}

/* ── the prohibitions ───────────────────────────────────────────────────── */

/**
 * These travel with the facts on purpose. A briefing that lists a rate without
 * listing what may not be claimed about it is half a briefing.
 */
export const LIMITS: string[] = [
  `The published ${TERM_PCT} term structure describes how the product is designed to accrue. It is a target, not a promise of payment, and it is not guaranteed. Never promise a return, never imply one, and never describe an outcome as certain.`,
  "Capital placed in a vault is at risk, including total loss. Say so plainly whenever the conversation touches returns, risk, or how much someone should place.",
  "There is no deposit protection, investor compensation scheme or insurance behind this product.",
  "Never invent or imply a licence, a regulator, an audit, an insurance policy, a custody partner, a banking partner, an exchange partner or any other third party relationship. Rigel claims none of these, and the absence of a claim is honest rather than an oversight.",
  "Never state a member count, an assets figure, a volume, a payout total, an uptime number, a track record or any other statistic. The product cannot derive them, so they do not exist.",
  "Never give investment, tax or legal advice, and never recommend that someone place capital, place more, or place less.",
  "Never state a figure that is not either a published constant of the product or a value from the member's own derived snapshot.",
  "A settlement target is an operational target measured from when a request is filed. It is not a contractual deadline and not a network guarantee.",
  "Early exit from a running term is an exception at the platform's discretion, forfeits accrual on the unfinished term, and may not be granted at all. Never present it as a right.",
  "When a question falls outside what can be answered from the product, say so plainly and point to the surface or document that covers it. Do not guess, and do not fill a gap with something that sounds right.",
];

/* ── rendering ──────────────────────────────────────────────────────────── */

export type SectionId =
  | "platform"
  | "term"
  | "tiers"
  | "standing"
  | "surfaces"
  | "flows"
  | "referrals"
  | "ledger"
  | "approaches"
  | "glossary"
  | "limits";

const bullets = (lines: string[]): string => lines.map((l) => `- ${l}`).join("\n");

/** One flow on its own, for an answer that only needs that flow. */
export function renderFlow(id: FlowId): string {
  const flow = FLOWS.find((f) => f.id === id);
  if (!flow) return "";
  return [
    `${flow.name} (${flow.route})`,
    flow.steps.map((s, i) => `  ${i + 1}. ${s.title}: ${s.detail}`).join("\n"),
    flow.notes.map((n) => `  Note: ${n}`).join("\n"),
  ].join("\n");
}

const RENDER: Record<SectionId, () => string> = {
  platform: () =>
    [`ABOUT ${PLATFORM.name.toUpperCase()}`, PLATFORM.what, bullets(PLATFORM.buildState)].join(
      "\n",
    ),

  term: () =>
    [
      "TERM MECHANICS",
      bullets(TERM.arithmetic),
      "Lifecycle of a position:",
      bullets(TERM.lifecycle.map((l) => `${l.action}: ${l.effect}`)),
      "Worked example:",
      bullets(TERM.worked),
    ].join("\n"),

  tiers: () =>
    [
      `THE TIER LADDER (${TIERS.length} rungs, identical rate at every rung)`,
      bullets(
        TIER_FACTS.map(
          (t) =>
            `${t.name}, entry ${usd(t.entry)}, settlement target ${t.settlementHours}h. At entry: ${usd(t.dailyAtEntry, 2)} a day, ${usd(t.termAtEntry)} across the term, ${usd(t.maturityAtEntry)} at maturity. Unlocks: ${t.unlocks.join(", ")}.${t.stepFromBelow > 0 ? ` Crossing from the rung below costs ${usd(t.stepFromBelow)} of further contribution.` : ""}`,
        ),
      ),
      `Every rung earns the same ${TERM_PCT} over ${CYCLE_DAYS} days. Tiers differ on settlement speed, access and tooling, never on rate.`,
    ].join("\n"),

  standing: () => ["STANDING, AND HOW A RUNG IS REACHED", bullets(STANDING)].join("\n"),

  surfaces: () =>
    [
      "SURFACES (name, route, what it is for, what a member can do there)",
      SURFACES.map(
        (s) =>
          `- ${s.name} (${s.route}): ${s.purpose} Can: ${s.can.join("; ")}.${s.aka ? ` Previously called ${s.aka.join(", ")}.` : ""}`,
      ).join("\n"),
    ].join("\n"),

  flows: () =>
    [
      "FLOWS, STEP BY STEP",
      FLOWS.map((f) =>
        [
          `${f.name} (${f.route})`,
          f.steps.map((s, i) => `  ${i + 1}. ${s.title}: ${s.detail}`).join("\n"),
          f.notes.map((n) => `  Note: ${n}`).join("\n"),
        ].join("\n"),
      ).join("\n"),
    ].join("\n"),

  referrals: () =>
    [
      `REFERRALS (${REFERRALS.surface}, ${REFERRALS.route})`,
      bullets(REFERRALS.facts),
      "What is deliberately not claimed:",
      bullets(REFERRALS.notYet),
    ].join("\n"),

  ledger: () =>
    [
      "THE LEDGER",
      "Event kinds:",
      bullets(LEDGER_MODEL.events.map((e) => `${e.kind}, carrying ${e.carries}. ${e.meaning}`)),
      bullets(LEDGER_MODEL.derived),
      "Where it lives today:",
      bullets(LEDGER_MODEL.storage),
    ].join("\n"),

  approaches: () =>
    [
      "APPROACHES A MEMBER CAN STATE",
      bullets(
        APPROACH_FACTS.map(
          (a) => `${a.name}: ${a.pitch} Effect: ${a.effect} Tradeoff: ${a.tradeoff}`,
        ),
      ),
      APPROACH_RULE,
    ].join("\n"),

  glossary: () =>
    ["GLOSSARY", GLOSSARY.map((g) => `- ${g.term}: ${g.definition}`).join("\n")].join("\n"),

  limits: () => ["WHAT YOU MAY NEVER SAY", bullets(LIMITS)].join("\n"),
};

/** Reading order. Platform first so everything after it has a frame. */
export const SECTION_ORDER: SectionId[] = [
  "platform",
  "term",
  "tiers",
  "standing",
  "surfaces",
  "flows",
  "referrals",
  "ledger",
  "approaches",
  "glossary",
  "limits",
];

// Rendering walks a lot of arrays for a string that never changes. Cached so a
// warm serverless instance pays for it once.
const cache = new Map<SectionId, string>();

export function renderSection(id: SectionId): string {
  const hit = cache.get(id);
  if (hit !== undefined) return hit;
  const out = RENDER[id]();
  cache.set(id, out);
  return out;
}

/** The whole product, as compact plain text for a system prompt. */
export function briefing(): string {
  return SECTION_ORDER.map(renderSection).join("\n\n");
}

/**
 * Just the sections a topic needs.
 *
 * `platform` and `limits` are always included. The frame and the prohibitions
 * are not optional context: a briefing trimmed down to the tier table with the
 * warnings dropped is exactly the briefing that produces a sentence nobody can
 * stand behind.
 */
export function briefingFor(sections: SectionId[]): string {
  const wanted = new Set<SectionId>(["platform", ...sections, "limits"]);
  return SECTION_ORDER.filter((id) => wanted.has(id))
    .map(renderSection)
    .join("\n\n");
}

/* ── topics ─────────────────────────────────────────────────────────────── */

export type TopicId =
  | "term"
  | "tiers"
  | "standing"
  | "deposit"
  | "withdraw"
  | "claim"
  | "settle"
  | "relay"
  | "referrals"
  | "navigation"
  | "ledger"
  | "approaches"
  | "vocabulary"
  | "risk"
  | "assistants";

export type Topic = {
  id: TopicId;
  label: string;
  keywords: string[];
  sections: SectionId[];
  /**
   * The flows this topic is actually about. Used when answering without a
   * model, so a question about depositing gets the deposit flow rather than
   * all five of them.
   */
  flows?: FlowId[];
};

export const TOPICS: Topic[] = [
  {
    id: "term",
    label: "How a term works",
    keywords: [
      "term",
      "accrue",
      "accrual",
      "accrued",
      "rate",
      "daily",
      "per day",
      "30 day",
      "thirty",
      "reward",
      "rewards",
      "earn",
      "earning",
      "interest",
      "yield",
      "return",
      "compound",
      "mature",
      "maturity",
      "matured",
      "progress",
    ],
    sections: ["term"],
  },
  {
    id: "tiers",
    label: "The tier ladder",
    keywords: [
      "tier",
      "tiers",
      "rung",
      "ladder",
      "core",
      "signal tier",
      "vector",
      "apex",
      "meridian",
      "sovereign",
      "entry",
      "upgrade",
      "unlock",
      "benefit",
      "benefits",
      "compare",
      "match",
      "which tier",
      "settlement target",
      "plan",
      "package",
    ],
    sections: ["tiers", "standing"],
  },
  {
    id: "standing",
    label: "Standing and progression",
    keywords: [
      "standing",
      "rank",
      "level",
      "progress",
      "contributed",
      "contribution",
      "peak",
      "deployed",
      "next tier",
      "how far",
      "qualify",
    ],
    sections: ["standing", "tiers"],
  },
  {
    id: "deposit",
    label: "Opening a vault",
    keywords: [
      "deposit",
      "open",
      "opening",
      "fund",
      "funding",
      "place",
      "placement",
      "start",
      "minimum",
      "address",
      "btc",
      "eth",
      "usdt",
      "sol",
      "bnb",
      "bitcoin",
      "ethereum",
      "solana",
      "network",
      "asset",
      "receipt",
      "reference",
      "confirmation",
      "confirmations",
      "new vault",
    ],
    sections: ["flows", "term"],
    flows: ["deposit"],
  },
  {
    id: "withdraw",
    label: "Withdrawing",
    keywords: [
      "withdraw",
      "withdrawal",
      "cash out",
      "payout",
      "send",
      "transfer",
      "available",
      "balance",
      "settlement",
      "how long",
      "hours",
      "destination",
    ],
    sections: ["flows", "tiers"],
    flows: ["withdraw"],
  },
  {
    id: "claim",
    label: "Claiming rewards",
    keywords: ["claim", "claimed", "claimable", "collect", "harvest", "sweep", "unclaimed"],
    sections: ["flows", "term"],
    flows: ["claim"],
  },
  {
    id: "settle",
    label: "Settling and rolling",
    keywords: [
      "settle",
      "settled",
      "settling",
      "close",
      "closing",
      "roll",
      "rollover",
      "redeploy",
      "reinvest",
      "early exit",
      "exit",
      "lock",
      "locked",
      "lockup",
    ],
    sections: ["flows", "term"],
    flows: ["settle", "roll", "relay"],
  },
  {
    id: "relay",
    label: "Relays",
    keywords: [
      "relay",
      "relays",
      "automatic",
      "automatically",
      "auto",
      "arm",
      "armed",
      "disarm",
      "standing instruction",
      "every term",
      "keep rolling",
      "roll automatically",
      "rolls automatically",
      "without me",
    ],
    sections: ["flows", "ledger"],
    flows: ["relay"],
  },
  {
    id: "referrals",
    label: "Referrals",
    keywords: [
      "referral",
      "referrals",
      "refer",
      "invite",
      "invitation",
      "circle",
      "code",
      "friend",
      "share",
      "commission",
      "bonus",
    ],
    sections: ["referrals"],
  },
  {
    id: "navigation",
    label: "Where things are",
    keywords: [
      "where",
      "find",
      "page",
      "screen",
      "surface",
      "route",
      "navigate",
      "menu",
      "sidebar",
      "home",
      "desk",
      "vaults",
      "horizon",
      "insight",
      "insights",
      "telemetry",
      "analytics",
      "atlas",
      "glossary",
      "settings",
      "profile",
      "notifications",
      "export",
      "reset",
      "erase",
    ],
    sections: ["surfaces"],
  },
  {
    id: "ledger",
    label: "The ledger and your data",
    keywords: [
      "ledger",
      "activity",
      "event",
      "events",
      "history",
      "record",
      "log",
      "data",
      "stored",
      "storage",
      "browser",
      "device",
      "sync",
      "backup",
      "privacy",
      "delete",
      "gone",
      "lost",
      "another device",
    ],
    sections: ["ledger"],
  },
  {
    id: "approaches",
    label: "Approaches",
    keywords: [
      "approach",
      "steady",
      "compounding",
      "laddered",
      "ladder my",
      "watching",
      "strategy",
      "stagger",
      "tranche",
    ],
    sections: ["approaches", "term"],
  },
  {
    id: "vocabulary",
    label: "What a word means",
    // Deliberately no question openers. "what is" and "how do i" appear in
    // front of every kind of question, so scoring them would route half the
    // traffic here and, worse, would match a question about nothing at all.
    keywords: [
      "meaning",
      "means",
      "definition",
      "definitions",
      "define",
      "glossary",
      "terminology",
      "jargon",
      "stand for",
      "short for",
    ],
    sections: ["glossary"],
  },
  {
    id: "risk",
    label: "Risk and the legal position",
    keywords: [
      "risk",
      "risky",
      "safe",
      "safety",
      "guarantee",
      "guaranteed",
      "insured",
      "insurance",
      "licence",
      "license",
      "regulated",
      "regulator",
      "audit",
      "custody",
      "scam",
      "legit",
      "trust",
      "lose",
      "loss",
      "protected",
      "protection",
      "terms",
      "legal",
      "tax",
      "advice",
    ],
    sections: ["limits", "ledger"],
  },
  {
    id: "assistants",
    label: "The assistants themselves",
    keywords: ["copilot", "support", "assistant", "assistants", "ai", "chatbot"],
    sections: ["surfaces"],
  },
];

const WORD = /[a-z0-9]+/g;

/**
 * Which topics a question is about, best match first.
 *
 * Multi word keywords are matched as substrings and single words against the
 * question's own word list, so "rate" does not match inside "separate".
 */
export function topicsFor(text: string): TopicId[] {
  const lower = text.toLowerCase();
  const words = new Set(lower.match(WORD) ?? []);
  const scored: { id: TopicId; score: number }[] = [];

  for (const topic of TOPICS) {
    let score = 0;
    for (const key of topic.keywords) {
      if (key.includes(" ")) {
        if (lower.includes(key)) score += 2;
      } else if (words.has(key)) {
        score += 1;
      }
    }
    if (score > 0) scored.push({ id: topic.id, score });
  }

  return scored.sort((a, b) => b.score - a.score).map((s) => s.id);
}

/** Sections that carry a question, or a sensible core when nothing matches. */
const DEFAULT_SECTIONS: SectionId[] = ["term", "tiers", "standing", "surfaces"];

/** A subset of the flows under the same heading the full section uses. */
function renderFlows(ids: FlowId[]): string {
  return ["FLOWS, STEP BY STEP", ids.map(renderFlow).filter(Boolean).join("\n")].join("\n");
}

/**
 * What a set of topics asks for, rendered in reading order.
 *
 * A topic that names its own flows gets those flows in place of the whole
 * flows section, which is six of them and mostly not what was asked.
 */
function compose(topics: TopicId[], frame: boolean): string {
  const sections = new Set<SectionId>(frame ? ["platform", "limits"] : []);
  const flows = new Set<FlowId>();

  for (const id of topics) {
    const topic = TOPICS.find((t) => t.id === id);
    if (!topic) continue;
    topic.sections.forEach((s) => sections.add(s));
    topic.flows?.forEach((f) => flows.add(f));
  }

  return SECTION_ORDER.filter((id) => sections.has(id))
    .map((id) => (id === "flows" && flows.size > 0 ? renderFlows([...flows]) : renderSection(id)))
    .join("\n\n");
}

/**
 * The briefing narrowed to what a question needs.
 *
 * Only the two strongest topics are used. A question that trips five topics is
 * usually a broad one, and pulling in every section it touched would produce a
 * prompt larger than the full briefing it was meant to trim.
 */
export function briefingForQuestion(text: string): string {
  const topics = topicsFor(text).slice(0, 2);
  if (topics.length === 0) return briefingFor(DEFAULT_SECTIONS);
  return compose(topics, true);
}

/* ── answering without a model ──────────────────────────────────────────── */

export type ReferenceAnswer = {
  topic: TopicId;
  heading: string;
  body: string;
};

/**
 * A real answer, drawn straight from the records above.
 *
 * This is what the surfaces fall back to when the assistant is not connected.
 * It is deliberately the product reference rather than an imitation of a
 * reply: a member is better served by the facts under a plain heading than by
 * something shaped like a model answer that no model produced.
 */
export function referenceAnswer(question: string): ReferenceAnswer | null {
  const [best] = topicsFor(question);
  if (!best) return null;
  const topic = TOPICS.find((t) => t.id === best);
  if (!topic) return null;
  return { topic: topic.id, heading: topic.label, body: compose([topic.id], false) };
}
