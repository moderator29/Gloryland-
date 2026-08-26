/**
 * The five assets the platform funds with.
 *
 * Logos are bundled, not fetched. See `logos.ts` for why. Each entry keeps a
 * brand colour anyway, because it is also the tint behind the mark and the
 * accent the asset is drawn in elsewhere.
 */

import { LOGOS } from "./logos";

export type AssetId = "btc" | "eth" | "usdt" | "sol" | "bnb";

export type AssetMeta = {
  id: AssetId;
  /** CoinGecko id, used for prices and charts. */
  gecko: string;
  symbol: string;
  name: string;
  /** Chain a deposit would arrive on. */
  network: string;
  /** Bundled brand mark, inlined into the bundle as a data URI. */
  logo: string;
  color: string;
  /**
   * The address a member funds with.
   *
   * These are the platform's own receiving addresses, supplied by the founder
   * and pinned by an assertion in `src/lib/qr.check.ts` so a stray edit to this
   * file fails the build rather than quietly rerouting deposits. They were
   * briefly read from the environment, during the period when the product had
   * no wallet behind it at all and printing anything here would have been a
   * destination nobody owned.
   *
   * Three of the five are the same address, which is correct and not a copy
   * paste: ETH, USDT on ERC-20 and BNB on BEP-20 are all EVM chains, and one
   * key receives on all of them. The network label next to the address is
   * therefore load bearing, because sending an asset on the wrong chain to a
   * right looking address is the most common way funds are lost.
   */
  address: string;
  /** Decimals shown for a unit price. */
  priceDecimals: number;
  /** Compact chain label for tight tiles. */
  short: string;
};

export const ASSETS: AssetMeta[] = [
  {
    id: "btc",
    gecko: "bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
    network: "Bitcoin",
    logo: LOGOS.btc,
    color: "#F7931A",
    address: "bc1qn9wf60cha6a4h4dfsslutksvv04amlz6hwmch0",
    priceDecimals: 0,
    short: "Bitcoin",
  },
  {
    id: "eth",
    gecko: "ethereum",
    symbol: "ETH",
    name: "Ethereum",
    network: "Ethereum",
    logo: LOGOS.eth,
    color: "#627EEA",
    address: "0xa6594edf7415f5dcf599c3249fbf2ab948978799",
    priceDecimals: 0,
    short: "Ethereum",
  },
  {
    id: "usdt",
    gecko: "tether",
    symbol: "USDT",
    name: "Tether",
    network: "Ethereum (ERC-20)",
    logo: LOGOS.usdt,
    color: "#26A17B",
    address: "0xa6594edf7415f5dcf599c3249fbf2ab948978799",
    priceDecimals: 4,
    short: "ERC-20",
  },
  {
    id: "sol",
    gecko: "solana",
    symbol: "SOL",
    name: "Solana",
    network: "Solana",
    logo: LOGOS.sol,
    color: "#14F195",
    address: "EHwKKSQcJQSbTxKKdbzzbMQUVZQZGiiD1GcUVYdCPsCc",
    priceDecimals: 2,
    short: "Solana",
  },
  {
    id: "bnb",
    gecko: "binancecoin",
    symbol: "BNB",
    name: "BNB",
    network: "BNB Smart Chain (BEP-20)",
    logo: LOGOS.bnb,
    color: "#F3BA2F",
    address: "0xa6594edf7415f5dcf599c3249fbf2ab948978799",
    priceDecimals: 2,
    short: "BEP-20",
  },
];

export const assetById = (id: AssetId) => ASSETS.find((a) => a.id === id);
export const assetByGecko = (g: string) => ASSETS.find((a) => a.gecko === g);
export const GECKO_IDS = ASSETS.map((a) => a.gecko);
