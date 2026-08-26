/**
 * The post library behind Signal.
 *
 * Each entry is a small generator: given a context it returns one finished
 * post. Copy is assembled from a set of variants so the same template does not
 * read identically twice, and every figure it interpolates is a real product
 * constant rather than something invented for effect.
 *
 * Why the tier facts are redeclared here instead of imported from
 * `src/domain/tiers.ts`: this file runs in the Vercel Node runtime, while the
 * `src` tree is a browser bundle compiled by Vite with an `@/` path alias that
 * does not exist server side. Importing across that boundary would drag the
 * client build into the function. The constants below are therefore a
 * deliberate copy, and they must be updated together with the domain file.
 * There is one source of truth for the member: what the ledger computes. This
 * is copy for prose only.
 *
 * Content rules, enforced by hand at review time because no linter can:
 * - No invented users, deposits, returns, partnerships, audits or statistics.
 * - No breaking news, no market calls, no forecast of any figure.
 * - Nothing that promises an outcome. A published rate is a structure, not a promise.
 * - No em dash characters anywhere in member facing copy.
 */

export type PostKind =
  | "insight"
  | "education"
  | "product"
  | "tier"
  | "vault"
  | "principle"
  | "announcement"
  | "question";

export type Post = {
  id: string;
  kind: PostKind;
  title: string;
  body: string;
  publishedAt: number;
  tags?: string[];
  tierId?: string;
};

/* ── product constants ──────────────────────────────────────────────────── */

/**
 * Imported, not mirrored.
 *
 * This block used to be a hand written copy of the ladder and the economics,
 * and it drifted twice: once when the tiers changed and once when the whole
 * term structure was replaced with daily accrual. A copy of a source of truth
 * is not a source of truth, so it now reads the real module. `tiers.ts` is
 * pure data and pure functions with no browser dependency, which is what makes
 * that safe from a serverless handler.
 */
import {
  DAILY_RATE,
  TIERS,
  WITHDRAW_INTERVAL_DAYS,
  rewardOver,
  type Tier,
} from "../../src/domain/tiers";

const ENTRY_TIER = TIERS[0];
const TOP_TIER = TIERS[TIERS.length - 1];

const DAY_PCT = `${(DAILY_RATE * 100).toFixed(0)}%`;
/** What accrues between one withdrawal window and the next, as a share. */
const WINDOW_PCT = `${Math.round(DAILY_RATE * WITHDRAW_INTERVAL_DAYS * 100)}%`;

function usd(n: number): string {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/** What a rung adds over the one below it, in one phrase. */
function adds(tier: Tier): string {
  return tier.benefits[0].charAt(0).toLowerCase() + tier.benefits[0].slice(1);
}

/* ── context ────────────────────────────────────────────────────────────── */

export type TemplateContext = {
  /** Publish time, injected so a render is reproducible in a test. */
  now: number;
  /** Choose one variant. Seeded per invocation, never crypto. */
  pick: <T>(items: readonly T[]) => T;
  /** Stable, sortable id for this publication. */
  id: (slug: string) => string;
};

/** Mulberry32: tiny, deterministic, good enough to shuffle copy variants. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeContext(now: number, seed: number = now): TemplateContext {
  const next = rng(seed);
  return {
    now,
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length) % items.length],
    id: (slug: string) => `${slug}-${Math.floor(now / 1000).toString(36)}`,
  };
}

/* ── templates ──────────────────────────────────────────────────────────── */

export type Template = {
  /** Stable key, used as the rotation ledger's identity. */
  key: string;
  kind: PostKind;
  /**
   * Relative likelihood when several templates are eligible. Mechanics and
   * education carry the most weight because they are what a member most
   * often needs; announcements carry the least because an announcement with
   * nothing to announce is noise.
   */
  weight: number;
  /** Hours this template must rest before it is eligible again. */
  cooldownHours: number;
  render: (ctx: TemplateContext) => Post;
};

export const TEMPLATES: Template[] = [
  /* 1. education: the core mechanic, restated from different angles. */
  {
    key: "accrual-mechanics",
    kind: "education",
    weight: 10,
    cooldownHours: 36,
    render: (ctx) => {
      const principal = ctx.pick([ENTRY_TIER.entry, 1000, 2500, 5000]);
      const angle = ctx.pick([
        `A vault accrues ${DAY_PCT} of principal per day from the moment capital is placed, and it does not stop. There is no term and no maturity. On ${usd(principal)} that is ${usd(rewardOver(principal, 1))} a day and ${usd(rewardOver(principal, WITHDRAW_INTERVAL_DAYS))} by the first withdrawal window.`,
        `The whole mechanic is one line: ${DAY_PCT} of principal a day, for as long as it stays in place. ${usd(principal)} placed today holds ${usd(principal + rewardOver(principal, 30))} thirty days from now, and the daily figure never changes.`,
        `Placing ${usd(principal)} starts accruing immediately. Each day adds ${DAY_PCT} of the original principal, so nothing compounds unless you fold it back in yourself. Nothing about the rate depends on which tier you sit in.`,
      ]);
      return {
        id: ctx.id("accrual-mechanics"),
        kind: "education",
        title: ctx.pick([
          `How daily accrual works`,
          `The mechanic, in one paragraph`,
          `${DAY_PCT} a day, with no end date`,
        ]),
        body: `${angle} Nothing stops it: accrual on day one hundred is the same as on day one, and the only date that arrives is the withdrawal window every ${WITHDRAW_INTERVAL_DAYS} days.`,
        publishedAt: ctx.now,
        tags: ["accrual", "mechanics"],
      };
    },
  },

  /* 2. vault: continuous accrual, and what follows from it. */
  {
    key: "continuous-accrual",
    kind: "vault",
    weight: 8,
    cooldownHours: 48,
    render: (ctx) => ({
      id: ctx.id("continuous-accrual"),
      kind: "vault",
      title: ctx.pick([
        "Why accrual is continuous",
        "Your position moves every second",
        "There is no nightly batch",
      ]),
      body: ctx.pick([
        `Rewards are not credited once a day. The figure on a position is derived from the time elapsed since the vault opened, so it advances continuously. Two things follow: a vault opened at midday is worth more by the evening, and claiming early costs you nothing, because a claim only moves what has already accrued.`,
        `Every reward figure in the product is computed, not stored. Elapsed time at ${DAY_PCT} a day is the entire calculation, which is why the number ticks while you watch it and why two devices reading the same ledger agree exactly.`,
        `A position does not wait for a cut off to update. Accrual is a function of elapsed time, so the value you see mid afternoon is the value you have earned by mid afternoon, and a claim placed at any hour takes the amount accrued at that hour.`,
      ]),
      publishedAt: ctx.now,
      tags: ["accrual", "vaults", "mechanics"],
    }),
  },

  /* 3. tier: one rung explained, rotating through the ladder. */
  {
    key: "tier-spotlight",
    kind: "tier",
    weight: 8,
    cooldownHours: 30,
    render: (ctx) => {
      const tier = ctx.pick(TIERS);
      const below = TIERS.find((t) => t.rank === tier.rank - 1);
      return {
        id: ctx.id(`tier-${tier.id}`),
        kind: "tier",
        title: ctx.pick([
          `${tier.name}, and what it changes`,
          `Inside the ${tier.name} rung`,
          `${tier.name} at ${usd(tier.entry)}`,
        ]),
        body: `${tier.name} opens at ${usd(tier.entry)} of lifetime contribution and works to a ${tier.settlementHours} hour settlement target. It adds ${adds(tier)}${below ? ` on top of everything in ${below.name}` : ""}. What it does not change is the rate: every rung earns the same ${DAY_PCT} a day. Standing is measured on lifetime contribution rather than current balance, so settling a position does not cost you the rung.`,
        publishedAt: ctx.now,
        tags: ["tiers", "settlement"],
        tierId: tier.id,
      };
    },
  },

  /* 4. principle: one rate, stated as a commitment rather than a feature. */
  {
    key: "uniform-rate",
    kind: "principle",
    weight: 6,
    cooldownHours: 96,
    render: (ctx) => ({
      id: ctx.id("uniform-rate"),
      kind: "principle",
      title: ctx.pick([
        "One rate for every tier",
        "The ladder is about access, not yield",
        "Why the rate does not scale with size",
      ]),
      body: ctx.pick([
        `${ENTRY_TIER.name} at ${usd(ENTRY_TIER.entry)} and ${TOP_TIER.name} at ${usd(TOP_TIER.entry)} accrue at the same ${DAY_PCT} a day. Tiers move settlement speed, access and tooling, never the rate. A rate that scales with account size turns the headline number into a negotiation, and that number should mean the same thing to everyone reading it.`,
        `Progression here unlocks what you can do, not what you earn. Every rung earns the same ${DAY_PCT} a day, from ${ENTRY_TIER.name} to ${TOP_TIER.name}. The difference is settlement, from ${ENTRY_TIER.settlementHours} hours down to ${TOP_TIER.settlementHours}, and the tooling that comes with each step.`,
      ]),
      publishedAt: ctx.now,
      tags: ["tiers", "principle"],
    }),
  },

  /* 5. education: settlement targets, including what they are not. */
  {
    key: "settlement-window",
    kind: "education",
    weight: 7,
    cooldownHours: 60,
    render: (ctx) => ({
      id: ctx.id("settlement-window"),
      kind: "education",
      title: ctx.pick([
        "What a settlement target means",
        "Reading the settlement clock",
        "When the settlement window starts",
      ]),
      body: `A settlement target is the window the desk works to once a withdrawal is requested. It runs from ${TOP_TIER.settlementHours} hours at ${TOP_TIER.name} to ${ENTRY_TIER.settlementHours} hours at ${ENTRY_TIER.name}. Three things worth being precise about: it is a service target rather than a guarantee, it starts when the request is placed, and network conditions on the asset you withdraw sit outside it.`,
      publishedAt: ctx.now,
      tags: ["settlement", "withdrawals"],
    }),
  },

  /* 6. insight: idle capital, framed as a mechanic and not as advice. */
  {
    key: "idle-capital",
    kind: "insight",
    weight: 7,
    cooldownHours: 54,
    render: (ctx) => ({
      id: ctx.id("idle-capital"),
      kind: "insight",
      title: ctx.pick([
        "Cash in the account does not accrue",
        "The quiet cost of reward left outside principal",
        "Where capital stops earning",
      ]),
      body: ctx.pick([
        `Only capital inside a live vault earns. Available cash sits still, and so does reward that has accrued but has not been folded back into principal. That reward is where value is most often left waiting, which is the thing worth checking.`,
        `Two balances in the product earn nothing: available cash, and reward that has accrued but sits outside the principal. Both are simply parked. Nothing here is a recommendation about what to do with them, only a note on which figures are still moving and which are not.`,
      ]),
      publishedAt: ctx.now,
      tags: ["capital", "accrual"],
    }),
  },

  /* 7. product: what a surface does and, as importantly, what it does not. */
  {
    key: "surface-tour",
    kind: "product",
    weight: 7,
    cooldownHours: 42,
    render: (ctx) => {
      const surface = ctx.pick([
        {
          name: "Insights",
          body: `Insights reads the events in your own ledger, applies a fixed list of thresholds, and surfaces what they catch: principal that has stopped accruing, rewards worth claiming, a withdrawal window opening, a rung within reach. It does not forecast prices and it does not sample. Same ledger, same list, every time. A quiet Insights page means nothing needs you.`,
        },
        {
          name: "Analytics",
          body: `Analytics plots what your ledger already contains: contributions, accrued rewards and portfolio value over the range you select. Every series is derived from recorded events plus the clock, so there is no smoothing and no projection dressed up as history. Where a range has no events, the chart says so rather than drawing a line.`,
        },
        {
          name: "Activity",
          body: `Activity is the full record: every vault opened, every claim, every settlement and every withdrawal, in order. It is the source the rest of the product derives from, so if a figure anywhere looks wrong, this is the page that explains it.`,
        },
        {
          name: "the Copilot",
          body: `The Copilot answers questions about your position and about how the product works. It is given your derived figures when you allow it, and it is instructed to say when it does not know rather than estimate. It cannot place, claim or settle anything on your behalf.`,
        },
      ]);
      return {
        id: ctx.id("surface-tour"),
        kind: "product",
        title: ctx.pick([`A closer look at ${surface.name}`, `What ${surface.name} is for`]),
        body: surface.body,
        publishedAt: ctx.now,
        tags: ["product"],
      };
    },
  },

  /* 8. product: capability notes, written as plain description. */
  {
    key: "capability-note",
    kind: "product",
    weight: 5,
    cooldownHours: 72,
    render: (ctx) => {
      const item = ctx.pick([
        {
          title: "Claiming, and what it moves",
          body: `A claim takes the rewards a position has accrued so far and moves them into available cash. It does not close the vault and it does not change the daily figure. The position keeps running either way.`,
        },
        {
          title: "Closing a position",
          body: `Closing a vault returns its principal to available cash, where it can be withdrawn at the next window or placed again. A position that is not closed keeps accruing, so closing is a decision rather than something that happens on its own.`,
        },
        {
          title: "Running more than one vault",
          body: `Positions are independent. Each has its own principal, its own opening date and its own accrued balance, so opening a second vault does not disturb the first. Standing is computed across all of them, on lifetime contribution.`,
        },
        {
          title: "Reduced motion is a real setting",
          body: `Every animation in the product reads one switch, and that switch honours both your operating system preference and the control in Settings. Turning it down removes the movement rather than shortening it.`,
        },
      ]);
      return {
        id: ctx.id("capability-note"),
        kind: "product",
        title: item.title,
        body: item.body,
        publishedAt: ctx.now,
        tags: ["product", "mechanics"],
      };
    },
  },

  /* 9. principle: risk, stated plainly and often. */
  {
    key: "risk-standing",
    kind: "principle",
    weight: 6,
    cooldownHours: 120,
    render: (ctx) => ({
      id: ctx.id("risk-standing"),
      kind: "principle",
      title: ctx.pick([
        "Capital placed in a vault is at risk",
        "A published rate is not a promise",
        "The sentence we will keep repeating",
      ]),
      body: `Capital is at risk. A published rate is a target, not a promise, and nothing on Signal is investment advice. Size a position on the assumption that it may not return.`,
      publishedAt: ctx.now,
      tags: ["risk", "principle"],
    }),
  },

  /* 10. question: an open prompt, answered through the support surface. */
  {
    key: "open-question",
    kind: "question",
    weight: 5,
    cooldownHours: 84,
    render: (ctx) => {
      const q = ctx.pick([
        {
          title: "What should the Desk show you first?",
          body: `The Desk opens on funding, withdrawal and the market read. If it could answer one question the moment it loads, what would that question be? Send it through Support and it reaches the desk with the rest of the week's notes.`,
        },
        {
          title: "Which figure do you check first?",
          body: `Everyone has one number they look for before any other: accrued rewards, the daily figure, portfolio value, or distance to the next rung. Tell us which one is yours through Support. Where a surface buries the number people actually open it for, we will move it.`,
        },
        {
          title: "What would you want Signal to cover?",
          body: `This channel is for mechanics, product notes and the thinking behind both. If there is something about how the platform works that you have had to guess at, that is exactly what belongs here. Send the question through Support.`,
        },
      ]);
      return {
        id: ctx.id("open-question"),
        kind: "question",
        title: q.title,
        body: q.body,
        publishedAt: ctx.now,
        tags: ["community", "product"],
      };
    },
  },

  /* 11. education: how tier standing is computed. */
  {
    key: "standing-math",
    kind: "education",
    weight: 6,
    cooldownHours: 66,
    render: (ctx) => ({
      id: ctx.id("standing-math"),
      kind: "education",
      title: ctx.pick([
        "How standing is calculated",
        "Lifetime contribution, not balance",
        "Why your rung does not fall when you settle",
      ]),
      body: `Standing is the highest rung your lifetime contribution clears, where contribution is the sum of every amount you have ever placed into a vault. Withdrawals and settlements do not subtract from it. That is why a member who has cycled ${usd(TIERS[2].entry)} through the product holds ${TIERS[2].name} even while sitting in cash, and why claiming rewards has no effect on the ladder at all.`,
      publishedAt: ctx.now,
      tags: ["tiers", "mechanics"],
    }),
  },

  /* 12. announcement: lowest weight and longest cooldown by design. There is
     no news generator here: the copy is limited to how this channel behaves. */
  {
    key: "channel-note",
    kind: "announcement",
    weight: 3,
    cooldownHours: 168,
    render: (ctx) => ({
      id: ctx.id("channel-note"),
      kind: "announcement",
      title: ctx.pick(["How Signal is published", "What you will find on Signal"]),
      body: `Signal is the desk's channel to every member, and only Rigel posts to it. We use it for mechanics, product notes, the reasoning behind a decision and the occasional open question. You can like, save and share anything here. What you will never find is a market call, a performance claim, or a figure the product cannot derive from your own ledger.`,
      publishedAt: ctx.now,
      tags: ["signal", "platform"],
    }),
  },
];

/** Lookup by key, for the rotation ledger. */
export function templateByKey(key: string): Template | undefined {
  return TEMPLATES.find((t) => t.key === key);
}
