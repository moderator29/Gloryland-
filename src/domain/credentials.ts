/**
 * A password and a passcode for the portal.
 *
 * Read this before changing anything here, because the honest scope matters
 * more than the code does.
 *
 * There is no server. A secret set here is checked by JavaScript running on
 * the member's own device against a hash in that device's local storage. That
 * makes it a real lock on a shared or borrowed phone, and it makes it no lock
 * at all against someone holding the device who knows what developer tools
 * are: they can clear the record, or read the ledger straight out of storage
 * without ever meeting this screen. It is a device lock, not an account, and
 * every string this product shows about it says so in those words. Do not add
 * copy that implies funds are protected by it.
 *
 * What is done properly regardless:
 *
 *  - The password and the passcode are never stored, never logged, and never
 *    leave the device. Only a salted derivation is kept.
 *  - PBKDF2 over HMAC SHA-256, a fresh 16 byte salt for each secret, and
 *    210,000 iterations, which is the figure OWASP publishes for this
 *    construction. It is deliberately slow so that guessing is slow.
 *  - Comparison is constant time, so a wrong answer cannot be narrowed down by
 *    how long it took to be rejected.
 *  - The two secrets get separate salts, so recovering one tells an attacker
 *    nothing about the other.
 */

const STORAGE_KEY = "rgl_credentials_v1";
const ITERATIONS = 210_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

export const PASSWORD_MIN = 8;
export const PASSCODE_LENGTH = 6;

export type StoredSecret = { salt: string; hash: string; iterations: number };
export type Credentials = {
  version: 1;
  password: StoredSecret;
  passcode: StoredSecret;
  createdAt: number;
};

/* ------------------------------------------------------------------ helpers */

const toHex = (buf: ArrayBuffer) =>
  Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");

function randomSalt(): string {
  const bytes = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(bytes);
  return toHex(bytes.buffer);
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  // Backed by a plain ArrayBuffer on purpose: `BufferSource` does not accept
  // the SharedArrayBuffer flavoured Uint8Array that the bare constructor
  // widens to under recent TypeScript lib definitions.
  const out = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/**
 * Equal or not, in time that does not depend on where they first differ.
 *
 * A plain `===` on a hash leaks the length of the matching prefix through
 * timing. It is a small leak against a salted PBKDF2 hash, and it costs one
 * loop to not have it.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function derive(secret: string, salt: string, iterations: number): Promise<string> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: fromHex(salt), iterations, hash: "SHA-256" },
    material,
    KEY_BITS,
  );
  return toHex(bits);
}

async function seal(secret: string): Promise<StoredSecret> {
  const salt = randomSalt();
  return { salt, hash: await derive(secret, salt, ITERATIONS), iterations: ITERATIONS };
}

async function matches(stored: StoredSecret, attempt: string): Promise<boolean> {
  // The stored iteration count is used rather than the current constant, so
  // raising ITERATIONS later does not lock out everyone who signed up before.
  const hash = await derive(attempt, stored.salt, stored.iterations);
  return constantTimeEqual(hash, stored.hash);
}

/* ------------------------------------------------------------------- rules */

export type Verdict = { ok: boolean; message: string };

/**
 * What makes a password acceptable.
 *
 * Length first, because it is the only property that reliably buys anything.
 * No character class rules: they push people towards Passw0rd! and away from
 * anything long, and the research on that is not close.
 */
export function checkPassword(value: string, handle = ""): Verdict {
  if (value.length === 0) return { ok: false, message: "" };
  if (value.length < PASSWORD_MIN)
    return { ok: false, message: `At least ${PASSWORD_MIN} characters.` };
  if (value.length > 200) return { ok: false, message: "That is longer than we can store." };
  if (handle && value.toLowerCase() === handle.toLowerCase())
    return { ok: false, message: "Not the same as your username." };
  if (/^(.)\1+$/.test(value))
    return { ok: false, message: "One repeated character is not enough." };
  return { ok: true, message: "" };
}

/** A rough strength reading, for the meter only. Never a gate. */
export function passwordStrength(value: string): 0 | 1 | 2 | 3 {
  if (value.length < PASSWORD_MIN) return 0;
  let score = 0;
  if (value.length >= 12) score++;
  if (value.length >= 16) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^\w\s]/.test(value)) score++;
  if (/\s/.test(value)) score++;
  return Math.min(3, Math.max(1, Math.ceil(score / 2))) as 1 | 2 | 3;
}

export function checkPasscode(value: string): Verdict {
  if (value.length === 0) return { ok: false, message: "" };
  if (!/^\d*$/.test(value)) return { ok: false, message: "Digits only." };
  if (value.length < PASSCODE_LENGTH) return { ok: false, message: `${PASSCODE_LENGTH} digits.` };
  if (/^(\d)\1{5}$/.test(value))
    return { ok: false, message: "Six of the same digit is guessable." };

  // A run in either direction, which covers 123456 and 654321 together.
  const digits = [...value].map(Number);
  const step = digits[1] - digits[0];
  if ((step === 1 || step === -1) && digits.every((d, i) => i === 0 || d - digits[i - 1] === step))
    return { ok: false, message: "A straight run is guessable." };

  return { ok: true, message: "" };
}

/* ----------------------------------------------------------------- storage */

export async function createCredentials(password: string, passcode: string): Promise<Credentials> {
  const [p, c] = await Promise.all([seal(password), seal(passcode)]);
  return { version: 1, password: p, passcode: c, createdAt: Date.now() };
}

export function saveCredentials(creds: Credentials): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(creds));
  } catch {
    /* a full or blocked store is not worth breaking sign up over */
  }
}

export function loadCredentials(): Credentials | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Credentials;
    if (parsed?.version !== 1 || !parsed.password?.hash || !parsed.passcode?.hash) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearCredentials(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export const verifyPassword = (creds: Credentials, attempt: string) =>
  matches(creds.password, attempt);
export const verifyPasscode = (creds: Credentials, attempt: string) =>
  matches(creds.passcode, attempt);
