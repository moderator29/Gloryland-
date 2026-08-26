/**
 * The five coin marks, bundled rather than fetched.
 *
 * These were remote URLs into the Trust Wallet assets repository, and that is
 * what produced the flash the Desk was reported for: the tile painted with its
 * fallback monogram, the PNG arrived a few hundred milliseconds later, and the
 * logo appeared to swap in. On a remount, which is every time the Desk opens,
 * it happened again even though the image was already in the browser cache,
 * because a fresh component had no way to know that.
 *
 * They are now 64px WebP, about 7kB for all five, inlined into the bundle by
 * the rule in `vite.config.ts`. There is no request to make, so there is no
 * window in which the fallback can show. It also means the marks render with
 * no network at all, and that nobody outside the deployment learns which asset
 * a member opened.
 *
 * Downscaled from the 256px originals in the Trust Wallet assets repository,
 * which is the canonical source for these marks.
 */
import btc from "@/assets/coins/btc.webp";
import eth from "@/assets/coins/eth.webp";
import usdt from "@/assets/coins/usdt.webp";
import sol from "@/assets/coins/sol.webp";
import bnb from "@/assets/coins/bnb.webp";

export const LOGOS = { btc, eth, usdt, sol, bnb } as const;
