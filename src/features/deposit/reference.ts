/**
 * A stable, human-quotable reference for a deposit. Derived from the event id
 * so the same position always yields the same code, and readable over the
 * phone: no ambiguous characters.
 */
const ALPHABET = "ACDEFGHJKLMNPQRTUVWXY3479";

export function reference(seed: string): string {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0;
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += ALPHABET[h % ALPHABET.length];
    h = Math.floor(h / ALPHABET.length) + 7919;
  }
  return `RG-${out}`;
}
