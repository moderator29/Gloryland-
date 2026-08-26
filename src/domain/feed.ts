/**
 * Signal: the platform's own content layer.
 *
 * Rigel publishes, members read. There is no authoring path for a member in
 * this module and there is no comment model, because the feed is a broadcast
 * surface rather than a social network. What a member can do is like, bookmark
 * and share, and all three of those live in this browser only.
 *
 * Two storage keys, both guarded on every read:
 *   rgl_feed_posts_v1      the published posts this browser has seen
 *   rgl_feed_likes_v1      ids this member has liked
 *   rgl_feed_bookmarks_v1  ids this member has saved
 *
 * Honesty rules that shaped the model:
 * - No author field beyond the platform itself. There are no member accounts
 *   to attribute a post to, so inventing one would be inventing a person.
 * - `likeCount` counts this browser and nothing else, so it returns 0 or 1.
 *   A believable-looking engagement number would be a fabricated statistic,
 *   and a real one needs a server. See the note on that function.
 * - Post copy never states a figure the product cannot derive. Every number
 *   in the starter set comes from the tier ladder in `./tiers`.
 *
 * As with the ledger and the AI store, `read`/`write` are the only
 * storage-aware functions here, so moving the feed to a server means
 * replacing those and nothing else.
 */

import { money } from "@/components/system/format";
import { DAILY_RATE, TIERS, WITHDRAW_INTERVAL_DAYS, dailyReward } from "./tiers";

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
  /** Set when a post is about one rung of the ladder. */
  tierId?: string;
};

/** Every kind, in the order the filter bar shows them. */
export const POST_KINDS: PostKind[] = [
  "announcement",
  "education",
  "product",
  "tier",
  "vault",
  "insight",
  "principle",
  "question",
];

const POSTS_KEY = "rgl_feed_posts_v1";
const LIKES_KEY = "rgl_feed_likes_v1";
const BOOKMARKS_KEY = "rgl_feed_bookmarks_v1";

/** Upper bound on what one browser retains, oldest dropped first. */
const MAX_POSTS = 200;

/* ── subscription ───────────────────────────────────────────────────────── */

const listeners = new Set<() => void>();

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function emit() {
  listeners.forEach((f) => {
    try {
      f();
    } catch {
      /* a broken subscriber must not stop the rest */
    }
  });
}

/* ── storage ────────────────────────────────────────────────────────────── */

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed == null ? fallback : (parsed as T);
  } catch {
    /* absent, blocked, or corrupt: the caller gets the fallback */
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full, private mode, or blocked */
  }
}

function readIdSet(key: string): Set<string> {
  const raw = read<unknown>(key, null);
  if (!Array.isArray(raw)) return new Set();
  return new Set(raw.filter((v): v is string => typeof v === "string" && v.length > 0));
}

function writeIdSet(key: string, set: Set<string>) {
  write(key, Array.from(set).slice(0, 1000));
  emit();
}

/* ── validation ─────────────────────────────────────────────────────────── */

const KIND_SET = new Set<string>(POST_KINDS);

/**
 * A post that came out of storage, or off the publish endpoint, is untrusted
 * input: anything malformed is dropped rather than rendered.
 */
function isPost(v: unknown): v is Post {
  if (!v || typeof v !== "object") return false;
  const p = v as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    p.id.length > 0 &&
    typeof p.kind === "string" &&
    KIND_SET.has(p.kind) &&
    typeof p.title === "string" &&
    p.title.length > 0 &&
    typeof p.body === "string" &&
    typeof p.publishedAt === "number" &&
    Number.isFinite(p.publishedAt)
  );
}

/** Normalise a validated post so optional fields are always the right shape. */
function clean(p: Post): Post {
  return {
    id: p.id,
    kind: p.kind,
    title: p.title,
    body: p.body,
    publishedAt: p.publishedAt,
    tags: Array.isArray(p.tags)
      ? p.tags.filter((t): t is string => typeof t === "string").slice(0, 8)
      : undefined,
    tierId: typeof p.tierId === "string" ? p.tierId : undefined,
  };
}

/* ── posts ──────────────────────────────────────────────────────────────── */

/** Every post this browser holds, newest first. Never throws. */
export function loadPosts(): Post[] {
  const raw = read<unknown>(POSTS_KEY, null);
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(isPost)
    .map(clean)
    .sort((a, b) => b.publishedAt - a.publishedAt || a.id.localeCompare(b.id));
}

function savePosts(posts: Post[]) {
  write(POSTS_KEY, posts.sort((a, b) => b.publishedAt - a.publishedAt).slice(0, MAX_POSTS));
  emit();
}

/** One post by id, or null. */
export function getPost(id: string): Post | null {
  if (!id) return null;
  return loadPosts().find((p) => p.id === id) ?? null;
}

/**
 * Merge published posts in, keyed by id so the same post arriving twice is
 * stored once. This is the seam the publish endpoint feeds once the feed is
 * served rather than seeded.
 */
export function mergePosts(incoming: unknown): Post[] {
  const list = Array.isArray(incoming) ? incoming : [incoming];
  const valid = list.filter(isPost).map(clean);
  if (valid.length === 0) return loadPosts();

  const byId = new Map<string, Post>();
  for (const p of loadPosts()) byId.set(p.id, p);
  for (const p of valid) byId.set(p.id, p);

  const next = Array.from(byId.values());
  savePosts(next);
  return loadPosts();
}

/**
 * Up to `limit` posts that share this post's kind or one of its tags, closest
 * match first. Used by the post detail page.
 */
export function relatedPosts(post: Post, limit = 3): Post[] {
  const tags = new Set(post.tags ?? []);
  return loadPosts()
    .filter((p) => p.id !== post.id)
    .map((p) => {
      const shared = (p.tags ?? []).filter((t) => tags.has(t)).length;
      const score = (p.kind === post.kind ? 2 : 0) + shared;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.p.publishedAt - a.p.publishedAt)
    .slice(0, Math.max(0, limit))
    .map((x) => x.p);
}

/* ── interactions ───────────────────────────────────────────────────────── */

export function isLiked(id: string): boolean {
  return readIdSet(LIKES_KEY).has(id);
}

export function isBookmarked(id: string): boolean {
  return readIdSet(BOOKMARKS_KEY).has(id);
}

function toggleIn(key: string, id: string): boolean {
  if (!id) return false;
  const set = readIdSet(key);
  const next = !set.has(id);
  if (next) set.add(id);
  else set.delete(id);
  writeIdSet(key, set);
  return next;
}

/** Returns the state after the toggle, so a caller can react to it. */
export function toggleLike(id: string): boolean {
  return toggleIn(LIKES_KEY, id);
}

export function toggleBookmark(id: string): boolean {
  return toggleIn(BOOKMARKS_KEY, id);
}

/**
 * How many likes this post has, from everything this build can actually see,
 * which is this browser: 1 when the member has liked it, otherwise 0.
 *
 * It would be trivial to seed a number that looked like a community, and that
 * number would be a fiction. A real count needs a server that records likes
 * from real accounts, at which point this function reads it. Until then the
 * UI shows the honest figure and hides the zero.
 */
export function likeCount(id: string): number {
  return isLiked(id) ? 1 : 0;
}

/** Saved posts, newest published first. Ids with no matching post are ignored. */
export function listBookmarks(): Post[] {
  const saved = readIdSet(BOOKMARKS_KEY);
  if (saved.size === 0) return [];
  return loadPosts().filter((p) => saved.has(p.id));
}

/** Count of saved posts, without materialising them. */
export function bookmarkCount(): number {
  return listBookmarks().length;
}

/* ── starter set ────────────────────────────────────────────────────────── */

const HOUR = 3_600_000;
const entry = TIERS[0];
const top = TIERS[TIERS.length - 1];
const dayPct = `${(DAILY_RATE * 100).toFixed(0)}%`;

/**
 * The posts a brand new browser starts with. Ids are stable strings rather
 * than random ones, so a member who bookmarks a post keeps that bookmark if
 * the seed ever runs again. Offsets are hours before first run, which keeps
 * the relative timestamps sensible without pretending to a publish history
 * that predates the member.
 */
type Seed = Omit<Post, "publishedAt"> & { hoursAgo: number };

const SEEDS: Seed[] = [
  {
    id: "sig-welcome",
    kind: "announcement",
    hoursAgo: 2,
    title: "Signal is live",
    tags: ["signal", "platform"],
    body: `This is Signal, the desk's channel to every member. We publish here: how the mechanics work, what a tier changes, what shipped, and what we are thinking about. Only Rigel posts. You can like, save and share anything you find worth keeping.`,
  },
  {
    id: "sig-accrual-basics",
    kind: "education",
    hoursAgo: 9,
    title: "How accrual works",
    tags: ["accrual", "mechanics", "liquidity"],
    body: `A vault accrues ${dayPct} of its principal per day from the moment capital is placed. There is no term and no maturity: it keeps accruing until you close it, so what a position comes to is a matter of how long you leave it there. On ${money(entry.entry)} that is ${money(dailyReward(entry.entry), 2)} a day. Accrual runs on principal alone, so reward left unclaimed inside a position earns nothing until it is folded back in.`,
  },
  {
    id: "sig-one-rate",
    kind: "principle",
    hoursAgo: 26,
    title: "One rate for every tier",
    tags: ["tiers", "principle"],
    body: `Every rung of the ladder earns the same ${dayPct} of principal a day. ${entry.name} and ${top.name} accrue at identical rates. Tiers differ on access, settlement speed and tooling, never on yield. We hold that line because a rate that moves with account size turns the headline number into a negotiation, and the number on your screen should mean the same thing for everyone.`,
  },
  {
    id: "sig-tier-changes",
    kind: "tier",
    hoursAgo: 40,
    tierId: TIERS[1].id,
    title: "What a tier actually changes",
    tags: ["tiers", "settlement"],
    body: `Standing is measured on lifetime contribution, not current balance, so it does not fall when you settle a position. ${entry.name} opens at ${money(entry.entry)} with a ${entry.settlementHours} hour settlement target. ${TIERS[1].name} at ${money(TIERS[1].entry)} adds performance analytics and reward projections. Each rung above that shortens the settlement target and widens the tooling, down to ${top.settlementHours} hours at ${top.name}.`,
  },
  {
    id: "sig-continuous-accrual",
    kind: "vault",
    hoursAgo: 61,
    title: "Why accrual is continuous",
    tags: ["accrual", "vaults", "mechanics"],
    body: `Rewards are not credited in a nightly batch. The figure on a position is computed from the time elapsed since the vault opened, so it moves every second you watch it. Two consequences worth knowing: a vault opened at midday is worth more by the evening, and claiming early does not cost you anything, because the claim only moves what has already accrued into available cash.`,
  },
  {
    id: "sig-settlement-targets",
    kind: "education",
    hoursAgo: 80,
    title: "What a settlement target means",
    tags: ["settlement", "tiers"],
    body: `A settlement target is the window the desk works to when a withdrawal is requested, from ${top.settlementHours} hours at ${top.name} to ${entry.settlementHours} hours at ${entry.name}. It is a service target, not a guarantee, and it starts when the request is placed. How often a request may be made is a separate rule and the same on every rung: once every ${WITHDRAW_INTERVAL_DAYS} days. Network conditions on the asset you withdraw sit outside that window.`,
  },
  {
    id: "sig-insights-surface",
    kind: "product",
    hoursAgo: 104,
    title: "Insights reads your ledger, not the market",
    tags: ["product", "insights"],
    body: `The Insights page does not forecast prices and does not sample anything. It reads the events in your own ledger, applies a short list of thresholds, and surfaces what those thresholds catch: reward sitting outside a principal and earning nothing, a relay waiting to run, cash that cannot leave yet, a tier within reach. Same inputs, same list, every time. If it is quiet, nothing needs you.`,
  },
  {
    id: "sig-idle-capital",
    kind: "insight",
    hoursAgo: 130,
    title: "Cash in the account does not accrue",
    tags: ["capital", "accrual"],
    body: `Available cash sits still. Only principal inside a vault earns, and it earns for as long as it is left there. The same is true of reward already claimed: it is cash, so it is fixed until it is placed again. Worth a look after any withdrawal window, which is exactly when capital is most likely to be left waiting.`,
  },
  {
    id: "sig-local-ledger",
    kind: "product",
    hoursAgo: 158,
    title: "Where your ledger currently lives",
    tags: ["product", "transparency"],
    body: `This build keeps your ledger in your own browser. Clearing site data clears your positions, and opening the product on another device shows an empty account. We would rather tell you plainly than let the interface imply a custody arrangement that does not exist yet. Signal will carry the notice when that changes.`,
  },
  {
    id: "sig-risk",
    kind: "principle",
    hoursAgo: 180,
    title: "Capital placed in a vault is at risk",
    tags: ["risk", "principle"],
    body: `Capital is at risk. A published rate is a target, not a promise, and nothing here is investment advice. Size any position on the assumption that it may not return.`,
  },
  {
    id: "sig-question-desk",
    kind: "question",
    hoursAgo: 210,
    title: "What should the Desk show you first?",
    tags: ["community", "product"],
    body: `The Desk currently opens on funding, withdrawal and the market read. If it could answer one question the moment it loads, what would you want that question to be? Tell the assistant on the Support surface and it reaches the desk with the rest of the week's notes.`,
  },
];

/**
 * Populate the starter set on first run. A browser that already holds posts
 * is left alone, so this is safe to call on every mount of the feed.
 */
export function seedIfEmpty(now: number = Date.now()): Post[] {
  const existing = loadPosts();
  if (existing.length > 0) return existing;

  const seeded: Post[] = SEEDS.map(({ hoursAgo, ...rest }) => ({
    ...rest,
    publishedAt: now - hoursAgo * HOUR,
  }));
  savePosts(seeded);
  return loadPosts();
}

/** Wipe the feed and every interaction on it. Used by settings and tests. */
export function resetFeed() {
  if (typeof window === "undefined") return;
  for (const key of [POSTS_KEY, LIKES_KEY, BOOKMARKS_KEY]) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* blocked storage */
    }
  }
  emit();
}
