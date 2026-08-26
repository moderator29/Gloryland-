/**
 * The ledger: an append-only event log and the pure functions that derive
 * every figure in the product from it.
 *
 * Nothing here invents a number. Portfolio value, accrued rewards, tier
 * standing and vault progress are all computed from recorded events plus the
 * clock, so the same inputs always produce the same output and the UI can
 * animate against a live-but-deterministic source.
 *
 * Persistence is browser-local. That is a deliberate constraint of the
 * current build, not a design goal: `readStore`/`writeStore` are the only
 * storage-aware functions, so moving to a server means replacing those two
 * and nothing else. Everything above them, the envelope parse, the merge and
 * the derivation, is pure and moves unchanged.
 *
 * ── What is stored, and which log wins ──────────────────────────────────────
 *
 * The log is persisted inside an envelope: a schema version, the member the
 * log belongs to, the moment of the last write and the count at that moment.
 * A bare array is the shape this product wrote before the envelope existed and
 * is still read, unchanged, as an unowned log at version 1. None of this is
 * retrofittable: the first day two devices hold a log each, a record with no
 * version and no owner has no defined answer to which one is real, and by then
 * the logs are the member's money.
 *
 * The conflict rule, decided here rather than left to the first sync bug:
 *
 * 1. Two logs for the same member merge as the union of their event ids,
 *    ordered by `at` and then by id so both devices land on the same sequence.
 *    An append-only log never edits and never deletes, so every id on either
 *    side is a real event and a union is the only merge that cannot lose a
 *    member's capital. Last-write-wins would discard a whole device's history.
 * 2. An id held on both sides keeps the copy already stored. Bodies are never
 *    merged field by field: with no edits in the model, a differing body means
 *    two devices issued the same random id, not that an event changed.
 * 3. Logs with different owners never merge. A log is one member's record, and
 *    joining two would credit tier standing to someone who never contributed.
 * 4. A log with no owner adopts the first owner it is offered. That is the log
 *    this build writes today, before any account server exists.
 * 5. A schema version this build does not know refuses to merge, because
 *    joining logs it cannot fully read could drop what a newer build wrote. A
 *    log already stored at a newer version is still read and still replayed:
 *    showing a member an empty ledger would be worse than showing them one
 *    this build renders incompletely. Its version stamp is never lowered.
 *
 * The storage key keeps its old name on purpose. The version now lives inside
 * the envelope, so renaming the key would orphan every log already written.
 */

import {
  DAILY_RATE,
  TIERS,
  WITHDRAW_INTERVAL_DAYS,
  dailyReward,
  tierById,
  tierForAmount,
  type Tier,
  type TierId,
} from "./tiers";

export const DAY_MS = 86_400_000;
const EVENTS_KEY = "rgl_ledger_v1";

export type EventKind =
  | "open"
  | "claim"
  | "withdraw"
  | "close"
  | "relay.set"
  | "relay.clear"
  | "course.set"
  | "course.stop"
  | "course.fill";

export type LedgerEvent =
  /** Capital placed into a vault. Starts accruing, and keeps accruing. */
  | {
      id: string;
      kind: "open";
      at: number;
      amount: number;
      tierId: TierId;
      asset: string;
      network: string;
      /**
       * True when this position was funded from the balance already in the
       * account rather than from money brought in from outside.
       *
       * Without it the two cases are indistinguishable, and closing a position
       * then re-placing the same capital counted as if fresh money had
       * arrived: the balance was credited on settlement and never debited on
       * placement, so the portfolio doubled on every roll and tier standing
       * climbed on money that was only ever deposited once. Absent means
       * external, which is how every event written before this field existed
       * was treated.
       */
      fromAvailable?: boolean;
      /**
       * When the position starts accruing, if that is not the moment the
       * capital was committed. Absent means it began on `at`, which is every
       * event written before this field existed and every ordinary placement
       * since.
       *
       * The write still happens now. Nothing here schedules a future write and
       * nothing moves a member's money for them: the capital is committed at
       * `at` and the clock on it starts at `startsAt`. Until then the principal
       * is scheduled rather than deployed, because it is not accruing, and
       * counting it as deployed would overstate the portfolio in exactly the
       * way a re-placed roll used to.
       */
      startsAt?: number;
    }
  /** Accrued rewards moved from a position into available cash. */
  | { id: string; kind: "claim"; at: number; amount: number; positionId: string }
  /** Cash sent out to an external address. */
  | { id: string; kind: "withdraw"; at: number; amount: number; address: string }
  /** A position was closed and returned its principal to available cash. */
  | { id: string; kind: "close"; at: number; positionId: string }
  /**
   * A standing instruction on a position: once a whole day of reward has
   * accrued, act on it rather than leaving it outside the principal. The
   * latest relay event for a position wins, so arming, changing mode and
   * disarming are one mechanism and the whole history stays readable in
   * Ledger.
   */
  | { id: string; kind: "relay.set"; at: number; positionId: string; mode: RelayMode }
  | { id: string; kind: "relay.clear"; at: number; positionId: string }
  /**
   * A stated intention to place a fixed amount on a fixed rhythm.
   *
   * The platform cannot take the money: there is no mandate, no scheduler and
   * nothing that can move funds on a member's behalf. A course is therefore a
   * schedule the member fills by hand, and every surface says so. What it buys
   * is that the decision is made once, in advance, and the dates are visible.
   */
  | {
      id: string;
      kind: "course.set";
      at: number;
      courseId: string;
      amount: number;
      everyDays: number;
      /** Total legs, or 0 for open ended. */
      legs: number;
      startAt: number;
      asset: string;
      network: string;
    }
  | { id: string; kind: "course.stop"; at: number; courseId: string }
  | {
      id: string;
      kind: "course.fill";
      at: number;
      courseId: string;
      leg: number;
      positionId: string;
    };

/**
 * What a standing instruction does with accrued reward.
 *
 * `full` compounds: the reward is folded into principal, so it starts accruing
 * too. `principal` harvests: the reward moves to available cash and the
 * principal keeps running untouched. Both values were written by earlier
 * builds and both are still read, because the log is append only.
 */
export type RelayMode = "full" | "principal";

export type CourseLegState = "filled" | "due" | "scheduled" | "lapsed";

export type CourseLeg = {
  /** One based, so the interface can name it as the member sees it. */
  index: number;
  amount: number;
  dueAt: number;
  state: CourseLegState;
  /** Set once the leg has been filled by an actual placement. */
  positionId?: string;
};

export type Course = {
  id: string;
  amount: number;
  everyDays: number;
  /** Total legs, or 0 for open ended. */
  legs: number;
  startAt: number;
  asset: string;
  network: string;
  /** No stop event has been written for it. */
  active: boolean;
  schedule: CourseLeg[];
  filledCount: number;
  /** Capital actually placed against this course. */
  placed: number;
  /** The leg waiting to be filled, if one is. */
  nextDue: CourseLeg | null;
  /** The next leg not yet due, for a "next on" line. */
  upcoming: CourseLeg | null;
  /**
   * Capital this rhythm commits across any thirty day stretch.
   *
   * Thirty days is a calendar window and nothing more. It is not a term, there
   * is no term, and the figure exists only so two rhythms can be compared on
   * one span rather than on their own intervals.
   */
  per30: number;
  /** Legs that went unfilled and were overtaken by a later one. */
  lapsedCount: number;
};

export type Position = {
  id: string;
  tierId: TierId;
  tier: Tier;
  principal: number;
  /** When the capital was committed, which is when the event was written. */
  openedAt: number;
  /** When accrual begins. The same as `openedAt` unless a start was set. */
  startsAt: number;
  /** Accrual has begun, so this principal is earning. */
  started: boolean;
  /** Time until accrual begins. Zero once it has. */
  startsIn: number;
  asset: string;
  network: string;
  /**
   * Funded from capital already in the account rather than from a transfer.
   * Carried onto the position because it is the difference between a deposit
   * and a roll, and every surface that names where a position came from needs
   * to read it from somewhere other than the event.
   */
  fromAvailable: boolean;
  /**
   * Days this position has been accruing, fractional and unbounded.
   *
   * Nothing caps it. A position left in place for four months reads a hundred
   * and twenty days here, because that is how long it accrued for. There is no
   * term to measure progress through and no remaining days to count down.
   */
  daysElapsed: number;
  /** Total rewards this position has generated so far. */
  accrued: number;
  /** Rewards already moved out via claims. */
  claimed: number;
  /** Rewards available to claim right now. */
  claimable: number;
  /** Reward this principal adds every day it stays in place. */
  dailyReward: number;
  closed: boolean;
  /**
   * When the position was closed, or null while it is open.
   *
   * Carried because a surface listing closed positions has to name a date, and
   * before this existed the nearest thing to hand was the maturity date, which
   * was not when anything happened and no longer exists at all.
   */
  closedAt: number | null;
};

/**
 * Days of reward that must have accrued before a relay has anything to act on.
 *
 * One day, because the rate is stated per day and a fold of a part day would
 * compound a figure the member cannot check against it. It is also what stops
 * a relay firing on every tick: a fold restarts the clock, so an armed relay
 * writes at most one batch a day rather than one a second.
 */
export const RELAY_MIN_DAYS = 1;

/**
 * A relay as the product sees it, derived rather than stored.
 *
 * `carries` reads the position's own `claimable`, never principal times some
 * assumed run of days, so a member who has already claimed moves whatever is
 * actually left. Anything else would quote a figure the ledger cannot pay.
 */
export type Relay = {
  positionId: string;
  mode: RelayMode;
  setAt: number;
  /** The instruction stands: latest event is a set, and the position is open. */
  armed: boolean;
  /** When a whole day of unclaimed reward will have accrued on this position. */
  firesAt: number;
  /** Armed, past `firesAt` and not yet run, so it is waiting. */
  due: boolean;
  /** What the instruction moves when it runs. */
  carries: number;
  /** How long it has been sitting past its fire date. */
  overdueDays: number;
  /**
   * What the delay costs per day.
   *
   * Reward accrues on principal alone, so a reward left outside the principal
   * earns nothing. Folding it in is what puts it to work, which makes the cost
   * of waiting exactly what the unfolded reward would have earned. A harvest
   * forgoes nothing, because it was never going to put the reward to work.
   */
  forgoneDaily: number;
};

export type Snapshot = {
  positions: Position[];
  activePositions: Position[];
  /** Principal at work right now: open, started, accruing. */
  deployed: number;
  /**
   * Principal committed but not yet accruing, because a later start was named.
   *
   * Held apart from `deployed` because it is not earning. It is still the
   * member's money, so it counts in `portfolioValue`, and if it was funded
   * from the balance it has already left `available`.
   */
  scheduled: number;
  /** Lifetime rewards generated across every position. */
  rewardsAccrued: number;
  /** Rewards claimed into cash. */
  rewardsClaimed: number;
  /** Rewards earned but not yet claimed. */
  rewardsPending: number;
  /** Cash available to withdraw: claims plus returned principal, less withdrawals. */
  available: number;
  /**
   * How far the log spends past the cash it holds. Zero for every log this
   * build can write, because the balance-funded placement is refused at the
   * call site. It is not zero for an imported file that overdrew, and naming
   * it is the difference between reporting that and hiding it behind a clamp.
   */
  overdrawn: number;
  withdrawn: number;
  /**
   * The moment of the last withdrawal request, or null if none has been made.
   * The window below is measured from it and from nothing else.
   */
  lastWithdrawAt: number | null;
  /**
   * When the next withdrawal request may be made.
   *
   * A member who has never withdrawn reads `now`, because a first request is
   * allowed immediately: the interval measures the gap after a withdrawal and
   * there is no gap before the first one. Reading `now` rather than a sentinel
   * means every surface can print it as a date without a special case, and
   * `withdrawAllowed` is true either way.
   */
  withdrawUnlocksAt: number;
  /** A withdrawal request may be made right now. */
  withdrawAllowed: boolean;
  /** Days until the window opens, fractional. Zero when it is open. */
  daysUntilWithdraw: number;
  /** Everything the member owns right now, scheduled principal included. */
  portfolioValue: number;
  /** External capital ever brought in. Excludes anything re-placed from the
   *  account balance, which is money that was already counted once. */
  contributed: number;
  /** The most principal ever deployed at one time. */
  peakDeployed: number;
  /**
   * What tier standing is measured on: the greater of external capital and
   * peak deployed. Contribution alone would strand a member who compounds,
   * and peak alone would ignore capital that was settled and withdrawn.
   * Neither figure can be inflated by moving the same money in a circle.
   */
  standing: number;
  /** portfolioValue + withdrawn - contributed. */
  netGain: number;
  /** netGain as a fraction of contributed. */
  returnPct: number;
  /** Sum of daily accrual across every position currently earning. */
  dailyRate: number;
  tier: Tier | null;
  nextTier: Tier | null;
  /** 0..1 toward the next tier's entry, measured on `standing`. */
  tierProgress: number;
  /** Capital still required to reach the next tier. */
  toNextTier: number;
  /** Every course ever set, newest first. */
  courses: Course[];
  /** The one course still running, if any. */
  activeCourse: Course | null;
  /** Legs waiting to be filled across every active course. */
  courseDue: CourseLeg[];
  /** Every position that has ever had a relay instruction, armed or not. */
  relays: Relay[];
  relaysArmed: Relay[];
  /** Armed relays with a whole day of reward waiting on them. */
  relaysDue: Relay[];
  /** Total capital those due relays would move. */
  relayCarry: number;
  /** What leaving them unfired costs per day. */
  relayForgoneDaily: number;
  events: LedgerEvent[];
};

/* ── persistence ────────────────────────────────────────────────────────── */

/** The envelope shape this build writes and understands. See the file header. */
export const LEDGER_SCHEMA = 1;

export type LedgerStore = {
  /** Schema version of the envelope, not of the events inside it. */
  v: number;
  /** The member this log belongs to. Null until something issues an identity. */
  owner: string | null;
  /** When this log was last written. */
  updatedAt: number;
  /**
   * Events held at the last write. Kept as stored rather than recomputed on
   * read, so a count that disagrees with the events actually parsed is the
   * signal that a write was truncated rather than a fact quietly corrected.
   */
  count: number;
  events: LedgerEvent[];
};

function emptyStore(): LedgerStore {
  return { v: LEDGER_SCHEMA, owner: null, updatedAt: 0, count: 0, events: [] };
}

function isEvent(v: unknown): v is LedgerEvent {
  if (typeof v !== "object" || v === null) return false;
  const e = v as { id?: unknown; kind?: unknown; at?: unknown };
  return typeof e.id === "string" && typeof e.kind === "string" && typeof e.at === "number";
}

/**
 * Read the persisted shape, whichever of the two it is.
 *
 * Pure and separate from storage so the legacy path can be proved rather than
 * assumed. A bare array is what this product wrote before the envelope, and it
 * is read exactly as it stands: same events, same order, no owner, no rewrite.
 */
export function parseStore(raw: string | null): LedgerStore {
  if (!raw) return emptyStore();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyStore();
  }

  if (Array.isArray(parsed)) {
    const events = parsed.filter(isEvent);
    return {
      v: LEDGER_SCHEMA,
      owner: null,
      // A legacy log records no write time, so the newest event it holds is
      // the closest thing to one that is actually evidenced.
      updatedAt: events.reduce((max, e) => (e.at > max ? e.at : max), 0),
      count: events.length,
      events,
    };
  }

  if (typeof parsed !== "object" || parsed === null) return emptyStore();
  const env = parsed as Partial<LedgerStore>;
  if (!Array.isArray(env.events)) return emptyStore();

  const events = env.events.filter(isEvent);
  return {
    v: typeof env.v === "number" ? env.v : LEDGER_SCHEMA,
    owner: typeof env.owner === "string" && env.owner.length > 0 ? env.owner : null,
    updatedAt: typeof env.updatedAt === "number" ? env.updatedAt : 0,
    count: typeof env.count === "number" ? env.count : events.length,
    events,
  };
}

export function serialiseStore(store: LedgerStore): string {
  return JSON.stringify({ ...store, count: store.events.length });
}

export type MergeRefusal = "owner" | "schema";

export type MergeResult =
  | { ok: true; store: LedgerStore; added: number }
  | { ok: false; reason: MergeRefusal };

/**
 * Merge a log arriving from somewhere else into the one held here.
 *
 * Rules 1 to 3 and 5 of the file header live in this function, which is the
 * whole point of writing it before the server exists: the day two devices
 * disagree, the answer is here and it is testable, rather than being whatever
 * the sync code happened to do first.
 */
export function mergeStores(mine: LedgerStore, theirs: LedgerStore): MergeResult {
  if (mine.v > LEDGER_SCHEMA || theirs.v > LEDGER_SCHEMA) return { ok: false, reason: "schema" };
  if (mine.owner !== null && theirs.owner !== null && mine.owner !== theirs.owner) {
    return { ok: false, reason: "owner" };
  }

  const byId = new Map<string, LedgerEvent>();
  // Held first, so an id present on both sides keeps the copy already stored.
  for (const e of mine.events) byId.set(e.id, e);
  let added = 0;
  for (const e of theirs.events) {
    if (byId.has(e.id)) continue;
    byId.set(e.id, e);
    added += 1;
  }

  const events = [...byId.values()].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  return {
    ok: true,
    store: {
      v: LEDGER_SCHEMA,
      owner: mine.owner ?? theirs.owner,
      updatedAt: Math.max(mine.updatedAt, theirs.updatedAt),
      count: events.length,
      events,
    },
    added,
  };
}

function readStore(): LedgerStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    return parseStore(localStorage.getItem(EVENTS_KEY));
  } catch {
    return emptyStore();
  }
}

export function loadEvents(): LedgerEvent[] {
  return readStore().events;
}

/** Who the stored log says it belongs to, or null while it is unowned. */
export function ledgerOwner(): string | null {
  return readStore().owner;
}

/**
 * Stamp an owner onto the log.
 *
 * An unowned log adopts the id, which is rule 4: every log written by this
 * build predates any identity being issued. A log that already names a
 * different member is left exactly as it is and the caller is told, because
 * relabelling one member's record as another's is how standing gets credited
 * to capital nobody placed.
 */
export function setLedgerOwner(owner: string): boolean {
  const store = readStore();
  if (store.owner === owner) return true;
  if (store.owner !== null) return false;
  writeStore({ ...store, owner });
  return true;
}

/** Raised when the log cannot be written, so callers can tell the member. */
export type PersistFailure = "quota" | "blocked";
let onPersistFailure: ((reason: PersistFailure) => void) | null = null;
export function setPersistFailureHandler(fn: (reason: PersistFailure) => void) {
  onPersistFailure = fn;
}

function writeStore(store: LedgerStore) {
  // The log is append-only and every figure is replayed from it, so events are
  // never dropped to make room. Losing the oldest `open` would erase the
  // position it created along with the contribution history behind the member's
  // tier. If the write fails we surface it instead of silently discarding.
  try {
    localStorage.setItem(EVENTS_KEY, serialiseStore({ ...store, updatedAt: Date.now() }));
  } catch (e) {
    const quota = e instanceof DOMException && (e.name === "QuotaExceededError" || e.code === 22);
    onPersistFailure?.(quota ? "quota" : "blocked");
  }
}

const listeners = new Set<() => void>();

/** Subscribe to ledger writes. Returns an unsubscribe function. */
export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  listeners.forEach((fn) => fn());
}

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

/** Omit that distributes over a union instead of collapsing it to the shared keys. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type NewEvent = DistributiveOmit<LedgerEvent, "id" | "at"> & { at?: number };

export function append(event: NewEvent): LedgerEvent {
  return appendMany([event])[0];
}

/**
 * Write several events as one.
 *
 * A relay firing is a claim, a close and an open that only make sense
 * together: persisting them one at a time would leave a log where the position
 * closed and nothing reopened if the write failed halfway. One read, one
 * write, one notification.
 */
export function appendMany(events: NewEvent[]): LedgerEvent[] {
  if (events.length === 0) return [];
  const now = Date.now();
  const written = events.map(
    (e) => ({ ...e, id: (e as { id?: string }).id ?? newId(), at: e.at ?? now }) as LedgerEvent,
  );
  const store = readStore();
  writeStore({ ...store, events: [...store.events, ...written] });
  emit();
  return written;
}

/** Wipe the ledger. Used by account reset in settings. */
export function clearLedger() {
  try {
    localStorage.removeItem(EVENTS_KEY);
  } catch {
    /* ignore */
  }
  emit();
}

/* ── derivation ─────────────────────────────────────────────────────────── */

function clamp(n: number, lo: number, hi: number) {
  return n < lo ? lo : n > hi ? hi : n;
}

/** Money, to the cent. Anything the ledger writes as an amount goes through it. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Rewards a position has generated by `now`.
 *
 * Accrual is continuous and has no end date. The only thing that stops it is
 * the position being closed: without that bound a settled position would keep
 * earning forever, inflating rewards that can never be claimed against
 * anything. There is no upper bound on the days, because there is no term to
 * bound them with.
 */
function accruedAt(principal: number, startsAt: number, now: number, closedAt?: number): number {
  const end = closedAt !== undefined ? Math.min(now, closedAt) : now;
  // The floor at zero is what keeps a position that has not started yet at
  // nothing earned, rather than running the clock backwards from its start.
  const days = Math.max(0, (end - startsAt) / DAY_MS);
  return principal * DAILY_RATE * days;
}

/**
 * When the next withdrawal request is allowed, and whether it is allowed now.
 *
 * Exported because Horizon projects windows forward from a date that is not
 * `now`, and two implementations of the same interval would eventually
 * disagree about which day a member can act on.
 */
export function withdrawWindow(
  lastWithdrawAt: number | null,
  now: number,
): { withdrawUnlocksAt: number; withdrawAllowed: boolean; daysUntilWithdraw: number } {
  const unlocksAt =
    lastWithdrawAt === null ? now : lastWithdrawAt + WITHDRAW_INTERVAL_DAYS * DAY_MS;
  return {
    withdrawUnlocksAt: unlocksAt,
    withdrawAllowed: now >= unlocksAt,
    daysUntilWithdraw: Math.max(0, (unlocksAt - now) / DAY_MS),
  };
}

/**
 * The most capital deployed at one instant across a set of spans.
 *
 * Exported because a planner needs to know what standing a plan would reach
 * before any of it exists in the log, and two implementations of this would
 * eventually disagree. The tie break is the point: a position that closes at
 * the same instant another opens must lower the running total first, otherwise
 * that instant reads as if both were running and the peak lands at the sum.
 */
export function peakDeployedOf(spans: { at: number; amount: number; endsAt: number }[]): number {
  const steps = [
    ...spans.map((s) => ({ at: s.at, delta: s.amount })),
    ...spans.map((s) => ({ at: s.endsAt, delta: -s.amount })),
  ].sort((a, b) => a.at - b.at || a.delta - b.delta);

  let running = 0;
  let peak = 0;
  for (const step of steps) {
    running += step.delta;
    if (running > peak) peak = running;
  }
  return peak;
}

/** Upper bound on a generated schedule, so an open ended course terminates. */
const MAX_LEGS = 60;

/**
 * The window a rhythm is expressed over, so two intervals can be compared.
 *
 * A calendar month, near enough, and nothing to do with how long capital is
 * left in place. Positions have no length: this is only the span the product
 * quotes a placement rhythm across.
 */
const RHYTHM_WINDOW_DAYS = 30;

/**
 * Turn one course instruction into a schedule.
 *
 * A leg is filled when a fill event names it. Of the unfilled legs whose date
 * has passed, the most recent is due and the ones before it have lapsed: they
 * stay on the schedule rather than being deleted or quietly rolled forward,
 * because the member should be able to see that a date slipped and that the
 * rung they were aiming at moved with it.
 */
function buildCourse(
  set: Extract<LedgerEvent, { kind: "course.set" }>,
  stopped: boolean,
  fills: Map<string, Extract<LedgerEvent, { kind: "course.fill" }>>,
  now: number,
): Course {
  const total = set.legs > 0 ? Math.min(set.legs, MAX_LEGS) : MAX_LEGS;
  const every = Math.max(1, Math.round(set.everyDays));

  const raw: CourseLeg[] = Array.from({ length: total }, (_, i) => {
    const fill = fills.get(`${set.courseId}:${i + 1}`);
    return {
      index: i + 1,
      amount: set.amount,
      dueAt: set.startAt + i * every * DAY_MS,
      state: fill ? ("filled" as const) : ("scheduled" as const),
      positionId: fill?.positionId,
    };
  });

  // The last unfilled leg whose date has passed is the one to act on.
  const overdue = raw.filter((l) => l.state !== "filled" && l.dueAt <= now);
  const dueIndex = overdue.length > 0 ? overdue[overdue.length - 1].index : null;

  const schedule = raw.map((l) => {
    if (l.state === "filled") return l;
    if (l.dueAt > now) return l;
    return { ...l, state: l.index === dueIndex ? ("due" as const) : ("lapsed" as const) };
  });

  const filled = schedule.filter((l) => l.state === "filled");

  return {
    id: set.courseId,
    amount: set.amount,
    everyDays: every,
    legs: set.legs,
    startAt: set.startAt,
    asset: set.asset,
    network: set.network,
    active: !stopped,
    schedule,
    filledCount: filled.length,
    placed: filled.reduce((sum, l) => sum + l.amount, 0),
    nextDue: stopped ? null : (schedule.find((l) => l.state === "due") ?? null),
    upcoming: schedule.find((l) => l.state === "scheduled") ?? null,
    per30: set.amount * Math.floor(RHYTHM_WINDOW_DAYS / every),
    lapsedCount: schedule.filter((l) => l.state === "lapsed").length,
  };
}

export function derive(events: LedgerEvent[], now: number = Date.now()): Snapshot {
  const opens = events.filter(
    (e): e is Extract<LedgerEvent, { kind: "open" }> => e.kind === "open",
  );
  const claims = events.filter(
    (e): e is Extract<LedgerEvent, { kind: "claim" }> => e.kind === "claim",
  );
  const closes = events.filter(
    (e): e is Extract<LedgerEvent, { kind: "close" }> => e.kind === "close",
  );
  const withdraws = events.filter(
    (e): e is Extract<LedgerEvent, { kind: "withdraw" }> => e.kind === "withdraw",
  );

  // When a position was settled, so accrual can be stopped at that instant.
  const closedAtById = new Map<string, number>();
  for (const c of closes) {
    const prev = closedAtById.get(c.positionId);
    if (prev === undefined || c.at < prev) closedAtById.set(c.positionId, c.at);
  }

  const positions: Position[] = opens.map((o) => {
    const tier = tierById(o.tierId) ?? TIERS[0];
    const closedAt = closedAtById.get(o.id);
    // Accrual runs from the start date, which is the moment the capital was
    // committed unless the placement named a later one.
    const startsAt = o.startsAt !== undefined && o.startsAt > o.at ? o.startsAt : o.at;
    const effectiveNow = closedAt !== undefined ? Math.min(now, closedAt) : now;
    const daysElapsed = Math.max(0, (effectiveNow - startsAt) / DAY_MS);
    const accrued = accruedAt(o.amount, startsAt, now, closedAt);
    const claimed = claims.filter((c) => c.positionId === o.id).reduce((s, c) => s + c.amount, 0);
    return {
      id: o.id,
      tierId: o.tierId,
      tier,
      principal: o.amount,
      openedAt: o.at,
      startsAt,
      started: now >= startsAt,
      startsIn: Math.max(0, startsAt - now),
      asset: o.asset,
      network: o.network,
      fromAvailable: o.fromAvailable === true,
      daysElapsed,
      accrued,
      claimed,
      claimable: Math.max(0, accrued - claimed),
      dailyReward: dailyReward(o.amount),
      closed: closedAt !== undefined,
      closedAt: closedAt ?? null,
    };
  });

  const active = positions.filter((p) => !p.closed);

  // Deployed is principal actually at work. Capital committed but not yet
  // accruing is held apart, because showing it as deployed would overstate what
  // the portfolio is earning.
  const deployed = active.filter((p) => p.started).reduce((s, p) => s + p.principal, 0);
  const scheduled = active.filter((p) => !p.started).reduce((s, p) => s + p.principal, 0);
  const rewardsAccrued = positions.reduce((s, p) => s + p.accrued, 0);
  const rewardsClaimed = claims.reduce((s, c) => s + c.amount, 0);
  const rewardsPending = Math.max(0, rewardsAccrued - rewardsClaimed);
  const returnedPrincipal = positions.filter((p) => p.closed).reduce((s, p) => s + p.principal, 0);
  const withdrawn = withdraws.reduce((s, w) => s + w.amount, 0);

  // Capital re-placed from the balance leaves the balance. Capital brought in
  // from outside never touched it, so it must not be debited here. It leaves
  // when the placement is committed, not when accrual starts, because that is
  // when the member parted with it.
  const recycled = opens.filter((o) => o.fromAvailable).reduce((s, o) => s + o.amount, 0);
  // Held in two figures rather than one clamped one. `available` can never be
  // negative, because a balance is not a debt this product can create, and
  // `overdrawn` says how far a log went past its own cash instead of a clamp
  // quietly absorbing it. Only an import can produce one: `openPosition`
  // refuses the write.
  const cash = rewardsClaimed + returnedPrincipal - withdrawn - recycled;
  const available = Math.max(0, cash);
  const overdrawn = Math.max(0, -cash);

  const contributed = opens.filter((o) => !o.fromAvailable).reduce((s, o) => s + o.amount, 0);

  // The most principal that was ever deployed at one instant. Replayed rather
  // than accumulated, because a position that closed must lower the running
  // total before the next open raises it again.
  // A position that never closed is still running, so its span ends at the
  // far future rather than at a date that would lower the peak early.
  // The span opens where accrual starts, not at the commitment, and a position
  // that has not started yet is left out entirely: capital that has not begun
  // accruing has never been deployed, so it cannot raise a peak today. It
  // enters the reading on the day it starts, like any other placement.
  const peakDeployed = peakDeployedOf(
    positions
      .filter((p) => p.started)
      .map((p) => ({
        at: p.startsAt,
        amount: p.principal,
        endsAt: closedAtById.get(p.id) ?? Number.MAX_SAFE_INTEGER,
      })),
  );

  // Relays. The latest instruction per position wins, so a member can arm,
  // change mode and disarm without the log needing anything removed from it.
  const byPosition = new Map<string, Extract<LedgerEvent, { kind: "relay.set" | "relay.clear" }>>();
  for (const e of events) {
    if (e.kind !== "relay.set" && e.kind !== "relay.clear") continue;
    const prev = byPosition.get(e.positionId);
    if (prev === undefined || e.at >= prev.at) byPosition.set(e.positionId, e);
  }

  const positionById = new Map(positions.map((p) => [p.id, p]));
  const relays: Relay[] = [];
  for (const [positionId, e] of byPosition) {
    const p = positionById.get(positionId);
    if (!p) continue;
    const mode: RelayMode = e.kind === "relay.set" ? e.mode : "full";
    const armed = e.kind === "relay.set" && !p.closed;
    const firesAt = relayFiresAt(p);
    const due = armed && p.started && now >= firesAt;
    // The same function the firing uses, so the figure quoted on the panel is
    // the figure the batch writes, to the cent.
    const carries = carryOf(p, mode);
    relays.push({
      positionId,
      mode,
      setAt: e.at,
      armed,
      firesAt,
      due,
      carries,
      overdueDays: due ? Math.max(0, (now - firesAt) / DAY_MS) : 0,
      // Only a compounding relay forgoes anything by waiting. A harvest moves
      // the reward to cash, which does not accrue either, so nothing is lost.
      forgoneDaily: due && mode === "full" ? p.claimable * DAILY_RATE : 0,
    });
  }
  relays.sort((a, b) => a.firesAt - b.firesAt);

  // Courses. Like relays, the latest instruction per id wins, and the schedule
  // is derived rather than stored so a change of rhythm cannot leave stale
  // dates behind.
  const courseSets = new Map<string, Extract<LedgerEvent, { kind: "course.set" }>>();
  const courseStops = new Set<string>();
  const courseFills = new Map<string, Extract<LedgerEvent, { kind: "course.fill" }>>();
  for (const e of events) {
    if (e.kind === "course.set") {
      const prev = courseSets.get(e.courseId);
      if (prev === undefined || e.at >= prev.at) courseSets.set(e.courseId, e);
    } else if (e.kind === "course.stop") {
      courseStops.add(e.courseId);
    } else if (e.kind === "course.fill") {
      courseFills.set(`${e.courseId}:${e.leg}`, e);
    }
  }

  const courses: Course[] = Array.from(courseSets.values()).map((c) =>
    buildCourse(c, courseStops.has(c.courseId), courseFills, now),
  );
  courses.sort((a, b) => b.startAt - a.startAt);
  const activeCourse = courses.find((c) => c.active) ?? null;
  const courseDue = courses.filter((c) => c.active).flatMap((c) => (c.nextDue ? [c.nextDue] : []));

  const relaysArmed = relays.filter((r) => r.armed);
  const relaysDue = relays.filter((r) => r.due);

  // The withdrawal window is a member level rule, read off the last request
  // rather than off any position, because it governs cash leaving the account
  // and not what any one vault is doing.
  const lastWithdrawAt = withdraws.reduce<number | null>(
    (latest, w) => (latest === null || w.at > latest ? w.at : latest),
    null,
  );
  const window = withdrawWindow(lastWithdrawAt, now);

  const standing = Math.max(contributed, peakDeployed);
  // Scheduled principal is counted here and nowhere near `deployed`. It is the
  // member's money either way: if it came from the balance it has already been
  // debited, so leaving it out would make the portfolio drop on placement.
  const portfolioValue = deployed + scheduled + rewardsPending + available;
  const netGain = portfolioValue + withdrawn - contributed;

  const tier = tierForAmount(standing);
  const next = tier ? (TIERS.find((t) => t.rank === tier.rank + 1) ?? null) : TIERS[0];
  const floor = tier?.entry ?? 0;
  const tierProgress = next ? clamp((standing - floor) / (next.entry - floor), 0, 1) : 1;

  return {
    positions,
    activePositions: active,
    deployed,
    scheduled,
    rewardsAccrued,
    rewardsClaimed,
    rewardsPending,
    available,
    overdrawn,
    withdrawn,
    lastWithdrawAt,
    ...window,
    portfolioValue,
    contributed,
    peakDeployed,
    standing,
    netGain,
    returnPct: contributed > 0 ? netGain / contributed : 0,
    // What is accruing right now: open and started. Nothing else stops it.
    dailyRate: active.filter((p) => p.started).reduce((s, p) => s + p.dailyReward, 0),
    tier,
    nextTier: next,
    tierProgress,
    toNextTier: next ? Math.max(0, next.entry - standing) : 0,
    courses,
    activeCourse,
    courseDue,
    relays,
    relaysArmed,
    relaysDue,
    relayCarry: relaysDue.reduce((sum, r) => sum + r.carries, 0),
    relayForgoneDaily: relaysDue.reduce((sum, r) => sum + r.forgoneDaily, 0),
    events: [...events].sort((a, b) => b.at - a.at),
  };
}

/* ── reading an event ───────────────────────────────────────────────────── */

/**
 * What a row in the ledger is, as opposed to which kind it was written as.
 *
 * Two distinctions the kinds alone do not carry. A roll is an `open` funded
 * from the balance: the same event kind as a deposit, but no capital arrived,
 * so reading them as one thing is what the double count looked like from the
 * outside. And relay and course events are instructions the member gave, not
 * money that moved, so a member auditing what came in and what went out should
 * be able to put them aside.
 */
export type EventClass =
  | "placement"
  | "roll"
  | "claim"
  | "withdrawal"
  | "settlement"
  | "instruction";

/** True when this placement was funded from capital already in the account. */
export function isRoll(e: LedgerEvent): boolean {
  return e.kind === "open" && e.fromAvailable === true;
}

export function classify(e: LedgerEvent): EventClass {
  switch (e.kind) {
    case "open":
      return isRoll(e) ? "roll" : "placement";
    case "claim":
      return "claim";
    case "withdraw":
      return "withdrawal";
    case "close":
      return "settlement";
    default:
      return "instruction";
  }
}

/** Instructions stand apart from movements: nothing about them moves capital. */
export function isInstruction(e: LedgerEvent): boolean {
  return classify(e) === "instruction";
}

/* ── actions ────────────────────────────────────────────────────────────── */

/**
 * Placements funded from the balance are allowed a cent of slack.
 *
 * Accrual is continuous, so `available` carries a fraction of a cent that the
 * amount on screen has already been rounded away from. Without the tolerance a
 * member placing exactly the balance they can see would be refused for a
 * rounding artefact they have no way to observe.
 */
export const FUNDING_TOLERANCE = 0.01;

/**
 * What a balance-funded placement records as its origin.
 *
 * No asset arrived and no chain carried it, so naming one would describe a
 * transfer that never happened. A compounded position is the one exception: it
 * keeps the asset the capital originally came in as, because that trail is
 * real.
 */
export const BALANCE_ASSET = "USD";
export const BALANCE_NETWORK = "Account balance";

export type Placement =
  | { ok: true; event: LedgerEvent }
  | {
      ok: false;
      reason: "insufficient-balance";
      /** Cash the log actually holds at the moment of the write. */
      available: number;
      /** How far past it the placement reached. */
      shortfall: number;
    };

/**
 * How far a balance-funded placement of `amount` exceeds `available`. Zero when
 * it fits. Pure, so the form can show the same figure the write would refuse on.
 */
export function fundingShortfall(amount: number, available: number): number {
  const gap = amount - available;
  // The tolerance decides whether there is a shortfall, and never how large it
  // is: a member told they are short should read the real gap, not the gap less
  // a cent of slack they were never shown.
  return gap > FUNDING_TOLERANCE ? round2(gap) : 0;
}

/**
 * Open a position.
 *
 * A placement funded from the account balance cannot exceed the balance. The
 * check is here, at the write, and not in `derive`, because `derive` is a pure
 * replay of what happened: clamping a negative balance there hides an overdraw
 * rather than preventing one, and the event would still be in the log. Refusing
 * the write is the only place the invariant actually holds, and it is the
 * reason a hand-typed amount on the placement URL cannot open a position funded
 * by cash that does not exist.
 *
 * Returns a result rather than throwing, because every caller is a click.
 */
export function openPosition(input: {
  amount: number;
  tierId: TierId;
  asset: string;
  network: string;
  at?: number;
  /** Set when the placement is funded from the account balance. */
  fromAvailable?: boolean;
  /** Set when accrual begins later than the moment the capital is committed. */
  startsAt?: number;
}): Placement {
  if (input.fromAvailable) {
    const now = input.at ?? Date.now();
    const available = derive(loadEvents(), now).available;
    const shortfall = fundingShortfall(input.amount, available);
    if (shortfall > 0) {
      return { ok: false, reason: "insufficient-balance", available, shortfall };
    }
  }
  return { ok: true, event: append({ kind: "open", ...input }) };
}

export function claimRewards(positionId: string, amount: number) {
  return append({ kind: "claim", positionId, amount });
}

export function recordWithdrawal(amount: number, address: string) {
  return append({ kind: "withdraw", amount, address });
}

/** Set a course, or replace the amount and rhythm of one already running. */
export function setCourse(input: {
  courseId?: string;
  amount: number;
  everyDays: number;
  legs: number;
  startAt?: number;
  asset: string;
  network: string;
}) {
  return append({
    kind: "course.set",
    courseId: input.courseId ?? newId(),
    amount: input.amount,
    everyDays: input.everyDays,
    legs: input.legs,
    startAt: input.startAt ?? Date.now(),
    asset: input.asset,
    network: input.network,
  });
}

export function stopCourse(courseId: string) {
  return append({ kind: "course.stop", courseId });
}

/** Record that a placement filled one leg. Written with the open, never after. */
export function fillCourseLeg(courseId: string, leg: number, positionId: string) {
  return append({ kind: "course.fill", courseId, leg, positionId });
}

/** Arm a relay, or change the mode on one that is already armed. */
export function armRelay(positionId: string, mode: RelayMode) {
  return append({ kind: "relay.set", positionId, mode });
}

export function disarmRelay(positionId: string) {
  return append({ kind: "relay.clear", positionId });
}

/**
 * When a position will have a whole day of unclaimed reward on it.
 *
 * Derived from what the position has already claimed rather than from its age,
 * so a relay that has just folded, or a member who claimed by hand, both push
 * the next fold out by a full day instead of the instruction firing again on
 * the next tick. Pure, so the panel can print the date the derivation uses.
 */
export function relayFiresAt(position: Position): number {
  const perDay = position.dailyReward;
  if (perDay <= 0) return position.startsAt;
  const days = position.claimed / perDay + RELAY_MIN_DAYS;
  return position.startsAt + days * DAY_MS;
}

/**
 * What a standing instruction moves when it runs.
 *
 * `claimable`, never `accrued`. Accrued is everything the position has ever
 * generated, including rewards the member has already claimed and may well
 * have withdrawn. Moving that figure would place capital the ledger cannot pay
 * out twice. One function, so the panel, the insight and the write cannot
 * quote three different amounts.
 *
 * A compounding relay moves principal and reward together, because both end up
 * in the new position. A harvest moves the reward alone: the principal is not
 * touched, so naming it would overstate what happens.
 */
export function carryOf(position: Position, mode: RelayMode = "full"): number {
  return round2(mode === "full" ? position.principal + position.claimable : position.claimable);
}

/**
 * The events that fold a position's reward into its principal.
 *
 * A position's principal is fixed by the event that opened it, so compounding
 * is a close and a re-open at the larger figure rather than an edit. Built here
 * and written by one `appendMany`, so a fold can never be half recorded.
 *
 * Two rules hold it honest. Every event is stamped now rather than backdated,
 * because a fold that claimed to have happened days ago would fabricate accrual
 * on capital that was not yet in the new position. And the new position is
 * marked as funded from the balance, because the money was already counted when
 * it first arrived, so counting it again would inflate the portfolio and buy
 * tier standing that was never paid for.
 */
function compoundBatch(position: Position, rearm: boolean, nextId: string) {
  const carry = carryOf(position, "full");
  const tier = tierForAmount(carry) ?? position.tier;

  return [
    ...(position.claimable >= 0.01
      ? [{ kind: "claim" as const, positionId: position.id, amount: round2(position.claimable) }]
      : []),
    { kind: "close" as const, positionId: position.id },
    {
      id: nextId,
      kind: "open" as const,
      amount: carry,
      tierId: tier.id,
      asset: position.asset,
      network: position.network,
      fromAvailable: true,
    } as NewEvent,
    ...(rearm ? [{ kind: "relay.set" as const, positionId: nextId, mode: "full" as const }] : []),
  ];
}

/**
 * Run one due relay.
 *
 * A compounding relay folds the reward into a larger position and re-arms on
 * it, so a member arms once rather than every day. A harvest is a single claim:
 * the principal is untouched and keeps accruing, so there is nothing to close,
 * nothing to re-open, and the instruction already on the position still stands.
 */
export function fireRelay(relay: Relay, position: Position): LedgerEvent[] {
  if (!relay.due) return [];
  if (relay.mode === "principal") {
    if (position.claimable < 0.01) return [];
    return appendMany([
      { kind: "claim", positionId: position.id, amount: round2(position.claimable) },
    ]);
  }
  return appendMany(compoundBatch(position, true, newId()));
}

/**
 * Close a position to cash: claim what is left, then close, as one write.
 *
 * Same reason as the fold. A claim that persists without its close leaves a
 * position that looks open and has nothing left in it. Nothing is forfeited by
 * closing: accrual is paid for the days it actually ran, and the principal
 * returns to the balance in full.
 */
export function settlePosition(position: Position): LedgerEvent[] {
  if (position.closed) return [];
  return appendMany([
    ...(position.claimable >= 0.01
      ? [{ kind: "claim" as const, positionId: position.id, amount: position.claimable }]
      : []),
    { kind: "close" as const, positionId: position.id },
  ]);
}

export type Compound = {
  events: LedgerEvent[];
  /** The position that opened, so the caller can take the member to it. */
  positionId: string;
  /** What it opened with. */
  carry: number;
};

/**
 * Fold a position's reward into its principal by hand: claim, close and
 * re-place, as one write.
 *
 * The same batch a relay fires, minus the re-arming, because a member who
 * compounded once has not asked for it to happen every day. Written together
 * rather than as a claim, then a close, then an open on another screen: that
 * sequence can be abandoned halfway, which leaves a closed position and no new
 * one, and is the exact failure `appendMany` exists to stop.
 *
 * Refused when there is nothing to fold. A reward under a cent would close a
 * position and re-open it at the same figure, writing three events that change
 * nothing and restarting the clock the fold is measured on.
 */
export function compoundPosition(position: Position): Compound | null {
  if (position.closed || position.claimable < 0.01) return null;
  const nextId = newId();
  const events = appendMany(compoundBatch(position, false, nextId));
  return { events, positionId: nextId, carry: carryOf(position, "full") };
}

/**
 * What closing a position right now returns, in dollars.
 *
 * There is no term to break and nothing to forfeit: accrual is paid for the
 * days the capital actually ran, and closing simply stops it. What the member
 * gives up is the future, and the only honest way to state that is per day,
 * because how long they would have left it there is their decision and not a
 * figure this product may assume on their behalf.
 */
export type CloseValue = {
  /** Principal that returns to the balance. */
  principal: number;
  /** Unclaimed reward, which is claimed on the way out rather than lost. */
  claimable: number;
  /** Principal and reward together: what the balance receives. */
  returns: number;
  /** Reward this principal stops earning from the moment it closes. */
  forgoneDaily: number;
};

export function closeValue(position: Position): CloseValue {
  const claimable = round2(position.claimable);
  return {
    principal: position.principal,
    claimable,
    returns: round2(position.principal + claimable),
    forgoneDaily: position.dailyReward,
  };
}

export function closePosition(positionId: string) {
  return append({ kind: "close", positionId });
}

/**
 * Historical portfolio value, one point per day, for performance charts.
 * Replays the ledger rather than storing snapshots so the series always
 * matches the current derivation logic.
 */
export function valueSeries(
  events: LedgerEvent[],
  days: number,
  now: number = Date.now(),
): { t: number; v: number }[] {
  const out: { t: number; v: number }[] = [];
  const start = now - days * DAY_MS;
  const step = (now - start) / Math.min(days, 90);
  for (let t = start; t <= now; t += step) {
    const upto = events.filter((e) => e.at <= t);
    out.push({ t, v: derive(upto, t).portfolioValue });
  }
  return out;
}
