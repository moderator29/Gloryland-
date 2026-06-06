import { useEffect, useState } from "react";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { PACKAGES } from "@/lib/site-config";
import { listDeposits } from "@/lib/history";

const SUBS_KEY = "ec_subscribed_plans";

function readSubs(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SUBS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function TopUpNudge() {
  const [nudge, setNudge] = useState<{ tier: string; gap: number; days: number } | null>(null);

  useEffect(() => {
    const subs = readSubs();
    const deposits = listDeposits();
    const totalIn = deposits.reduce((s, d) => s + d.amount, 0);

    const subRanks = subs.map((s) => PACKAGES.findIndex((p) => p.name === s)).filter((i) => i >= 0);
    const topIdx = subRanks.length ? Math.max(...subRanks) : -1;
    const nextIdx = Math.min(PACKAGES.length - 1, topIdx + 1);
    const next = PACKAGES[nextIdx];
    if (!next || next.taken >= next.spots) {
      setNudge(null);
      return;
    }
    const gap = Math.max(0, next.price - totalIn);
    if (gap === 0) {
      setNudge(null);
      return;
    }
    const dailyAvg = deposits.length ? totalIn / Math.max(1, deposits.length) : 1500;
    const days = Math.max(1, Math.ceil(gap / Math.max(500, dailyAvg)));
    setNudge({ tier: next.name, gap, days });
  }, []);

  if (!nudge) return null;
  const short = nudge.tier.replace(" Plan", "");

  return (
    <Link
      to={`/portal?amount=${nudge.gap}&plan=${encodeURIComponent(nudge.tier)}`}
      className="glass-luxury flex items-center gap-3 p-4 transition-transform active:scale-[0.99]"
    >
      <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 ring-1 ring-primary/40">
        <Sparkles className="h-4 w-4 text-primary" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          Add{" "}
          <span className="text-gradient-gold font-numeric font-bold">
            ${nudge.gap.toLocaleString()}
          </span>{" "}
          to cross into <span className="font-medium text-primary">{short}</span>.
        </p>
        <p className="font-numeric mt-0.5 text-[11px] text-muted-foreground">
          At your pace, that's ~{nudge.days} day{nudge.days === 1 ? "" : "s"} away.
        </p>
      </div>
      <ArrowUpRight className="h-5 w-5 text-primary" />
    </Link>
  );
}
