export const BTC_WALLET = "bc1q9agcjeu40pmtv00dvclkpld0msdkk305z89nx2";

export const BTC_RATE_USD = 78700;

/**
 * Brand identity. Single source of truth for every surface, so a rename is a
 * one-line change here rather than a sweep across the app.
 */
export const BRAND_NAME = "Halcyon";
export const BRAND_TAGLINE = "Investments";
export const BRAND_FULL = `${BRAND_NAME} ${BRAND_TAGLINE}`;
export const BRAND_DOMAIN = "halcyon.investments";
export const BRAND_SLUG = "halcyon-investments";

export const PACKAGES = [
  { name: "Starter Plan", price: 40000, daily: 10000, spots: 20, taken: 14 },
  { name: "Bronze Plan", price: 60000, daily: 15000, spots: 30, taken: 15 },
  { name: "Silver Plan", price: 80000, daily: 20000, spots: 20, taken: 10 },
  { name: "Gold Plan", price: 100000, daily: 22000, spots: 30, taken: 19 },
  { name: "Legendary Plan", price: 200000, daily: 50000, spots: 30, taken: 22 },
  { name: "Immortal Plan", price: 300000, daily: 68000, spots: 20, taken: 12 },
  { name: "Platinum Plan", price: 500000, daily: 150000, spots: 30, taken: 17 },
] as const;

/**
 * The music revenue streams the portfolio earns from.
 * `icon` maps to a lucide-react component in `components/RevenueStreams.tsx`.
 */
export const REVENUE_STREAMS = [
  {
    icon: "mic",
    label: "Concerts and touring",
    blurb: "Ticket sales, appearance fees and performance guarantees.",
  },
  {
    icon: "streaming",
    label: "Music streaming",
    blurb: "Spotify, Apple Music, YouTube and other major platforms.",
  },
  {
    icon: "disc",
    label: "Music sales",
    blurb: "Digital downloads, albums, CDs and vinyl.",
  },
  {
    icon: "radio",
    label: "Radio royalties",
    blurb: "Royalties earned when songs are played on radio.",
  },
  {
    icon: "pen",
    label: "Songwriting royalties",
    blurb: "Earned on every track written and co-written in house.",
  },
  {
    icon: "screen",
    label: "TV, film and media",
    blurb: "Performances, interviews and acting appearances.",
  },
  {
    icon: "handshake",
    label: "Brand sponsorships",
    blurb: "Endorsement partnerships with global companies.",
  },
  {
    icon: "merch",
    label: "Merchandise",
    blurb: "Clothing, hats, signed items and branded products.",
  },
  {
    icon: "publishing",
    label: "Publishing rights",
    blurb: "Income from owning and licensing the music catalogue.",
  },
] as const;

export type RevenueStream = (typeof REVENUE_STREAMS)[number];
