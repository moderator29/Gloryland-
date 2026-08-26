/**
 * The daily publishing schedule.
 *
 * One run a day produces a whole day of posts rather than one, each stamped
 * with a time spread across the next 24 hours. The feed then shows only the
 * posts whose time has arrived, so the channel reveals itself through the day
 * and reads as live without needing a job that runs every few hours. This is
 * what makes the channel work on a plan that permits a single daily run.
 *
 * The schedule is also fully deterministic: the same date always produces the
 * same posts in the same order at the same times. That means the client can
 * derive today's schedule on its own, identically for every member, with no
 * server, no database and no publish call at all. The endpoint exists for the
 * day there is somewhere durable to write to, not because the feed depends on it.
 */

import { POST_KINDS, type Post, type PostKind } from "./feed";
import { TIERS, DAILY_RATE, WITHDRAW_INTERVAL_DAYS } from "./tiers";

/** Posts released per day. */
export const POSTS_PER_DAY = 20;

/** Publishing window, in hours, local to the member. */
const FIRST_HOUR = 6;
const LAST_HOUR = 23;

/* ── deterministic randomness ───────────────────────────────────────────── */

function hash(n: number): number {
  let h = (n ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** Days since epoch, so a schedule is stable for a whole calendar day. */
export function daySeed(now: number): number {
  const d = new Date(now);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

const pick = <T>(arr: readonly T[], n: number): T => arr[hash(n) % arr.length];

/* ── content ────────────────────────────────────────────────────────────── */

const pct = (n: number) => `${(n * 100).toFixed(0)}%`;
const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

type Draft = { kind: PostKind; title: string; body: string; tierId?: string; tags?: string[] };

/**
 * Every writer is a pure function of a seed, so a day's output is varied but
 * repeatable. Copy is built from the real constants, so it can never drift
 * from what the product actually does.
 */
const WRITERS: ((s: number) => Draft)[] = [
  (s) => {
    const t = pick(TIERS, s);
    return {
      kind: "tier",
      title: `${t.name} at ${usd(t.entry)}`,
      body: `${t.blurb} Settlement target is ${t.settlementHours} hours. The rate is the same ${pct(DAILY_RATE)} a day every rung earns, so what changes here is access and speed, not yield.`,
      tierId: t.id,
      tags: ["tiers"],
    };
  },
  (s) => {
    const t = pick(TIERS, s + 1);
    const daily = t.entry * DAILY_RATE;
    return {
      kind: "education",
      title: `What ${usd(t.entry)} accrues in a day`,
      body: `Placed at ${t.name}, it accrues ${usd(Math.round(daily))} a day, every day it is left in place. There is no end date, so what it comes to is a matter of how long you leave it: over ${WITHDRAW_INTERVAL_DAYS} days, the interval between withdrawal requests, that is ${usd(Math.round(daily * WITHDRAW_INTERVAL_DAYS))}.`,
      tierId: t.id,
      tags: ["accrual"],
    };
  },
  () => ({
    kind: "vault",
    title: "Accrual does not wait for anything",
    body: "Rewards build continuously from the moment capital is placed, not in a lump at any point. You can claim what has accrued whenever you like, without closing the position.",
    tags: ["vaults"],
  }),
  () => ({
    kind: "principle",
    title: "One rate across every rung",
    body: `Core and Sovereign earn the identical ${pct(DAILY_RATE)} of principal a day. Tiers differ on settlement speed, access and tooling. A ladder that paid more at the top would be selling size, not service.`,
    tags: ["principles"],
  }),
  (s) => {
    const t = pick(TIERS, s + 5);
    return {
      kind: "insight",
      title: "Idle capital earns nothing",
      body: `Cash sitting in an available balance is not in a term. At ${t.name} entry, ${usd(t.entry)} left idle for a week is ${usd(Math.round(t.entry * DAILY_RATE * 7))} not earned.`,
      tags: ["capital"],
    };
  },
  () => ({
    kind: "product",
    title: "Every figure traces back to an event",
    body: "Portfolio value, tier standing and vault progress are derived from an append-only log, never stored as a number someone typed. Open Ledger to see the events behind any balance.",
    tags: ["platform"],
  }),
  () => ({
    kind: "principle",
    title: "Capital placed in a vault is at risk",
    body: "Capital is at risk. A published rate is a target, not a promise, and a high one says something about the risk behind it.",
    tags: ["risk"],
  }),
  (s) => {
    const t = pick(TIERS, s + 9);
    const below = TIERS.find((x) => x.rank === t.rank - 1);
    return {
      kind: "education",
      title: below ? `From ${below.name} to ${t.name}` : `Entering at ${t.name}`,
      body: below
        ? `Crossing costs ${usd(t.entry - below.entry)} of further contribution and cuts the settlement target from ${below.settlementHours} to ${t.settlementHours} hours.`
        : `The first rung opens at ${usd(t.entry)}, with a ${t.settlementHours} hour settlement target.`,
      tierId: t.id,
      tags: ["tiers"],
    };
  },
  () => ({
    kind: "question",
    title: "Do you compound, or take the reward as cash?",
    body: "Accrual runs on principal alone, so reward left inside a position earns nothing. Folding it into principal is what puts it to work. Claiming it makes it spendable. Neither is wrong.",
    tags: ["strategy"],
  }),
  () => ({
    kind: "vault",
    title: "There is no maturity",
    body: `A position accrues from the day it opens until you close it. Nothing stops on its own, and nothing has to be renewed. What is on a schedule is liquidity: a withdrawal can be requested once every ${WITHDRAW_INTERVAL_DAYS} days.`,
    tags: ["vaults"],
  }),
  () => ({
    kind: "product",
    title: "Compounding a position",
    body: "Closing returns principal to available cash. Compounding claims the reward, closes the position and re-opens it larger in one movement, which is usually what moves a member up a rung.",
    tags: ["vaults"],
  }),
  () => ({
    kind: "insight",
    title: "Standing is measured on lifetime contribution",
    body: "Tier is not per position. Several smaller placements accumulate toward the same standing as one large one, so building a position over time reaches the same rung.",
    tags: ["tiers"],
  }),
  () => ({
    kind: "announcement",
    title: "How this channel works",
    body: "Signal is published by the platform. Members read, save and share, and nobody posts into it. Everything here is written from the same constants the product runs on.",
    tags: ["platform"],
  }),
  () => ({
    kind: "product",
    title: "Assistants know the programme, not your intent",
    body: "Copilot explains your own position and the term structure. Support answers how to use the product. Neither gives investment advice, and both say so when a question falls outside what they can answer.",
    tags: ["platform"],
  }),
  (s) => {
    const t = pick(TIERS, s + 13);
    return {
      kind: "education",
      title: `${t.name} settles inside ${t.settlementHours} hours`,
      body: `${t.name} targets ${t.settlementHours} hours for a withdrawal request. A target is an operational commitment, not a network guarantee, and it is published so it can be measured.`,
      tierId: t.id,
      tags: ["settlement"],
    };
  },
  (s) => {
    const angles = [
      {
        title: "Nothing here counts anyone but you",
        body: "Figures on your surfaces are derived from your own ledger. Where the platform shows illustrative activity, it is generated rather than observed, and it is labelled.",
      },
      {
        title: "A number we cannot derive is a number we do not print",
        body: "Every figure on a surface traces to an event you created. Anything the product cannot compute from that log is left off the screen rather than estimated into it.",
      },
      {
        title: "Labels sit next to anything illustrative",
        body: "Where a surface shows sample activity rather than observed activity, it says so in place. A member should never have to guess which figures are theirs.",
      },
    ];
    const a = pick(angles, s + 31);
    return { kind: "principle", title: a.title, body: a.body, tags: ["principles"] };
  },
  () => ({
    kind: "product",
    title: "Claiming and settling are not the same move",
    body: "A claim moves rewards that have already accrued into available cash and leaves the position running. Closing ends the position and returns principal. Only closing ends accrual.",
    tags: ["vaults"],
  }),
  (s) => {
    const t = pick(TIERS, s + 17);
    const daily = t.entry * DAILY_RATE;
    return {
      kind: "insight",
      title: "Splitting a placement now costs something",
      body: `Two ${usd(Math.round(t.entry / 2))} positions opened a fortnight apart eventually accrue the same ${usd(Math.round(daily))} a day between them as one ${usd(t.entry)} position, but the second one earns nothing for the fortnight it waits, and that gap never closes. Echelon works out the figure.`,
      tierId: t.id,
      tags: ["strategy"],
    };
  },
  () => ({
    kind: "product",
    title: "Where the ledger currently lives",
    body: "Your events are held in this browser. Clearing site data clears your positions, and opening the product on another device shows an empty account. We would rather say that plainly than imply custody that does not exist yet.",
    tags: ["platform", "transparency"],
  }),
  () => ({
    kind: "insight",
    title: "The market read on the Desk is reference, not a signal",
    body: "Prices are pulled from a public feed so you can see what the assets you fund with are doing. They do not influence accrual, which is fixed by the term you opened, and nothing on that panel is a recommendation.",
    tags: ["market"],
  }),
  () => ({
    kind: "education",
    title: "A term starts when capital lands, not at midnight",
    body: `Accrual is measured from the moment a position opens, so a vault opened at midday is worth more by that evening. There is no daily batch to wait for and no advantage to opening at a particular hour.`,
    tags: ["accrual"],
  }),
];

/* ── the schedule ───────────────────────────────────────────────────────── */

/**
 * The full set of posts for the calendar day containing `now`, each stamped
 * with the moment it becomes visible. Times are spread evenly across the
 * publishing window with a deterministic jitter so they do not look mechanical.
 */
export function scheduleForDay(now: number = Date.now()): Post[] {
  const seed = daySeed(now);
  const d = new Date(now);
  const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const windowMs = (LAST_HOUR - FIRST_HOUR) * 3_600_000;
  const gap = windowMs / POSTS_PER_DAY;

  // Rotate the writer order per day so the same template never leads.
  const offset = hash(seed) % WRITERS.length;

  // There are more slots in a day than writers, so a writer runs more than
  // once and can land on the same subject twice. Re-rolling its seed until the
  // title is new keeps a day's run varied without needing a writer per slot.
  // The re-roll is bounded, because a run that cannot find a new title should
  // publish a repeat rather than loop.
  const used = new Set<string>();
  const out: Post[] = [];

  for (let i = 0; i < POSTS_PER_DAY; i++) {
    const writer = WRITERS[(i + offset) % WRITERS.length];
    let s = seed * 1_000 + i;
    let draft = writer(s);
    for (let attempt = 0; attempt < 12 && used.has(draft.title); attempt++) {
      s = hash(s) >>> 0;
      draft = writer(s);
    }
    used.add(draft.title);

    // Jitter inside the slot, never past the next slot.
    const jitter = (hash(seed * 1_000 + i + 77) % Math.floor(gap * 0.7)) | 0;
    const publishedAt = midnight + FIRST_HOUR * 3_600_000 + i * gap + jitter;

    out.push({
      id: `sig-${seed}-${i}`,
      kind: draft.kind,
      title: draft.title,
      body: draft.body,
      publishedAt,
      tierId: draft.tierId,
      tags: draft.tags,
    });
  }

  return out;
}

/** Today's posts that have actually been released, newest first. */
export function releasedToday(now: number = Date.now()): Post[] {
  return scheduleForDay(now)
    .filter((p) => p.publishedAt <= now)
    .sort((a, b) => b.publishedAt - a.publishedAt);
}

/**
 * A rolling feed across the last `days` days, so a member arriving early in
 * the morning still has yesterday's channel to read.
 */
export function rollingFeed(days = 4, now: number = Date.now()): Post[] {
  const out: Post[] = [];
  for (let i = 0; i < days; i++) {
    const at = now - i * 86_400_000;
    const posts = i === 0 ? releasedToday(now) : scheduleForDay(at);
    out.push(...posts);
  }
  return out.sort((a, b) => b.publishedAt - a.publishedAt);
}

/** The next post due, for a "more at" hint. Null once the day is exhausted. */
export function nextRelease(now: number = Date.now()): Post | null {
  return scheduleForDay(now).find((p) => p.publishedAt > now) ?? null;
}

/** Kinds present in a set, used to build filters that never show empty tabs. */
export function kindsPresent(posts: Post[]): PostKind[] {
  const seen = new Set(posts.map((p) => p.kind));
  return POST_KINDS.filter((k) => seen.has(k));
}
