import { listDeposits, listWithdraws } from "@/lib/history";
import { PACKAGES } from "@/lib/site-config";

const SUBS_KEY = "ec_subscribed_plans";

export function totalDeposited(): number {
  return listDeposits().reduce((s, d) => s + d.amount, 0);
}

export function totalWithdrawn(): number {
  return listWithdraws().reduce((s, w) => s + w.amount, 0);
}

export function availableBalance(): number {
  return Math.max(0, totalDeposited() - totalWithdrawn());
}

export function topTierDaily(): number {
  try {
    const subs: string[] = JSON.parse(localStorage.getItem(SUBS_KEY) || "[]");
    if (!subs.length) return 0;
    let best = 0;
    for (const s of subs) {
      const p = PACKAGES.find((pp) => pp.name === s);
      if (p && p.daily > best) best = p.daily;
    }
    return best;
  } catch {
    return 0;
  }
}
