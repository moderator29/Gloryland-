/**
 * The small derivations the account surfaces need on top of `@/domain/identity`.
 *
 * The domain module owns what a member is: the handle, the display name, the
 * stated approach and the reference derived from the handle. What lives here is
 * only presentation: a deterministic avatar gradient, and the single question
 * "since when", answered from evidence rather than assumed.
 */

import type { LedgerEvent } from "@/domain/ledger";

/* ── deterministic avatar colour ─────────────────────────────────────────── */

/**
 * Gradient stops, every one of them an existing brand token, so an avatar
 * introduces no new colour to the product. Each pair starts at `--accent` or
 * brighter, which keeps the dark ink used for the initials legible on top of
 * whichever pair a name lands on.
 */
const RAMPS: readonly (readonly [string, string])[] = [
  ["var(--accent)", "var(--accent-hi)"],
  ["var(--accent-hi)", "var(--accent-soft)"],
  ["var(--accent)", "var(--accent-cyan)"],
  ["var(--accent-hi)", "var(--accent-cyan)"],
  ["var(--accent-soft)", "var(--accent-hi)"],
  ["var(--accent)", "var(--accent-soft)"],
];

/** FNV-1a, unsigned. Same string in, same number out, on every device. */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export type AvatarPaint = { background: string; color: string };

/**
 * The paint for one member's avatar.
 *
 * Derived from the handle so it never has to be stored, never has to be chosen,
 * and is the same on every device the same handle signs in on. There is no
 * photo upload in this build and no stock portrait stands in for one, because a
 * face the member did not provide is a fiction about who they are.
 */
export function avatarPaint(seed: string): AvatarPaint {
  const h = hash(seed || "member");
  const [from, to] = RAMPS[h % RAMPS.length];
  // Four angles is enough variation to tell two avatars apart without the set
  // ever looking like six unrelated designs.
  const angle = 100 + ((h >>> 8) % 4) * 30;
  return {
    background: `linear-gradient(${angle}deg, ${from}, ${to})`,
    color: "#04101f",
  };
}

/* ── since when ──────────────────────────────────────────────────────────── */

export type MemberSince = {
  /** Epoch milliseconds, or null when nothing evidences a start date. */
  at: number | null;
  /** Where the date came from, so the copy beside it can be accurate. */
  source: "member" | "ledger" | "none";
};

/**
 * When this member started, taken from the earliest thing that can prove it.
 *
 * The member record carries the moment the handle was claimed. A browser that
 * was used before handles existed has no such stamp, so the earliest recorded
 * ledger event stands in. When there is neither, the answer is nothing, and the
 * caller says so instead of printing today's date as a start date.
 */
export function memberSince(joinedAt: number | null, events: LedgerEvent[]): MemberSince {
  const earliestEvent = events.reduce<number | null>(
    (min, e) => (min === null || e.at < min ? e.at : min),
    null,
  );

  if (joinedAt !== null && Number.isFinite(joinedAt)) {
    // An event older than the stamp means this browser was in use before the
    // handle was claimed, and the older date is the truer answer.
    if (earliestEvent !== null && earliestEvent < joinedAt) {
      return { at: earliestEvent, source: "ledger" };
    }
    return { at: joinedAt, source: "member" };
  }

  if (earliestEvent !== null) return { at: earliestEvent, source: "ledger" };
  return { at: null, source: "none" };
}
