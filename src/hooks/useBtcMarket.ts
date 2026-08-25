import { useEffect, useState } from "react";

export type Window = "1D" | "1W" | "1M" | "1Y" | "ALL";

export type Snapshot = {
  price: number;
  change24h: number;
  marketCap: number;
  vol24h: number;
};

type ChartPoint = { t: number; p: number };

const SNAP_KEY = "hal_btc_snap_v1";
const CHART_KEY = (w: Window) => `ec_btc_chart_${w}_v1`;
const WINDOW_DAYS: Record<Window, string> = {
  "1D": "1",
  "1W": "7",
  "1M": "30",
  "1Y": "365",
  ALL: "max",
};

export function useBtcSnapshot(): Snapshot | null {
  const [snap, setSnap] = useState<Snapshot | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(SNAP_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { t: number; data: Snapshot };
      if (Date.now() - parsed.t < 10 * 60 * 1000) return parsed.data;
    } catch {
      /* ignore */
    }
    return null;
  });

  useEffect(() => {
    let cancelled = false;
    const fetchIt = async () => {
      try {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true",
        );
        if (!res.ok) return;
        const data = await res.json();
        const b = data.bitcoin;
        if (!b) return;
        const next: Snapshot = {
          price: b.usd,
          change24h: b.usd_24h_change ?? 0,
          marketCap: b.usd_market_cap ?? 0,
          vol24h: b.usd_24h_vol ?? 0,
        };
        if (cancelled) return;
        setSnap(next);
        try {
          localStorage.setItem(SNAP_KEY, JSON.stringify({ t: Date.now(), data: next }));
        } catch {
          /* ignore */
        }
      } catch {
        /* ignore */
      }
    };
    fetchIt();
    const id = window.setInterval(fetchIt, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return snap;
}

export function useBtcChart(win: Window) {
  const [points, setPoints] = useState<ChartPoint[] | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(CHART_KEY(win));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { t: number; data: ChartPoint[] };
      const maxAge = win === "1D" ? 5 * 60_000 : 60 * 60_000;
      if (Date.now() - parsed.t < maxAge) return parsed.data;
    } catch {
      /* ignore */
    }
    return null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchIt = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${WINDOW_DAYS[win]}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        const prices: [number, number][] = data.prices ?? [];
        const sampled = sample(prices, 120);
        const next: ChartPoint[] = sampled.map(([t, p]) => ({ t, p }));
        if (cancelled) return;
        setPoints(next);
        try {
          localStorage.setItem(CHART_KEY(win), JSON.stringify({ t: Date.now(), data: next }));
        } catch {
          /* ignore */
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchIt();
    return () => {
      cancelled = true;
    };
  }, [win]);

  return { points, loading };
}

function sample<T>(arr: T[], target: number): T[] {
  if (arr.length <= target) return arr;
  const step = arr.length / target;
  const out: T[] = [];
  for (let i = 0; i < target; i++) out.push(arr[Math.floor(i * step)]);
  out.push(arr[arr.length - 1]);
  return out;
}
