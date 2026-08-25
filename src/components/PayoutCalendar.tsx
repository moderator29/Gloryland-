import { useMemo } from "react";
import { motion } from "framer-motion";
import { CalendarDays } from "lucide-react";

const SUBS_KEY = "hal_subscribed_plans";

import { PACKAGES } from "@/lib/site-config";

function dailyForTopTier(): number {
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

export function PayoutCalendar() {
  const daily = useMemo(dailyForTopTier, []);
  const today = new Date();
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
  const total = daily * 30;

  return (
    <div className="glass-luxury p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <CalendarDays className="h-4 w-4 text-primary" />
          <span>Next 30 Days</span>
        </div>
        <span className="font-numeric text-xs text-success">
          +${total.toLocaleString()} expected
        </span>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {days.map((d, i) => {
          const isToday = i === 0;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.012 }}
              className={`relative aspect-square overflow-hidden rounded-xl border p-1.5 text-center text-[10px] ${
                isToday ? "border-primary/60 bg-primary/15" : "border-border/60 bg-black/30"
              }`}
            >
              <p
                className={`font-numeric leading-none ${isToday ? "text-primary" : "text-white/80"}`}
              >
                {d.getDate()}
              </p>
              {daily > 0 && (
                <p className="font-numeric mt-0.5 text-[8px] text-success/80">
                  +${daily.toLocaleString()}
                </p>
              )}
              <span
                className="absolute inset-x-0 bottom-0 h-0.5"
                style={{
                  background: isToday
                    ? "linear-gradient(90deg, transparent, #E8C25C, transparent)"
                    : "transparent",
                }}
              />
            </motion.div>
          );
        })}
      </div>

      {daily === 0 && (
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Activate a tier to populate the calendar with daily payouts.
        </p>
      )}
    </div>
  );
}
