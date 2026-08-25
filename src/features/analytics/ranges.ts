/** The windows the analytics surface offers, in the days unit every chart takes. */

export type Range = { label: string; days: number };

/**
 * ALL is a year: long enough to cover any real ledger, bounded enough that
 * the per-day replay behind each chart stays cheap.
 */
export const RANGES: Range[] = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "ALL", days: 365 },
];
