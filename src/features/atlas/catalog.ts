/**
 * Atlas: one index over the whole product.
 *
 * Five things are indexed and nothing else: the surfaces a member can reach,
 * the rungs of the tier ladder, the handful of actions they actually take,
 * everything published to Signal, and a short glossary of the words this
 * product uses in a particular way.
 *
 * Two rules shape the module.
 *
 * 1. Never invent a route. Every `to` here is a path that exists in
 *    src/main.tsx. Parameterised routes are only indexed where the parameter
 *    comes from real data, which is the tier ladder and the published feed.
 * 2. Never invent a figure. Tier entries, settlement targets and the glossary
 *    are assembled from the constants in src/domain/tiers.ts, so Atlas cannot
 *    drift away from what the rest of the product says.
 *
 * Surface names follow docs/NAMING.md. Where the shipped label still uses the
 * previous name, that name is carried in `keywords` so a member who types what
 * the sidebar says still lands on the right row.
 *
 * The module is pure. `buildCatalog` reads the feed store and the clock, and
 * writes nothing.
 */

import { money } from "@/components/system/format";
import { loadPosts } from "@/domain/feed";
import { CYCLE_DAYS, CYCLE_RETURN, DAILY_RATE, TIERS } from "@/domain/tiers";

/* ── shape ──────────────────────────────────────────────────────────────── */

export type AtlasKind = "surface" | "tier" | "action" | "post" | "term";

export type AtlasEntry = {
  id: string;
  kind: AtlasKind;
  title: string;
  subtitle?: string;
  /** A path that exists in the router. */
  to: string;
  keywords: string[];
  /** Key into the icon map in Results.tsx. Falls back to a compass. */
  icon?: string;
};

/** Results, bucketed by kind. Buckets arrive best match first. */
export type AtlasGroup = { kind: AtlasKind; label: string; entries: AtlasEntry[] };

/** One region of the browsable directory on the Atlas route. */
export type AtlasArea = { id: string; label: string; blurb: string; entries: AtlasEntry[] };

/** Heading above a bucket of results. */
export const KIND_LABEL: Record<AtlasKind, string> = {
  surface: "Surfaces",
  action: "Actions",
  tier: "Tiers",
  term: "Glossary",
  post: "Signal",
};

/** The chip on the right of a row. Singular, because it labels one entry. */
export const KIND_CHIP: Record<AtlasKind, string> = {
  surface: "Surface",
  action: "Action",
  tier: "Tier",
  term: "Term",
  post: "Post",
};

/** How many rows a search returns before it stops. */
export const ATLAS_LIMIT = 24;

/* ── folding ────────────────────────────────────────────────────────────── */

const DIACRITIC = /\p{Diacritic}/gu;

/** Case and diacritic insensitive form. Every comparison in Atlas runs on this. */
export function fold(value: string): string {
  return value.normalize("NFD").replace(DIACRITIC, "").toLowerCase();
}

/**
 * Where `needle` sits inside `text`, in the indices of the original string.
 *
 * Folding can change length (an accented letter decomposes into two code
 * units before one is stripped), so a match found in the folded string cannot
 * be sliced out of the original with the same offsets. Folding one character
 * at a time and recording where each folded unit came from keeps the two
 * strings in step, which is what lets the highlight in Results sit exactly on
 * the characters the search actually matched.
 */
export function foldRange(text: string, needle: string): { start: number; end: number } | null {
  const target = fold(needle.trim());
  if (!target) return null;

  let folded = "";
  const origin: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    const piece = fold(text[i]);
    for (let k = 0; k < piece.length; k += 1) origin.push(i);
    folded += piece;
  }

  const at = folded.indexOf(target);
  if (at < 0) return null;
  return { start: origin[at], end: origin[at + target.length - 1] + 1 };
}

/* ── copy assembled from the domain ─────────────────────────────────────── */

const ENTRY_TIER = TIERS[0];
const TOP_TIER = TIERS[TIERS.length - 1];
const TERM_PCT = `${Math.round(CYCLE_RETURN * 100)}%`;
const DAY_PCT = `${(DAILY_RATE * 100).toFixed(0)}%`;

/* ── surfaces ───────────────────────────────────────────────────────────── */

const SURFACES: AtlasEntry[] = [
  {
    id: "home",
    kind: "surface",
    title: "Home",
    subtitle: "Standing, portfolio value and what needs attention.",
    to: "/app",
    icon: "LayoutDashboard",
    keywords: ["overview", "dashboard", "standing", "portfolio", "balance", "start"],
  },
  {
    id: "desk",
    kind: "surface",
    title: "Desk",
    subtitle: "Fund the account, move value out, read the market.",
    to: "/app/desk",
    icon: "Terminal",
    keywords: ["portal", "command", "fund", "deposit", "withdraw", "address", "act"],
  },
  {
    id: "vaults",
    kind: "surface",
    title: "Vaults",
    subtitle: "Every position and the term it is running.",
    to: "/app/vaults",
    icon: "Landmark",
    keywords: ["positions", "portfolio", "packages", "principal", "terms", "maturity"],
  },
  {
    id: "tiers",
    kind: "surface",
    title: "Tiers",
    subtitle: `${TIERS.length} rungs from ${money(ENTRY_TIER.entry)}, all on the same ${TERM_PCT} term.`,
    to: "/app/tiers",
    icon: "Layers",
    keywords: ["ladder", "plans", "packages", "programme", "standing", "progression"],
  },
  {
    id: "compare",
    kind: "surface",
    title: "Compare",
    subtitle: "Two rungs side by side, only the lines that change.",
    to: "/app/tiers/compare",
    icon: "Scale",
    keywords: ["comparison", "difference", "versus", "tiers", "side by side"],
  },
  {
    id: "match",
    kind: "surface",
    title: "Tier Match",
    subtitle: "A short set of questions read against the published tier table.",
    to: "/app/tiers/match",
    icon: "Compass",
    keywords: ["quiz", "find my tier", "recommendation", "guided", "which tier"],
  },
  {
    id: "yield",
    kind: "surface",
    title: "Yield",
    subtitle: "Claim what has accrued and track earnings.",
    to: "/app/rewards",
    icon: "Gift",
    keywords: ["rewards", "claim", "earnings", "accrued", "claimable", "payout"],
  },
  {
    id: "markets",
    kind: "surface",
    title: "Markets",
    subtitle: "Live prices for the assets you can fund with.",
    to: "/app/market",
    icon: "CandlestickChart",
    keywords: ["market reference", "prices", "assets", "bitcoin", "coins", "charts"],
  },
  {
    id: "signal",
    kind: "surface",
    title: "Signal",
    subtitle: "Mechanics and product notes, published by the desk.",
    to: "/app/signal",
    icon: "Radio",
    keywords: ["feed", "channel", "posts", "news", "announcements", "saved", "bookmarks"],
  },
  {
    id: "insight",
    kind: "surface",
    title: "Insight",
    subtitle: "Observations drawn from your own ledger, not the market.",
    to: "/app/insights",
    icon: "Sparkles",
    keywords: ["insights", "observations", "attention", "suggestions", "derived"],
  },
  {
    id: "telemetry",
    kind: "surface",
    title: "Telemetry",
    subtitle: "How your capital has performed over time.",
    to: "/app/analytics",
    icon: "ChartLine",
    keywords: ["analytics", "charts", "performance", "allocation", "history", "graphs"],
  },
  {
    id: "record",
    kind: "surface",
    title: "Ledger",
    subtitle: "The complete record of every event on your account.",
    to: "/app/activity",
    icon: "Receipt",
    keywords: ["activity", "events", "history", "log", "transactions", "record"],
  },
  {
    id: "copilot",
    kind: "surface",
    title: "Copilot",
    subtitle: "The analyst assistant, for reading your own position.",
    to: "/app/copilot",
    icon: "Sparkles",
    keywords: ["assistant", "analyst", "ai", "ask", "chat"],
  },
  {
    id: "support",
    kind: "surface",
    title: "Support",
    subtitle: "The practical help assistant, for getting unstuck.",
    to: "/app/support",
    icon: "LifeBuoy",
    keywords: ["help", "assistant", "contact", "problem", "question", "stuck"],
  },
  {
    id: "circle",
    kind: "surface",
    title: "Circle",
    subtitle: "Your own code for bringing people to Rigel.",
    to: "/app/circle",
    icon: "UsersRound",
    keywords: ["referrals", "invite", "network", "code", "share"],
  },
  {
    id: "settings",
    kind: "surface",
    title: "Settings",
    subtitle: "Profile, appearance, notifications and your data.",
    to: "/app/settings",
    icon: "Settings",
    keywords: ["preferences", "control", "account", "options"],
  },
  {
    id: "settings-profile",
    kind: "surface",
    title: "Profile",
    subtitle: "Your display name and how the product addresses you.",
    to: "/app/settings/profile",
    icon: "User",
    keywords: ["settings", "name", "display name", "identity", "member"],
  },
  {
    id: "settings-appearance",
    kind: "surface",
    title: "Appearance",
    subtitle: "Motion level and interface sound.",
    to: "/app/settings/appearance",
    icon: "Palette",
    keywords: ["settings", "motion", "reduced motion", "sound", "theme", "animation"],
  },
  {
    id: "settings-notifications",
    kind: "surface",
    title: "Notifications",
    subtitle: "What the product is allowed to tell you about.",
    to: "/app/settings/notifications",
    icon: "Bell",
    keywords: ["settings", "alerts", "email", "push", "quiet"],
  },
  {
    id: "settings-data",
    kind: "surface",
    title: "Data",
    subtitle: "Export your ledger, or reset the account entirely.",
    to: "/app/settings/data",
    icon: "Database",
    keywords: ["settings", "export", "reset", "delete", "download", "storage"],
  },
  {
    id: "orientation",
    kind: "surface",
    title: "Orientation",
    subtitle: "The first run introduction, whenever you want it again.",
    to: "/app/orientation",
    icon: "Compass",
    keywords: ["welcome", "intro", "getting started", "tour", "onboarding"],
  },
  {
    id: "legal-privacy",
    kind: "surface",
    title: "Privacy Policy",
    subtitle: "What is collected, and what is not.",
    to: "/legal/privacy",
    icon: "Shield",
    keywords: ["legal", "data", "policy", "gdpr", "cookies"],
  },
  {
    id: "legal-terms",
    kind: "surface",
    title: "Terms of Service",
    subtitle: "The terms you accept by using Rigel.",
    to: "/legal/terms",
    icon: "FileText",
    keywords: ["legal", "agreement", "conditions", "contract"],
  },
  {
    id: "legal-risk",
    kind: "surface",
    title: "Risk Disclosure",
    subtitle: "Capital placed in a vault is at risk. Read this first.",
    to: "/legal/risk",
    icon: "ShieldCheck",
    keywords: ["legal", "risk", "loss", "warning", "disclosure"],
  },
];

/* ── actions ────────────────────────────────────────────────────────────── */

/**
 * The four things a member comes here to do. Three of them share a path with
 * a surface on purpose: reaching for a verb is a different search than
 * reaching for a place, and both should land.
 */
const ACTIONS: AtlasEntry[] = [
  {
    id: "act-open",
    kind: "action",
    title: "Open a vault",
    subtitle: `Place capital into a new ${CYCLE_DAYS} day term, from ${money(ENTRY_TIER.entry)}.`,
    to: "/app/vaults/new",
    icon: "Plus",
    keywords: ["new", "deposit", "place", "fund", "start", "invest", "position", "redeploy"],
  },
  {
    id: "act-withdraw",
    kind: "action",
    title: "Withdraw",
    subtitle: "Send available cash to an external address.",
    to: "/app/desk",
    icon: "Send",
    keywords: ["send", "cash out", "transfer", "payout", "settle", "out"],
  },
  {
    id: "act-claim",
    kind: "action",
    title: "Claim rewards",
    subtitle: "Move what has accrued into available cash.",
    to: "/app/rewards",
    icon: "Coins",
    keywords: ["claim", "collect", "harvest", "accrued", "claimable", "yield"],
  },
  {
    id: "act-support",
    kind: "action",
    title: "Contact Support",
    subtitle: "Put the question to the practical help assistant.",
    to: "/app/support",
    icon: "LifeBuoy",
    keywords: ["help", "ask", "problem", "issue", "talk", "contact"],
  },
];

/* ── tiers ──────────────────────────────────────────────────────────────── */

const TIER_ENTRIES: AtlasEntry[] = TIERS.map((tier) => ({
  id: `tier-${tier.id}`,
  kind: "tier",
  title: tier.name,
  subtitle: `Entry ${money(tier.entry)}. Settlement target ${tier.settlementHours} hours.`,
  to: `/app/tiers/${tier.id}`,
  icon: "Layers",
  keywords: [
    "tier",
    "rung",
    "ladder",
    "standing",
    `rank ${tier.rank}`,
    String(tier.entry),
    money(tier.entry),
    ...tier.benefits.map((b) => b.toLowerCase()),
  ],
}));

/* ── glossary ───────────────────────────────────────────────────────────── */

/**
 * The words this product uses in a particular way, each pointing at the
 * surface where the word is doing its work. Every figure is interpolated from
 * the tier constants, so a change to the term or the rate rewrites the
 * glossary rather than leaving it stale.
 */
const TERMS: AtlasEntry[] = [
  {
    id: "term-term",
    kind: "term",
    title: "Term",
    subtitle: `The fixed ${CYCLE_DAYS} day window a vault runs, starting when capital is placed.`,
    to: "/app/vaults",
    icon: "Timer",
    keywords: ["cycle", "duration", "30 day", "window", "length", "period"],
  },
  {
    id: "term-accrual",
    kind: "term",
    title: "Accrual",
    subtitle: `${DAY_PCT} of principal per day, continuous, stopping at maturity.`,
    to: "/app/vaults",
    icon: "TrendingUp",
    keywords: ["accrue", "earning", "rate", "daily", "interest", "rewards", "continuous"],
  },
  {
    id: "term-settlement",
    kind: "term",
    title: "Settlement target",
    subtitle: `The window the desk works to on a withdrawal, ${TOP_TIER.settlementHours} hours at ${TOP_TIER.name} to ${ENTRY_TIER.settlementHours} hours at ${ENTRY_TIER.name}.`,
    to: "/app/desk",
    icon: "Clock",
    keywords: ["settle", "withdrawal", "speed", "hours", "target", "queue", "how long"],
  },
  {
    id: "term-standing",
    kind: "term",
    title: "Standing",
    subtitle: `Your rung on the ladder, measured on lifetime contribution from ${money(ENTRY_TIER.entry)}.`,
    to: "/app/tiers",
    icon: "Medal",
    keywords: ["tier", "rank", "level", "progression", "contribution", "lifetime"],
  },
  {
    id: "term-principal",
    kind: "term",
    title: "Principal",
    subtitle: "The capital placed into a vault, held separate from what it earns.",
    to: "/app/vaults",
    icon: "Banknote",
    keywords: ["capital", "amount", "deposit", "stake", "base"],
  },
  {
    id: "term-maturity",
    kind: "term",
    title: "Maturity",
    subtitle: `The end of the term. The position holds at ${TERM_PCT} and accrues nothing further.`,
    to: "/app/vaults",
    icon: "Flag",
    keywords: ["matured", "complete", "finished", "ends", "expiry", "settle"],
  },
  {
    id: "term-redeploy",
    kind: "term",
    title: "Redeploy",
    subtitle: "Putting principal from a matured position back to work in a new term.",
    to: "/app/vaults/new",
    icon: "Repeat",
    keywords: ["reinvest", "roll over", "rollover", "top up", "again", "idle capital"],
  },
];

/* ── the static half of the index ───────────────────────────────────────── */

const STATIC: AtlasEntry[] = [...SURFACES, ...ACTIONS, ...TIER_ENTRIES, ...TERMS];

const BY_ID = new Map(STATIC.map((entry) => [entry.id, entry]));

function pick(...ids: string[]): AtlasEntry[] {
  return ids.map((id) => BY_ID.get(id)).filter((entry): entry is AtlasEntry => entry !== undefined);
}

/**
 * The directory the Atlas route shows when nothing is typed. Areas follow the
 * grouping in the sidebar so a member browsing here recognises the shape of
 * the product they already navigate.
 */
const AREAS: AtlasArea[] = [
  {
    id: "capital",
    label: "Capital",
    blurb: "Where capital is placed, watched and settled.",
    entries: pick("home", "desk", "act-open", "vaults", "yield", "markets"),
  },
  {
    id: "programme",
    label: "Programme",
    blurb: "The ladder, the tools for reading it, and the people you bring.",
    entries: pick("tiers", "compare", "match", "circle"),
  },
  {
    id: "intelligence",
    label: "Intelligence",
    blurb: "What the desk publishes, and what your own ledger says.",
    entries: pick("signal", "insight", "telemetry", "record"),
  },
  {
    id: "assistants",
    label: "Assistants",
    blurb: "Two assistants with two jobs, kept apart on purpose.",
    entries: pick("copilot", "support"),
  },
  {
    id: "account",
    label: "Account",
    blurb: "Your details, your preferences and your data.",
    entries: pick(
      "settings",
      "settings-profile",
      "settings-appearance",
      "settings-notifications",
      "settings-data",
      "orientation",
    ),
  },
  {
    id: "legal",
    label: "Legal",
    blurb: "The documents that govern using Rigel.",
    entries: pick("legal-privacy", "legal-terms", "legal-risk"),
  },
];

/** Every surface, grouped by area, for browsing rather than searching. */
export function surfaceDirectory(): AtlasArea[] {
  return AREAS;
}

/* ── posts ──────────────────────────────────────────────────────────────── */

/**
 * Signal releases through the day, so anything dated ahead of the clock has
 * not been published yet and must not be findable.
 */
function postEntries(now: number): AtlasEntry[] {
  return loadPosts()
    .filter((post) => post.publishedAt <= now)
    .map((post) => ({
      id: `post-${post.id}`,
      kind: "post" as const,
      title: post.title,
      subtitle: firstSentence(post.body),
      to: `/app/signal/${encodeURIComponent(post.id)}`,
      icon: "Radio",
      keywords: ["signal", "post", "published", post.kind, ...(post.tags ?? [])],
    }));
}

/** Enough of a post to recognise it in a row, without wrapping the row. */
function firstSentence(body: string): string {
  const trimmed = body.trim();
  const stop = trimmed.search(/[.!?](\s|$)/);
  const sentence = stop > 0 ? trimmed.slice(0, stop + 1) : trimmed;
  return sentence.length > 120 ? `${sentence.slice(0, 117).trimEnd()}...` : sentence;
}

/** The whole index. Cheap enough to rebuild whenever the feed changes. */
export function buildCatalog(now: number = Date.now()): AtlasEntry[] {
  return [...STATIC, ...postEntries(now)];
}

/* ── search ─────────────────────────────────────────────────────────────── */

/**
 * The ladder. A title prefix always beats a title substring, which always
 * beats a keyword, which always beats the subtitle. The gaps between rungs are
 * wider than the kind weight below, so weighting can order two entries that
 * matched the same way without ever promoting a weaker kind of match.
 */
const SCORE = {
  titleExact: 132,
  titlePrefix: 108,
  titleWordPrefix: 88,
  titleSub: 68,
  keywordExact: 46,
  keywordPrefix: 38,
  keywordSub: 28,
  subtitle: 14,
} as const;

/** A place beats a verb beats a rung beats a definition beats a post. */
const KIND_WEIGHT: Record<AtlasKind, number> = {
  surface: 6,
  action: 5,
  tier: 4,
  term: 3,
  post: 2,
};

type Folded = { title: string; subtitle: string; keywords: string[]; words: string[] };

/**
 * Entries are stable objects between rebuilds of the catalog, so folding each
 * one once and hanging the result off the object keeps a keystroke from
 * re-normalising the whole index. The map is weak, so a rebuilt catalog drops
 * the old fold with the old entries.
 */
const FOLD_CACHE = new WeakMap<AtlasEntry, Folded>();

function foldEntry(entry: AtlasEntry): Folded {
  const cached = FOLD_CACHE.get(entry);
  if (cached) return cached;
  const title = fold(entry.title);
  const next: Folded = {
    title,
    subtitle: fold(entry.subtitle ?? ""),
    keywords: entry.keywords.map(fold),
    words: title.split(/[^a-z0-9]+/).filter(Boolean),
  };
  FOLD_CACHE.set(entry, next);
  return next;
}

function scoreToken(f: Folded, token: string): number {
  if (f.title === token) return SCORE.titleExact;
  if (f.title.startsWith(token)) return SCORE.titlePrefix;
  if (f.words.some((word) => word.startsWith(token))) return SCORE.titleWordPrefix;
  if (f.title.includes(token)) return SCORE.titleSub;

  let best = 0;
  for (const keyword of f.keywords) {
    if (keyword === token) best = Math.max(best, SCORE.keywordExact);
    else if (keyword.startsWith(token)) best = Math.max(best, SCORE.keywordPrefix);
    else if (keyword.includes(token)) best = Math.max(best, SCORE.keywordSub);
  }
  if (best > 0) return best;

  return f.subtitle.includes(token) ? SCORE.subtitle : 0;
}

/**
 * Members type the plural of a thing as readily as the singular, and "vaults"
 * finding nothing when "vault" finds six rows reads as a broken index. Trying
 * the stem once, at a discount, covers that without dragging a stemmer in: the
 * discount keeps a real match ahead of a guessed one.
 */
function scoreTokenLoosely(f: Folded, token: string): number {
  const direct = scoreToken(f, token);
  if (direct > 0) return direct;
  if (token.length <= 3 || !token.endsWith("s")) return 0;
  return Math.round(scoreToken(f, token.slice(0, -1)) * 0.8);
}

/**
 * Words that carry no signal in a query.
 *
 * A member does not always type keywords. "how do i withdraw" is a real thing
 * to type into an index, and every token having to land somewhere turns that
 * question into no answer at all. Stripping the connective tissue leaves the
 * word they actually meant. If a query is nothing but these, it is left intact
 * rather than treated as empty.
 */
const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "can",
  "do",
  "does",
  "for",
  "from",
  "how",
  "i",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "the",
  "to",
  "what",
  "when",
  "where",
  "which",
  "with",
]);

function meaningfulTokens(tokens: string[]): string[] {
  if (tokens.length < 2) return tokens;
  const kept = tokens.filter((token) => token.length > 1 && !STOPWORDS.has(token));
  return kept.length > 0 ? kept : tokens;
}

/**
 * The words a query is actually searched on, folded. Exported because the
 * highlight in Results has to mark what the ranking matched: marking a dropped
 * connective would put the accent on the wrong half of the row.
 */
export function queryTokens(query: string): string[] {
  const folded = fold(query.trim());
  if (!folded) return [];
  return meaningfulTokens(folded.split(/\s+/).filter(Boolean));
}

/** The rows a member sees before typing: the surfaces they use, then what is new. */
const DEFAULT_IDS = ["home", "desk", "act-open", "vaults", "yield", "signal", "tiers", "support"];
const DEFAULT_POSTS = 4;

function curated(catalog: AtlasEntry[], limit: number): AtlasEntry[] {
  const present = new Map(catalog.map((entry) => [entry.id, entry]));
  const surfaces = DEFAULT_IDS.map((id) => present.get(id)).filter(
    (entry): entry is AtlasEntry => entry !== undefined,
  );
  const posts = catalog.filter((entry) => entry.kind === "post").slice(0, DEFAULT_POSTS);
  return [...surfaces, ...posts].slice(0, Math.max(1, limit));
}

/**
 * Buckets in the order the best row in each appeared, so the strongest match
 * is always the first row of the first group and the keyboard starts on it.
 */
function toGroups(entries: AtlasEntry[]): AtlasGroup[] {
  const buckets = new Map<AtlasKind, AtlasEntry[]>();
  for (const entry of entries) {
    const bucket = buckets.get(entry.kind);
    if (bucket) bucket.push(entry);
    else buckets.set(entry.kind, [entry]);
  }
  return Array.from(buckets, ([kind, list]) => ({ kind, label: KIND_LABEL[kind], entries: list }));
}

/**
 * Rank the catalog against a query and hand back grouped rows.
 *
 * Every token has to land somewhere for an entry to survive, so "vault new"
 * finds the one row that answers both words rather than everything that
 * mentions either. An empty query is not an empty result: it returns the
 * curated set, because a launcher that opens on nothing teaches nothing.
 */
export function searchCatalog(
  query: string,
  catalog: AtlasEntry[],
  limit: number = ATLAS_LIMIT,
): AtlasGroup[] {
  const folded = fold(query.trim());
  if (!folded) return toGroups(curated(catalog, limit));

  const tokens = queryTokens(query);
  const hits: { entry: AtlasEntry; score: number }[] = [];

  for (const entry of catalog) {
    const f = foldEntry(entry);
    let total = 0;
    let missed = false;
    for (const token of tokens) {
      const score = scoreTokenLoosely(f, token);
      if (score === 0) {
        missed = true;
        break;
      }
      total += score;
    }
    if (missed) continue;
    // A title that opens with the whole phrase is a better answer than one
    // that happens to contain each word somewhere.
    if (tokens.length > 1 && f.title.startsWith(folded)) total += 24;
    hits.push({ entry, score: total + KIND_WEIGHT[entry.kind] });
  }

  // A tie on score goes to the shorter title, which is the one closer to being
  // the whole query: "tier" should reach Tiers before it reaches Tier Match.
  hits.sort(
    (a, b) =>
      b.score - a.score ||
      a.entry.title.length - b.entry.title.length ||
      a.entry.title.localeCompare(b.entry.title),
  );
  return toGroups(hits.slice(0, Math.max(1, limit)).map((hit) => hit.entry));
}

/** Grouped rows read back as one list, in the order they are rendered. */
export function flattenGroups(groups: AtlasGroup[]): AtlasEntry[] {
  return groups.flatMap((group) => group.entries);
}
