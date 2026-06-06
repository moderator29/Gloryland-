export type CryptoAsset = {
  key: "BTC" | "USDT" | "ETH" | "SOL";
  label: string;
  network: string;
  rateUsd: number;
  decimals: number;
  color: string;
  address: string;
};

import { BTC_WALLET, BTC_RATE_USD } from "@/lib/site-config";

export const ASSETS: CryptoAsset[] = [
  {
    key: "BTC",
    label: "Bitcoin",
    network: "BTC mainnet",
    rateUsd: BTC_RATE_USD,
    decimals: 6,
    color: "#f7931a",
    address: BTC_WALLET,
  },
  {
    key: "USDT",
    label: "Tether",
    network: "TRC20",
    rateUsd: 1,
    decimals: 2,
    color: "#26a17b",
    address: "TJDENsfBJs4RFETt1X1W8wMDc8M5XnJhCe",
  },
  {
    key: "ETH",
    label: "Ethereum",
    network: "ERC20",
    rateUsd: 3450,
    decimals: 5,
    color: "#627eea",
    address: "0x9aA3c7C8f5b2dE0a1A1Ab73A6c7F8e3bE2a04d4c",
  },
  {
    key: "SOL",
    label: "Solana",
    network: "Solana",
    rateUsd: 180,
    decimals: 4,
    color: "#14F195",
    address: "FwR3PbjS5iyqzLiLugrBqKSa5EKZ4vK9SKsW7sQ4w8mE",
  },
];
