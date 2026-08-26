/**
 * Who a member is, and how they say they want to invest.
 *
 * This build has no account server, so identity is held in the browser. That
 * shapes two things honestly:
 *
 * 1. A username is claimed rather than registered. `checkUsername` is async on
 *    purpose: today it applies format rules, a reserved list and the registry
 *    of names already claimed in this browser, and the day there is a server it
 *    becomes one fetch inside the same function with no caller changing. The UI
 *    never promises the name is reserved globally, because it is not.
 *
 * 2. The approach a member picks is a stated intention, not a product they buy.
 *    It changes what the interface leads with, never the rate, never the term,
 *    never what the ledger computes. Every rung earns the same 30% over 30 days
 *    whatever is chosen here.
 */

import { DAILY_RATE, TIERS, WITHDRAW_INTERVAL_DAYS, dailyReward } from "./tiers";

/* ── the model ──────────────────────────────────────────────────────────── */

export type ApproachId = "steady" | "compound" | "ladder" | "watching";

export type Member = {
  /** Lowercase handle, unique within this browser. Stable, never re-cased. */
  username: string;
  /** What the member is called on screen. Free text, theirs to change. */
  displayName: string;
  approach: ApproachId;
  /** First claimed, in epoch milliseconds. */
  joinedAt: number;
};

export type Approach = {
  id: ApproachId;
  name: string;
  /** One line, in the member's own terms. */
  pitch: string;
  /** What the product actually does differently. */
  effect: string;
  /** The honest trade, stated rather than hidden. */
  tradeoff: string;
  /** Lucide icon name, resolved by the UI. */
  icon: "steady" | "compound" | "ladder" | "watching";
};

const dayPct = `${Math.round(DAILY_RATE * 100)}%`;

/**
 * Four ways of running the same instrument. None of them change the rate, and
 * each says so in its own words, because a member choosing between options
 * should never come away thinking one of them pays more.
 */
export const APPROACHES: Approach[] = [
  {
    id: "steady",
    name: "Steady",
    pitch: "One term at a time. See it through before deciding anything else.",
    effect: `Surfaces lead with the single open position, how long it has been accruing and what it adds a day. Insights stays quiet while nothing needs deciding.`,
    tradeoff: `Reward left inside the position earns nothing, because accrual runs on principal alone.`,
    icon: "steady",
  },
  {
    id: "compound",
    name: "Compounding",
    pitch: "Fold the reward back into principal so it accrues too.",
    effect: `The position leads with the compounding action rather than the claim, and Trajectory projects forward on the folded figure.`,
    tradeoff: `Nothing reaches your available balance while you keep folding, so there is nothing to withdraw until you stop.`,
    icon: "compound",
  },
  {
    id: "ladder",
    name: "Laddered",
    pitch: "Build a position in stages rather than in one decision.",
    effect: `Horizon opens on the withdrawal calendar and Course on the placement rhythm, so the dates are the first thing you see.`,
    tradeoff: `Capital waiting to be placed accrues nothing, so staging costs the days it waits and never makes them back.`,
    icon: "ladder",
  },
  {
    id: "watching",
    name: "Watching",
    pitch: "Not placing yet. Learn the mechanics first.",
    effect: `Home leads with worked examples and the glossary instead of an empty portfolio, and nothing prompts you to fund.`,
    tradeoff: `Nothing accrues while you watch. Every figure you see is an illustration until you open a position.`,
    icon: "watching",
  },
];

export function approachById(id: string | null | undefined): Approach {
  return APPROACHES.find((a) => a.id === id) ?? APPROACHES[3];
}

/* ── username rules ─────────────────────────────────────────────────────── */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

/**
 * Names the platform speaks with, or that would let one member be mistaken for
 * the desk. Held here rather than on a server because the impersonation risk is
 * real today and the server is not.
 */
const RESERVED = new Set([
  "rigel",
  "rigelcapital",
  "admin",
  "administrator",
  "root",
  "system",
  "support",
  "help",
  "helpdesk",
  "desk",
  "official",
  "team",
  "staff",
  "moderator",
  "mod",
  "security",
  "billing",
  "payments",
  "treasury",
  "vault",
  "signal",
  "copilot",
  "assistant",
  "api",
  "www",
  "null",
  "undefined",
  "anonymous",
  "me",
  "you",
]);

/** Registry of handles claimed in this browser. */
const REGISTRY_KEY = "rgl_handles_v1";

function readRegistry(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(REGISTRY_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeRegistry(list: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(list.slice(-500)));
  } catch {
    /* a blocked store only costs the duplicate check, not the sign in */
  }
}

/** Everything a caller needs to render the field's state in one object. */
export type UsernameCheck = {
  ok: boolean;
  /** Cleaned handle, safe to store. Empty when the input cannot be cleaned. */
  value: string;
  /** Why it was refused, written for the member rather than the developer. */
  reason?: string;
  /** Handles close to what they typed, offered only when theirs is taken. */
  suggestions?: string[];
};

/** Lowercase, strip anything outside the allowed set, collapse repeats. */
export function normaliseUsername(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_{2,}/g, "_")
    .slice(0, USERNAME_MAX);
}

/** Format rules only. Synchronous, so a field can validate while typing. */
export function validateUsername(raw: string): UsernameCheck {
  const value = normaliseUsername(raw);

  if (value.length === 0) return { ok: false, value, reason: "Pick a handle." };
  if (value.length < USERNAME_MIN)
    return { ok: false, value, reason: `At least ${USERNAME_MIN} characters.` };
  if (!/^[a-z]/.test(value)) return { ok: false, value, reason: "Start with a letter." };
  if (/_$/.test(value)) return { ok: false, value, reason: "Cannot end with an underscore." };
  if (RESERVED.has(value))
    return { ok: false, value, reason: "That handle is kept for the platform." };

  return { ok: true, value };
}

function suggest(value: string): string[] {
  const taken = new Set(readRegistry());
  const out: string[] = [];
  const stem = value.slice(0, USERNAME_MAX - 3);
  for (const suffix of ["_", "1", "2", "x", "_c", "01"]) {
    const candidate = normaliseUsername(stem + suffix);
    if (candidate.length >= USERNAME_MIN && !taken.has(candidate) && !RESERVED.has(candidate)) {
      out.push(candidate);
    }
    if (out.length === 3) break;
  }
  return out;
}

/**
 * The full check, including whether the handle is already taken.
 *
 * Async because the taken check belongs on a server, and this is the one
 * function that would change when there is one. It is deliberately given a
 * short delay so the interface is built against a real pending state rather
 * than one that only appears in production.
 */
export async function checkUsername(raw: string): Promise<UsernameCheck> {
  const format = validateUsername(raw);
  if (!format.ok) return format;

  await new Promise((r) => setTimeout(r, 220));

  if (readRegistry().includes(format.value)) {
    return {
      ok: false,
      value: format.value,
      reason: "That handle is already in use.",
      suggestions: suggest(format.value),
    };
  }
  return format;
}

/** Record a handle as taken. Idempotent. */
export function claimUsername(username: string) {
  const list = readRegistry();
  if (!list.includes(username)) writeRegistry([...list, username]);
}

/** Release a handle, so signing out and back in with the same name works. */
export function releaseUsername(username: string) {
  writeRegistry(readRegistry().filter((h) => h !== username));
}

/* ── display name ───────────────────────────────────────────────────────── */

export const DISPLAY_MAX = 40;

export function validateDisplayName(raw: string): { ok: boolean; value: string; reason?: string } {
  const value = raw.replace(/\s+/g, " ").trim().slice(0, DISPLAY_MAX);
  if (value.length === 0) return { ok: false, value, reason: "Tell us what to call you." };
  if (value.length < 2) return { ok: false, value, reason: "A little longer." };
  return { ok: true, value };
}

/* ── derived identity ───────────────────────────────────────────────────── */

/** Up to two letters for an avatar, from the display name then the handle. */
export function initials(displayName: string, username: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  if (words.length === 1 && words[0].length >= 2) return words[0].slice(0, 2).toUpperCase();
  return username.slice(0, 2).toUpperCase();
}

/**
 * A short reference the member can quote in a support message or a receipt.
 * Derived from the handle so it never needs storing and never collides for two
 * different handles in the same browser.
 */
export function memberRef(username: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < username.length; i++) {
    h ^= username.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `RGL-${h.toString(36).toUpperCase().padStart(7, "0").slice(-7)}`;
}

/* ── starting scale ─────────────────────────────────────────────────────── */

/**
 * The bands offered during onboarding. Each maps onto a real rung so the
 * amount carried into the deposit form is one the ladder actually recognises,
 * and the figures quoted are the ones the ledger will produce.
 */
export const START_BANDS = TIERS.map((t) => ({
  tierId: t.id,
  label: t.name,
  amount: t.entry,
  daily: dailyReward(t.entry),
  settlementHours: t.settlementHours,
  /** Stated once per band so no band can read as a better rate than another. */
  note: `${dayPct} of principal a day, the same as every rung, with a withdrawal every ${WITHDRAW_INTERVAL_DAYS} days.`,
}));
