/** Currency and number formatting used everywhere figures appear. */

export function money(n: number, decimals = 0): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Compact form for axis ticks and dense tiles: $12.4K, $1.2M. */
export function moneyCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export function pct(n: number, decimals = 1): string {
  return `${n >= 0 ? "+" : ""}${(n * 100).toFixed(decimals)}%`;
}

export function shortDate(t: number): string {
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function fullDate(t: number): string {
  return new Date(t).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "3 days ago", "in 12 days", "just now". */
export function relative(t: number, now = Date.now()): string {
  const diff = t - now;
  const abs = Math.abs(diff);
  const day = 86_400_000;
  if (abs < 60_000) return "just now";
  if (abs < 3_600_000) {
    const m = Math.round(abs / 60_000);
    return diff < 0 ? `${m}m ago` : `in ${m}m`;
  }
  if (abs < day) {
    const h = Math.round(abs / 3_600_000);
    return diff < 0 ? `${h}h ago` : `in ${h}h`;
  }
  const d = Math.round(abs / day);
  return diff < 0 ? `${d}d ago` : `in ${d}d`;
}

/** Days, to one decimal when under ten, for term countdowns. */
export function days(n: number): string {
  return n < 10 ? n.toFixed(1) : Math.round(n).toString();
}
