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
  /** Chain the deposit address belongs to. */
  network: string;
  /** Trust Wallet asset logo. */
  logo: string;
  color: string;
  address: string;
  /** Decimals shown for a unit price. */
  priceDecimals: number;
  /** Compact chain label for tight tiles. */
  short: string;
};

const TW = "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains";

export const ASSETS: AssetMeta[] = [
  {
    id: "btc",
    gecko: "bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
    network: "Bitcoin",
    logo: `${TW}/bitcoin/info/logo.png`,
    color: "#F7931A",
    address: "bc1q9agcjeu40pmtv00dvclkpld0msdkk305z89nx2",
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
    address: "0x8Ba1f109551bD432803012645Ac136ddd64DBA72",
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
    address: "0x8Ba1f109551bD432803012645Ac136ddd64DBA72",
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
    address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
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
    address: "0x8Ba1f109551bD432803012645Ac136ddd64DBA72",
    priceDecimals: 2,
    short: "BEP-20",
  },
];

export const assetById = (id: AssetId) => ASSETS.find((a) => a.id === id);
export const assetByGecko = (g: string) => ASSETS.find((a) => a.gecko === g);
export const GECKO_IDS = ASSETS.map((a) => a.gecko);
