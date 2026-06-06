import { useEffect, useState } from "react";
import { Flame } from "lucide-react";

const KEY = "ec_streak_v1";
const DAY = 86_400_000;

type StreakData = { count: number; last: number };

function read(): StreakData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { count: 0, last: 0 };
}

function bumpIfNewDay(): StreakData {
  const now = Date.now();
  const data = read();
  if (data.last === 0) {
    const next = { count: 1, last: now };
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    return next;
  }
  const sinceLast = now - data.last;
  if (sinceLast < DAY) return data;
  if (sinceLast < 2 * DAY) {
    const next = { count: data.count + 1, last: now };
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    return next;
  }
  const next = { count: 1, last: now };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function StreakCounter() {
  const [data, setData] = useState<StreakData>({ count: 0, last: 0 });

  useEffect(() => {
    setData(bumpIfNewDay());
  }, []);

  if (data.count < 1) return null;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/40 bg-black/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
      style={{
        boxShadow: "0 0 12px -2px rgba(255,140,0,0.55), inset 0 1px 0 rgba(255,200,100,0.2)",
      }}
    >
      <Flame className="h-3 w-3 text-orange-400" fill="currentColor" />
      <span className="font-numeric text-orange-300">{data.count}</span>
      <span className="text-orange-300/70">day{data.count === 1 ? "" : "s"}</span>
    </span>
  );
}
