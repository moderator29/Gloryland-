/**
 * The half of notifications that works without a server.
 *
 * Nothing is pushed, because pushing needs infrastructure this build does not
 * have. What the product can honestly do is notice what changed since the last
 * visit and say so once, derived from the ledger rather than from a queue.
 */
export { AwayDigest } from "./Away";
export type { AwayDigestProps } from "./Away";
export { deriveAway, readLastSeen, markSeen, daysAway } from "./away";
export type { Away, AwayItem, AwayItemKind } from "./away";
