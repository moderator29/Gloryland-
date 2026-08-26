/**
 * The ledger as a file: what an export contains, and what an import has to
 * prove before a single event is written.
 *
 * The rule the whole module is built around is that an import can only ever add
 * events the ledger itself could have produced. Every candidate is checked
 * field by field, anything that fails is reported rather than repaired, and the
 * member sees what the file holds before they decide to apply it.
 *
 * One subtlety earns the code here. Claims and closes point at the position
 * they belong to by id, and `append` issues a fresh id to everything it
 * records. So an import writes the openings first, keeps a map from each old id
 * to the new one, and rewrites the references as it goes. Without that the
 * imported claims would point at nothing and the figures would come back wrong.
 *
 * That re-issuing is what separates this path from `mergeStores` in the ledger.
 * A merge joins two copies of one member's own log and keeps ids as they are,
 * because the same id on both sides is the same event. An import can be handed
 * anyone's file, so it treats every opening as new and never lets a foreign id
 * land on a position this browser already holds.
 */

import {
  append,
  clearLedger,
  ledgerOwner,
  loadEvents,
  LEDGER_SCHEMA,
  type EventKind,
  type LedgerEvent,
  type RelayMode,
  type Snapshot,
} from "@/domain/ledger";
import { TIERS, type TierId } from "@/domain/tiers";
import { fullDate, money } from "@/components/system/format";

const TIER_IDS = new Set<string>(TIERS.map((t) => t.id));

export const LEDGER_FILE_VERSION = 1;

/* ── export ──────────────────────────────────────────────────────────────── */

export type LedgerFile = {
  product: "Rigel";
  /** Version of this file format. */
  version: number;
  /**
   * Version of the event schema inside it, and the member the log belongs to.
   *
   * The file is the only copy of a log that outlives the browser that wrote it,
   * so it carries the same two facts the stored envelope does. A reader that
   * knows neither which schema wrote the events nor whose they are has no way
   * to merge two files safely, and by the time that matters the files are a
   * member's whole history.
   */
  schema: number;
  owner: string | null;
  exportedAt: string;
  eventCount: number;
  summary: {
    contributed: number;
    standing: number;
    deployed: number;
    rewardsAccrued: number;
    rewardsClaimed: number;
    available: number;
    portfolioValue: number;
  };
  events: LedgerEvent[];
};

/** The payload written to disk. Figures are the derived ones, for reference. */
export function buildLedgerFile(snap: Snapshot, events: LedgerEvent[]): LedgerFile {
  return {
    product: "Rigel",
    version: LEDGER_FILE_VERSION,
    schema: LEDGER_SCHEMA,
    owner: ledgerOwner(),
    exportedAt: new Date().toISOString(),
    eventCount: events.length,
    summary: {
      contributed: snap.contributed,
      standing: snap.standing,
      deployed: snap.deployed,
      rewardsAccrued: snap.rewardsAccrued,
      rewardsClaimed: snap.rewardsClaimed,
      available: snap.available,
      portfolioValue: snap.portfolioValue,
    },
    events: [...events].sort((a, b) => a.at - b.at),
  };
}

const COLUMNS = [
  "id",
  "kind",
  "date",
  "timestamp",
  "amount",
  "amount_formatted",
  "tier",
  "asset",
  "network",
  "from_available",
  "starts_at",
  "position_id",
  "relay_mode",
  "address",
];

function cell(value: string | number) {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function row(e: LedgerEvent): (string | number)[] {
  const amount = "amount" in e ? e.amount : "";
  return [
    e.id,
    e.kind,
    fullDate(e.at),
    new Date(e.at).toISOString(),
    amount,
    amount === "" ? "" : money(amount, 2),
    e.kind === "open" ? e.tierId : "",
    e.kind === "open" ? e.asset : "",
    e.kind === "open" ? e.network : "",
    e.kind === "open" ? String(e.fromAvailable === true) : "",
    e.kind === "open" && e.startsAt !== undefined ? new Date(e.startsAt).toISOString() : "",
    "positionId" in e ? e.positionId : "",
    e.kind === "relay.set" ? e.mode : "",
    e.kind === "withdraw" ? e.address : "",
  ];
}

export function toCsv(events: LedgerEvent[]): string {
  const sorted = [...events].sort((a, b) => a.at - b.at);
  return [COLUMNS.join(","), ...sorted.map((e) => row(e).map(cell).join(","))].join("\n");
}

/** Hands the browser a file without touching the network. */
export function downloadFile(filename: string, mime: string, contents: string) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoked on the next frame, so the click has taken the URL first.
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Date stamp for a filename, so two exports never overwrite each other. */
export function fileStamp(now: number = Date.now()): string {
  return new Date(now).toISOString().slice(0, 19).replace(/[:T]/g, "-");
}

/* ── import ──────────────────────────────────────────────────────────────── */

export type InspectResult = {
  /** Whether anything at all can be applied. */
  ok: boolean;
  /** Every reason a candidate was refused, written for the member. */
  problems: string[];
  /** The events that passed, ready to apply. */
  events: LedgerEvent[];
  counts: Record<EventKind, number>;
  earliest: number | null;
  latest: number | null;
  /** Capital the file records as placed, from its own openings. */
  contributed: number;
  /** Entries dropped because they pointed at a position the file does not hold. */
  orphans: number;
  /** Entries dropped because they were not events this ledger can hold. */
  rejected: number;
};

const EMPTY_COUNTS: Record<EventKind, number> = {
  deposit: 0,
  open: 0,
  claim: 0,
  withdraw: 0,
  close: 0,
  "relay.set": 0,
  "relay.clear": 0,
  "course.set": 0,
  "course.stop": 0,
  "course.fill": 0,
};

function fail(problem: string): InspectResult {
  return {
    ok: false,
    problems: [problem],
    events: [],
    counts: { ...EMPTY_COUNTS },
    earliest: null,
    latest: null,
    contributed: 0,
    orphans: 0,
    rejected: 0,
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function positiveAmount(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v > 0;
}

/**
 * Read a file and say exactly what is in it, without writing anything.
 *
 * Called on selection, so the member is looking at the contents of their file
 * before an apply button is ever enabled.
 */
export function inspectLedgerFile(text: string): InspectResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return fail("That file is not valid JSON. Choose an export produced by Rigel.");
  }

  const raw = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.events)
      ? parsed.events
      : null;

  if (!raw) {
    return fail("No event list found. A Rigel export holds its events under an events key.");
  }
  if (raw.length === 0) {
    return fail("That file holds no events.");
  }

  const problems: string[] = [];
  const accepted: LedgerEvent[] = [];
  let rejected = 0;

  raw.forEach((candidate, index) => {
    const line = index + 1;
    if (!isRecord(candidate)) {
      problems.push(`Entry ${line} is not an event.`);
      rejected += 1;
      return;
    }

    const at = candidate.at;
    if (typeof at !== "number" || !Number.isFinite(at) || at <= 0) {
      problems.push(`Entry ${line} has no usable timestamp.`);
      rejected += 1;
      return;
    }

    // Ids in the file are only used to link claims and closes back to their
    // opening. A missing one is fine for events nothing points at.
    const id = typeof candidate.id === "string" ? candidate.id : "";

    switch (candidate.kind) {
      case "open": {
        if (!positiveAmount(candidate.amount)) {
          problems.push(`Entry ${line} opens a position with no amount.`);
          rejected += 1;
          return;
        }
        if (typeof candidate.tierId !== "string" || !TIER_IDS.has(candidate.tierId)) {
          problems.push(`Entry ${line} names a tier this ladder does not have.`);
          rejected += 1;
          return;
        }
        // Carried through rather than defaulted. A start date this reader
        // dropped would turn a position that has not begun accruing into one
        // that started the moment it was committed, and every day since would
        // be credited to capital that was not working.
        const startsAt = Number(candidate.startsAt);
        accepted.push({
          id: id || `imported-${line}`,
          kind: "open",
          at,
          amount: candidate.amount,
          tierId: candidate.tierId as TierId,
          asset: typeof candidate.asset === "string" ? candidate.asset : "USDT",
          network: typeof candidate.network === "string" ? candidate.network : "TRC20",
          // Dropping this one would turn every re-placed position back into
          // fresh capital and inflate standing.
          fromAvailable: candidate.fromAvailable === true,
          ...(Number.isFinite(startsAt) && startsAt > at ? { startsAt } : {}),
        });
        return;
      }
      case "claim": {
        if (!positiveAmount(candidate.amount)) {
          problems.push(`Entry ${line} claims nothing.`);
          rejected += 1;
          return;
        }
        if (typeof candidate.positionId !== "string" || candidate.positionId.length === 0) {
          problems.push(`Entry ${line} is a claim against no position.`);
          rejected += 1;
          return;
        }
        accepted.push({
          id: id || `imported-${line}`,
          kind: "claim",
          at,
          amount: candidate.amount,
          positionId: candidate.positionId,
        });
        return;
      }
      case "withdraw": {
        if (!positiveAmount(candidate.amount)) {
          problems.push(`Entry ${line} withdraws nothing.`);
          rejected += 1;
          return;
        }
        accepted.push({
          id: id || `imported-${line}`,
          kind: "withdraw",
          at,
          amount: candidate.amount,
          address: typeof candidate.address === "string" ? candidate.address : "",
        });
        return;
      }
      case "close": {
        if (typeof candidate.positionId !== "string" || candidate.positionId.length === 0) {
          problems.push(`Entry ${line} closes no position.`);
          rejected += 1;
          return;
        }
        accepted.push({
          id: id || `imported-${line}`,
          kind: "close",
          at,
          positionId: candidate.positionId,
        });
        return;
      }
      case "relay.set": {
        if (typeof candidate.positionId !== "string" || candidate.positionId.length === 0) {
          problems.push(`Entry ${line} arms a relay on no position.`);
          rejected += 1;
          return;
        }
        if (candidate.mode !== "full" && candidate.mode !== "principal") {
          problems.push(`Entry ${line} arms a relay in a mode this build does not run.`);
          rejected += 1;
          return;
        }
        accepted.push({
          id: id || `imported-${line}`,
          kind: "relay.set",
          at,
          positionId: candidate.positionId,
          mode: candidate.mode as RelayMode,
        });
        return;
      }
      case "relay.clear": {
        if (typeof candidate.positionId !== "string" || candidate.positionId.length === 0) {
          problems.push(`Entry ${line} clears a relay on no position.`);
          rejected += 1;
          return;
        }
        accepted.push({
          id: id || `imported-${line}`,
          kind: "relay.clear",
          at,
          positionId: candidate.positionId,
        });
        return;
      }
      case "course.set": {
        const amount = Number(candidate.amount);
        const everyDays = Number(candidate.everyDays);
        const legs = Number(candidate.legs);
        const startAt = Number(candidate.startAt);
        if (
          typeof candidate.courseId !== "string" ||
          candidate.courseId.length === 0 ||
          !Number.isFinite(amount) ||
          amount <= 0 ||
          !Number.isFinite(everyDays) ||
          everyDays < 1 ||
          !Number.isFinite(legs) ||
          legs < 0 ||
          !Number.isFinite(startAt)
        ) {
          problems.push(`Entry ${line} is a course with terms this ledger cannot read.`);
          rejected += 1;
          return;
        }
        accepted.push({
          id: id || `imported-${line}`,
          kind: "course.set",
          at,
          courseId: candidate.courseId,
          amount,
          everyDays: Math.round(everyDays),
          legs: Math.round(legs),
          startAt,
          asset: typeof candidate.asset === "string" ? candidate.asset : "",
          network: typeof candidate.network === "string" ? candidate.network : "",
        });
        return;
      }
      case "course.stop": {
        if (typeof candidate.courseId !== "string" || candidate.courseId.length === 0) {
          problems.push(`Entry ${line} stops no course.`);
          rejected += 1;
          return;
        }
        accepted.push({
          id: id || `imported-${line}`,
          kind: "course.stop",
          at,
          courseId: candidate.courseId,
        });
        return;
      }
      case "course.fill": {
        const leg = Number(candidate.leg);
        if (
          typeof candidate.courseId !== "string" ||
          candidate.courseId.length === 0 ||
          !Number.isFinite(leg) ||
          leg < 1 ||
          typeof candidate.positionId !== "string" ||
          candidate.positionId.length === 0
        ) {
          problems.push(`Entry ${line} fills a course leg this ledger cannot place.`);
          rejected += 1;
          return;
        }
        accepted.push({
          id: id || `imported-${line}`,
          kind: "course.fill",
          at,
          courseId: candidate.courseId,
          leg: Math.round(leg),
          positionId: candidate.positionId,
        });
        return;
      }
      default:
        problems.push(`Entry ${line} is a kind this ledger does not record.`);
        rejected += 1;
    }
  });

  // A claim or a close that points at an opening the file does not contain
  // would move money against a position that will not exist. Left out, and
  // counted so the member is told rather than quietly corrected.
  const openIds = new Set(accepted.filter((e) => e.kind === "open").map((e) => e.id));
  const linked = accepted.filter((e) => ("positionId" in e ? openIds.has(e.positionId) : true));
  const orphans = accepted.length - linked.length;
  if (orphans > 0) {
    problems.push(
      `${orphans} ${orphans === 1 ? "entry points" : "entries point"} at a position the file does not contain, and will be left out.`,
    );
  }

  // Counted after the orphan filter, so the tally on screen is what will be
  // written rather than what merely parsed.
  const counts: Record<EventKind, number> = { ...EMPTY_COUNTS };
  for (const e of linked) counts[e.kind] += 1;

  const times = linked.map((e) => e.at);
  // External capital only, the same rule the ledger applies, so the figure
  // previewed here is the one the ledger will report after the import.
  const contributed = linked.reduce(
    (sum, e) => (e.kind === "open" && e.fromAvailable !== true ? sum + e.amount : sum),
    0,
  );

  return {
    ok: linked.length > 0,
    problems,
    events: linked.sort((a, b) => a.at - b.at),
    counts,
    earliest: times.length ? Math.min(...times) : null,
    latest: times.length ? Math.max(...times) : null,
    contributed,
    orphans,
    rejected,
  };
}

export type ImportMode = "merge" | "replace";

/**
 * Write the inspected events into the ledger.
 *
 * Openings go first so their new ids exist before anything references them.
 * Replace clears the log first, which is why the screen guards that mode.
 */
export function applyLedgerFile(events: LedgerEvent[], mode: ImportMode): number {
  if (mode === "replace") clearLedger();

  const idMap = new Map<string, string>();
  let written = 0;

  for (const e of events) {
    if (e.kind !== "open") continue;
    const created = append({
      kind: "open",
      at: e.at,
      amount: e.amount,
      tierId: e.tierId,
      asset: e.asset,
      network: e.network,
      fromAvailable: e.fromAvailable === true,
      ...(e.startsAt !== undefined ? { startsAt: e.startsAt } : {}),
    });
    idMap.set(e.id, created.id);
    written += 1;
  }

  // Anything already in the log keeps its own id, so a merge can carry a claim
  // that belongs to a position this browser already holds.
  const existing = new Set(loadEvents().map((e) => e.id));

  for (const e of events) {
    switch (e.kind) {
      case "claim": {
        const positionId = idMap.get(e.positionId) ?? e.positionId;
        if (!idMap.has(e.positionId) && !existing.has(positionId)) continue;
        append({ kind: "claim", at: e.at, amount: e.amount, positionId });
        written += 1;
        break;
      }
      case "close": {
        const positionId = idMap.get(e.positionId) ?? e.positionId;
        if (!idMap.has(e.positionId) && !existing.has(positionId)) continue;
        append({ kind: "close", at: e.at, positionId });
        written += 1;
        break;
      }
      case "relay.set": {
        const positionId = idMap.get(e.positionId) ?? e.positionId;
        if (!idMap.has(e.positionId) && !existing.has(positionId)) continue;
        append({ kind: "relay.set", at: e.at, positionId, mode: e.mode });
        written += 1;
        break;
      }
      case "relay.clear": {
        const positionId = idMap.get(e.positionId) ?? e.positionId;
        if (!idMap.has(e.positionId) && !existing.has(positionId)) continue;
        append({ kind: "relay.clear", at: e.at, positionId });
        written += 1;
        break;
      }
      case "course.set": {
        append({
          kind: "course.set",
          at: e.at,
          courseId: e.courseId,
          amount: e.amount,
          everyDays: e.everyDays,
          legs: e.legs,
          startAt: e.startAt,
          asset: e.asset,
          network: e.network,
        });
        written += 1;
        break;
      }
      case "course.stop": {
        append({ kind: "course.stop", at: e.at, courseId: e.courseId });
        written += 1;
        break;
      }
      case "course.fill": {
        // The leg points at a position, which is remapped like every other
        // reference so a merge cannot attach a leg to someone else's vault.
        const positionId = idMap.get(e.positionId) ?? e.positionId;
        if (!idMap.has(e.positionId) && !existing.has(positionId)) continue;
        append({ kind: "course.fill", at: e.at, courseId: e.courseId, leg: e.leg, positionId });
        written += 1;
        break;
      }
      case "withdraw": {
        append({ kind: "withdraw", at: e.at, amount: e.amount, address: e.address });
        written += 1;
        break;
      }
      default:
        break;
    }
  }

  return written;
}
