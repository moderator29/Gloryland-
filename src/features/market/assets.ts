/**
 * The five assets the platform funds with.
 *
 * Logos come from the Trust Wallet assets repository, which serves a canonical
 * PNG per contract address. Each entry keeps a brand colour so a logo that
 * fails to load falls back to a tinted monogram rather than a broken image.
 */

export type AssetId = "btc" | "eth" | "usdt" | "sol" | "bnb";

export type AssetMeta = {
  id: AssetId;
  /** CoinGecko id, used for prices and charts. */
  gecko: string;
  symbol: string;
  name: string;
  /** Chain a deposit would arrive on. */
  network: string;
  /** Trust Wallet asset logo. */
  logo: string;
  color: string;
  /**
   * The address a member would fund with, or null when none is configured.
   *
   * Null is the default and the honest state. This build has no custody: there
   * is no wallet behind the product and nothing that could receive a transfer.
   * The addresses that used to sit here were valid and copyable, and three of
   * the five were the same well known documentation example, so anyone who
   * followed the interface would have sent funds to an address nobody owns.
   *
   * They are now read from the environment at build time and are absent unless
   * a real one is set, so the surfaces show a plain "funding is not open" state
   * rather than a string that looks like a destination.
   */
  address: string | null;
  /** Decimals shown for a unit price. */
  priceDecimals: number;
  /** Compact chain label for tight tiles. */
  short: string;
};

const TW = "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains";

/**
 * A configured deposit address, or null.
 *
 * Trimmed and length checked, because an empty or placeholder value in the
 * environment must read as "not configured" rather than as an address.
 *
 * The value is read through a thunk so the `import.meta.env.VITE_X` text stays
 * intact for the bundler to inline, and the read is wrapped because this module
 * is also imported by the serverless handlers, where that object does not exist
 * at all.
 */
function configured(read: () => string | undefined): string | null {
  try {
    const v = (read() ?? "").trim();
    return v.length >= 20 ? v : null;
  } catch {
    return null;
  }
}

export const ASSETS: AssetMeta[] = [
  {
    id: "btc",
    gecko: "bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
    network: "Bitcoin",
    logo: `${TW}/bitcoin/info/logo.png`,
    color: "#F7931A",
    address: configured(() => import.meta.env.VITE_ADDR_BTC),
    priceDecimals: 0,
    short: "Bitcoin",
  },
  {
    id: "eth",
    gecko: "ethereum",
    symbol: "ETH",
    name: "Ethereum",
    network: "Ethereum",
    logo: `${TW}/ethereum/info/logo.png`,
    color: "#627EEA",
    address: configured(() => import.meta.env.VITE_ADDR_ETH),
    priceDecimals: 0,
    short: "Ethereum",
  },
  {
    id: "usdt",
    gecko: "tether",
    symbol: "USDT",
    name: "Tether",
    network: "Ethereum (ERC-20)",
    logo: `${TW}/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png`,
    color: "#26A17B",
    address: configured(() => import.meta.env.VITE_ADDR_USDT),
    priceDecimals: 4,
    short: "ERC-20",
  },
  {
    id: "sol",
    gecko: "solana",
    symbol: "SOL",
    name: "Solana",
    network: "Solana",
    logo: `${TW}/solana/info/logo.png`,
    color: "#14F195",
    address: configured(() => import.meta.env.VITE_ADDR_SOL),
    priceDecimals: 2,
    short: "Solana",
  },
  {
    id: "bnb",
    gecko: "binancecoin",
    symbol: "BNB",
    name: "BNB",
    network: "BNB Smart Chain (BEP-20)",
    logo: `${TW}/smartchain/info/logo.png`,
    color: "#F3BA2F",
    address: configured(() => import.meta.env.VITE_ADDR_BNB),
    priceDecimals: 2,
    short: "BEP-20",
  },
];

export const assetById = (id: AssetId) => ASSETS.find((a) => a.id === id);
export const assetByGecko = (g: string) => ASSETS.find((a) => a.gecko === g);
export const GECKO_IDS = ASSETS.map((a) => a.gecko);
