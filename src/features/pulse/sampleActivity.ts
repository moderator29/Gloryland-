/**
 * Illustrative member activity for the live band.
 *
 * IMPORTANT: none of this is real. There are no other members, no deposits and
 * no withdrawals behind these lines. It exists so the live band has motion
 * before the platform has traffic, and it is deliberately isolated in one file
 * with one exported function so it can be deleted in a single change the day
 * real activity exists.
 *
 * Two safeguards keep it from reading as fact: the values are produced by a
 * seeded generator rather than random noise, so they are stable and repeatable
 * rather than pretending to be a live wire; and the application carries a
 * standing preview notice stating that nothing behind these figures is real.
 */

import { TIERS } from "@/domain/tiers";

export type SampleEvent = {
  id: string;
  name: string;
  city: string;
  kind: "placed" | "settled" | "claimed" | "reached";
  amount: number;
  tier: string;
  minutesAgo: number;
};

const NAMES = [
  "A. Mensah",
  "K. Okafor",
  "R. Almeida",
  "S. Haddad",
  "L. Novak",
  "M. Adeyemi",
  "T. Bergström",
  "J.Варга",
  "D. Ferreira",
  "N. Rahman",
  "C. Villanueva",
  "P. Lindqvist",
  "O. Diallo",
  "E. Kowalski",
  "H. Tanaka",
  "B. Nkosi",
  "F. Moreau",
  "G. Petrov",
  "I. Castellanos",
  "V. Sharma",
];

const CITIES = [
  "Lagos",
  "Lisbon",
  "Dubai",
  "Singapore",
  "Toronto",
  "Nairobi",
  "Zurich",
  "São Paulo",
  "Stockholm",
  "Jakarta",
  "Warsaw",
  "Cape Town",
  "Seoul",
  "Amsterdam",
  "Mexico City",
  "Manila",
  "Doha",
  "Tallinn",
];

const KINDS: SampleEvent["kind"][] = ["placed", "settled", "claimed", "reached"];

/** Deterministic 32-bit hash, so a given seed always yields the same feed. */
function hash(n: number): number {
  let h = (n ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

const pick = <T>(arr: T[], n: number) => arr[hash(n) % arr.length];

/**
 * Build `count` illustrative events. `epoch` advances slowly with the clock so
 * the band drifts over time rather than freezing, without ever claiming to be
 * a live feed.
 */
export function sampleActivity(count = 10, now = Date.now()): SampleEvent[] {
  const epoch = Math.floor(now / 90_000);
  return Array.from({ length: count }, (_, i) => {
    const s = epoch + i * 7919;
    const tier = TIERS[hash(s + 3) % TIERS.length];
    const kind = pick(KINDS, s + 5);
    const step = 1 + (hash(s + 11) % 6);
    return {
      id: `s${s}`,
      name: pick(NAMES, s),
      city: pick(CITIES, s + 1),
      kind,
      // Amounts sit on the tier ladder so the feed never contradicts the product.
      amount: kind === "claimed" ? Math.round(tier.entry * 0.3) : tier.entry * step,
      tier: tier.name,
      minutesAgo: 1 + (hash(s + 17) % 240),
    };
  });
}

export function describeSample(e: SampleEvent): string {
  switch (e.kind) {
    case "placed":
      return `opened a ${e.tier} vault`;
    case "settled":
      return `settled a ${e.tier} term`;
    case "claimed":
      return `claimed from ${e.tier}`;
    case "reached":
      return `reached ${e.tier}`;
  }
}
