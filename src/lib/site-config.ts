export const BTC_WALLET = "bc1q9agcjeu40pmtv00dvclkpld0msdkk305z89nx2";

export const BTC_RATE_USD = 78700;

export const PACKAGES = [
  { name: "Starter Plan", price: 2000, daily: 500, spots: 20, taken: 18 },
  { name: "Bronze Plan", price: 3000, daily: 750, spots: 20, taken: 17 },
  { name: "Silver Plan", price: 5000, daily: 1250, spots: 20, taken: 16 },
  { name: "Gold Plan", price: 10000, daily: 2200, spots: 20, taken: 15 },
  { name: "Legendary Plan", price: 20000, daily: 5000, spots: 20, taken: 12 },
  { name: "Immortal Plan", price: 40000, daily: 9000, spots: 20, taken: 14 },
] as const;

export const REVENUE_STREAMS = [
  { label: "Netflix Deal", value: "$18.5M", icon: "video" },
  { label: "Film Royalties", value: "$12.2M", icon: "film" },
  { label: "Studio Contract", value: "$9.8M", icon: "monitor" },
  { label: "Brand Deals", value: "$6.4M", icon: "trending" },
] as const;
