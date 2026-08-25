import { useEffect, useState } from "react";
import { ASSETS, GECKO_IDS, assetByGecko, type AssetId } from "@/features/market/assets";

/**
 * Live prices for the five funding assets, and chart history on demand.
 *
 * One shared request serves every consumer: concurrent callers await the same
 * promise and a result stays fresh for 45 seconds, so the header ticker, the
 * Desk panel and a detail chart never hit the endpoint three times for the
 * same figure. The last good response is cached locally so a reload shows real
 * numbers immediately, and `stale` reports honestly when the feed is down.
 */

export type Coin = {
  id: AssetId;
  gecko: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number;
  vol24h: number;
  sparkline: number[];
};

const CACHE_KEY = "rgl_market_v2";
const FRESH_MS = 45_000;

const ENDPOINT =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=" +
  GECKO_IDS.join(",") +
  "&order=market_cap_desc&sparkline=true&price_change_percentage=24h";

type Cached = { at: number; coins: Coin[] };

let inflight: Promise<Coin[] | null> | null = null;
let shared: Cached | null = null;

function readCache(): Cached | null {
  if (shared) return shared;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (Array.isArray(parsed?.coins)) {
      shared = parsed;
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Keep the product's own asset order rather than market-cap order. */
function sortToLadder(coins: Coin[]): Coin[] {
  const order = ASSETS.map((a) => a.id);
  return [...coins].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
}

async function fetchMarket(): Promise<Coin[] | null> {
  const cached = readCache();
  if (cached && Date.now() - cached.at < FRESH_MS) return cached.coins;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch(ENDPOINT);
      if (!res.ok) return null;
      const raw = (await res.json()) as Array<Record<string, unknown>>;
      if (!Array.isArray(raw)) return null;

      const coins: Coin[] = [];
      for (const c of raw) {
        const meta = assetByGecko(String(c.id));
        if (!meta) continue;
        coins.push({
          id: meta.id,
          gecko: meta.gecko,
          symbol: meta.symbol,
          name: meta.name,
          price: Number(c.current_price) || 0,
          change24h: Number(c.price_change_percentage_24h) || 0,
          marketCap: Number(c.market_cap) || 0,
          vol24h: Number(c.total_volume) || 0,
          sparkline: Array.isArray((c.sparkline_in_7d as { price?: number[] })?.price)
            ? ((c.sparkline_in_7d as { price: number[] }).price as number[])
                .filter(Number.isFinite)
                .slice(-72)
            : [],
        });
      }
      if (!coins.length) return null;

      shared = { at: Date.now(), coins: sortToLadder(coins) };
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(shared));
      } catch {
        /* ignore */
      }
      return shared.coins;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export type MarketState = {
  coins: Coin[];
  loading: boolean;
  stale: boolean;
  at: number | null;
  refresh: () => void;
};

export function useMarket(pollMs = 60_000): MarketState {
  const initial = readCache();
  const [coins, setCoins] = useState<Coin[]>(initial?.coins ?? []);
  const [at, setAt] = useState<number | null>(initial?.at ?? null);
  const [loading, setLoading] = useState(!initial);
  const [stale, setStale] = useState(false);

  const load = async () => {
    const next = await fetchMarket();
    if (next) {
      setCoins(next);
      setAt(shared?.at ?? Date.now());
      setStale(false);
    } else {
      // Derived from the shared cache, never from captured state, so this
      // cannot be silenced by a closure taken at first render.
      setStale((prev) => prev || (shared?.coins.length ?? 0) > 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    let id = 0;
    const start = () => {
      stop();
      id = window.setInterval(load, pollMs);
    };
    const stop = () => {
      if (id) window.clearInterval(id);
      id = 0;
    };
    const onVis = () => {
      if (document.hidden) stop();
      else {
        load();
        start();
      }
    };
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [pollMs]);

  return { coins, loading, stale, at, refresh: load };
}

/* ── chart history ──────────────────────────────────────────────────────── */

export type Window = "1D" | "1W" | "1M" | "1Y" | "ALL";
export const WINDOWS: Window[] = ["1D", "1W", "1M", "1Y", "ALL"];
const DAYS: Record<Window, string> = { "1D": "1", "1W": "7", "1M": "30", "1Y": "365", ALL: "max" };

export type Point = { t: number; p: number };

const histCache = new Map<string, { at: number; points: Point[] }>();
const HIST_FRESH: Record<Window, number> = {
  "1D": 5 * 60_000,
  "1W": 30 * 60_000,
  "1M": 60 * 60_000,
  "1Y": 6 * 3_600_000,
  ALL: 24 * 3_600_000,
};

/** Thin a long series so a year of data stays cheap to draw. */
function sample(points: Point[], target = 140): Point[] {
  if (points.length <= target) return points;
  const step = points.length / target;
  const out: Point[] = [];
  for (let i = 0; i < target; i++) out.push(points[Math.floor(i * step)]);
  out.push(points[points.length - 1]);
  return out;
}

export function useMarketHistory(gecko: string, win: Window) {
  const key = `${gecko}:${win}`;
  const [points, setPoints] = useState<Point[] | null>(() => histCache.get(key)?.points ?? null);
  const [loading, setLoading] = useState(!histCache.has(key));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const cached = histCache.get(key);
    if (cached && Date.now() - cached.at < HIST_FRESH[win]) {
      setPoints(cached.points);
      setLoading(false);
      setFailed(false);
      return;
    }

    setLoading(true);
    setFailed(false);
    (async () => {
      try {
        const res = await fetch(
          `https://api.coingecko.com/api/v3/coins/${gecko}/market_chart?vs_currency=usd&days=${DAYS[win]}`,
        );
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        const raw: [number, number][] = Array.isArray(data?.prices) ? data.prices : [];
        const next = sample(raw.map(([t, p]) => ({ t, p })).filter((x) => Number.isFinite(x.p)));
        if (cancelled) return;
        if (!next.length) throw new Error("empty");
        histCache.set(key, { at: Date.now(), points: next });
        setPoints(next);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [gecko, win, key]);

  return { points, loading, failed };
}
