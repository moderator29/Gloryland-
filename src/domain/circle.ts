/**
 * Circle: the member's invite surface.
 *
 * Two things live here and nothing else. First, a stable invite code derived
 * from the member's own name, so the same member always sees the same code
 * without any server round trip. Second, the small amount of referral state a
 * browser can honestly hold: an inbound code captured from a `?ref=` link, and
 * a list of joins recorded on this device.
 *
 * What this module deliberately does not do is invent attribution. There is no
 * count of who joined, no earnings figure and no leaderboard, because none of
 * that can be known without the production backend. `joins` only ever contains
 * what was explicitly recorded here, which in the current build is nothing.
 *
 * Persistence is browser-local under `rgl_circle_v1`. `read`/`write` are the
 * only storage-aware functions, so moving to a server means replacing those
 * two and nothing else.
 */

const CIRCLE_KEY = "rgl_circle_v1";

/**
 * Unambiguous alphabet: no O, 0, I or 1, so a code read aloud or copied off a
 * screen cannot be mistyped into someone else's.
 */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const CODE_LENGTH = 6;
const CODE_PATTERN = new RegExp(`^RG-[${ALPHABET}]{${CODE_LENGTH}}$`);

/** A join recorded locally. Never fabricated, never inferred. */
export type CircleJoin = {
  /** The invite code the join came through. */
  code: string;
  at: number;
  /** Optional label the member attached when recording it. */
  label?: string;
};

export type CircleState = {
  /** The code this browser arrived with, captured once from `?ref=`. */
  inbound: string | null;
  /** When that code was captured. */
  inboundAt: number | null;
  joins: CircleJoin[];
};

const EMPTY: CircleState = { inbound: null, inboundAt: null, joins: [] };

/* ── code derivation ─────────────────────────────────────────────────────── */

/** djb2, unsigned. Same string in, same number out, on every device. */
function djb2(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  return h >>> 0;
}

function normalizeName(name: string | null | undefined): string {
  const clean = (name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
  return clean.length > 0 ? clean : "member";
}

/**
 * The member's invite code, in the form `RG-XXXXXX`.
 *
 * Derived, not allocated: the same name always produces the same code, so it
 * survives a reload with nothing stored. A production backend would issue and
 * reserve codes instead, at which point this becomes the fallback.
 */
export function inviteCode(name: string | null | undefined): string {
  const seed = normalizeName(name);
  // Two djb2 passes over different salts, then an avalanche step per character
  // so that near-identical names do not produce near-identical codes.
  let a = djb2(seed);
  let b = djb2(`${seed}|rigel-circle`);
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    const mix = (a ^ (b >>> 11)) >>> 0;
    out += ALPHABET[mix & 31];
    a = Math.imul(a ^ (mix >>> 3), 0x9e3779b1) >>> 0;
    b = ((b >>> 7) | (b << 25)) >>> 0;
  }
  return `RG-${out}`;
}

/** Whether a string is shaped like a Circle code. */
export function isCircleCode(raw: string | null | undefined): boolean {
  return typeof raw === "string" && CODE_PATTERN.test(raw.trim().toUpperCase());
}

/** Uppercase and hyphenate a loosely typed code, or null if it is not one. */
export function normalizeCode(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const bare = raw.trim().toUpperCase().replace(/^RG-?/, "");
  const candidate = `RG-${bare}`;
  return CODE_PATTERN.test(candidate) ? candidate : null;
}

/** The link that carries a code. Relative before the window exists. */
export function inviteUrl(code: string): string {
  const path = `/?ref=${encodeURIComponent(code)}`;
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

/* ── persistence ─────────────────────────────────────────────────────────── */

const listeners = new Set<() => void>();

/** Subscribe to Circle writes. Returns an unsubscribe function. */
export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const emit = () => listeners.forEach((fn) => fn());

function sanitize(value: unknown): CircleState {
  if (typeof value !== "object" || value === null) return EMPTY;
  const raw = value as Partial<CircleState>;
  const inbound = normalizeCode(typeof raw.inbound === "string" ? raw.inbound : null);
  const joins = Array.isArray(raw.joins)
    ? raw.joins.filter(
        (j): j is CircleJoin =>
          typeof j === "object" &&
          j !== null &&
          typeof (j as CircleJoin).code === "string" &&
          typeof (j as CircleJoin).at === "number",
      )
    : [];
  return {
    inbound,
    inboundAt: inbound && typeof raw.inboundAt === "number" ? raw.inboundAt : null,
    joins,
  };
}

export function loadCircle(): CircleState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(CIRCLE_KEY);
    return raw ? sanitize(JSON.parse(raw)) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function write(state: CircleState): CircleState {
  try {
    localStorage.setItem(CIRCLE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked: the code still derives, only the state is lost */
  }
  emit();
  return state;
}

/**
 * Capture the code this browser arrived with.
 *
 * First touch wins: once an inbound code is stored it is never overwritten, so
 * a later link cannot rewrite where a member came from. Returns the resulting
 * state either way.
 */
export function recordInbound(code: string | null | undefined): CircleState {
  const normalized = normalizeCode(code);
  const current = loadCircle();
  if (!normalized || current.inbound) return current;
  return write({ ...current, inbound: normalized, inboundAt: Date.now() });
}

/**
 * Record a join on this device. Nothing in the current build calls this: it
 * exists so the state has a defined shape for the backend to fill, not so the
 * interface can show a number it did not earn.
 */
export function recordJoin(join: Omit<CircleJoin, "at"> & { at?: number }): CircleState {
  const code = normalizeCode(join.code);
  if (!code) return loadCircle();
  const current = loadCircle();
  return write({
    ...current,
    joins: [{ ...join, code, at: join.at ?? Date.now() }, ...current.joins].slice(0, 200),
  });
}

/** Forget everything Circle stored on this device. */
export function clearCircle(): CircleState {
  try {
    localStorage.removeItem(CIRCLE_KEY);
  } catch {
    /* ignore */
  }
  emit();
  return EMPTY;
}
