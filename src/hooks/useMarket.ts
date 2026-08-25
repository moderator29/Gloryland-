import { useEffect, useState } from "react";

/**
 * Live crypto market data.
 *
 * One shared fetch serves every consumer: concurrent callers await the same
 * request and results stay fresh for 45 seconds, so the header ticker and the
 * market panel never hit the endpoint twice for the same figure. The last good
 * response is cached locally so a reload shows real numbers immediately
 * instead of dashes, and `stale` reports when what you are seeing is cached.
 */

export type Coin = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number;
  vol24h: number;
  sparkline: number[];
};

export type MarketState = {
  coins: Coin[];
  loading: boolean;
  /** Showing cached figures because the last refresh failed. */
  stale: boolean;
  /** When the data was last successfully fetched. */
  at: number | null;
  refresh: () => void;
};

const CACHE_KEY = "rgl_market_v1";
const FRESH_MS = 45_000;
const IDS = ["bitcoin", "ethereum", "solana", "tether"];

const ENDPOINT =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=" +
  IDS.join(",") +
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
    if (Array.isArray(parsed.coins)) {
      shared = parsed;
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
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
      const coins: Coin[] = raw.map((c) => ({
        id: String(c.id),
        symbol: String(c.symbol ?? "").toUpperCase(),
        name: String(c.name ?? ""),
        price: Number(c.current_price) || 0,
        change24h: Number(c.price_change_percentage_24h) || 0,
        marketCap: Number(c.market_cap) || 0,
        vol24h: Number(c.total_volume) || 0,
        sparkline: Array.isArray((c.sparkline_in_7d as { price?: number[] })?.price)
          ? ((c.sparkline_in_7d as { price: number[] }).price as number[]).filter(Number.isFinite)
          : [],
      }));
      shared = { at: Date.now(), coins };
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(shared));
      } catch {
        /* ignore */
      }
      return coins;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export function useMarket(pollMs = 60_000): MarketState {
  const initial = readCache();
  const [coins, setCoins] = useState<Coin[]>(initial?.coins ?? []);
  const [at, setAt] = useState<number | null>(initial?.at ?? null);
  const [loading, setLoading] = useState(!initial);
  const [stale, setStale] = useState(false);

  // Derived from the timestamp rather than from captured state: reading `coins`
  // here would close over the first render's empty array and `stale` would
  // never become true after a failed refresh.
  const load = async () => {
    const next = await fetchMarket();
    if (next) {
      setCoins(next);
      setAt(shared?.at ?? Date.now());
      setStale(false);
    } else {
      setStale((prevStale) => prevStale || (shared?.coins.length ?? 0) > 0);
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
    const onVis = () => (document.hidden ? stop() : (load(), start()));
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [pollMs]);

  return { coins, loading, stale, at, refresh: load };
}
