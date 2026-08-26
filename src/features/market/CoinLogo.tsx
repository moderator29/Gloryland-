import type { AssetMeta } from "./assets";

/**
 * Asset logo.
 *
 * This used to layer a remote image over a coloured monogram and fade it in on
 * load, which is what produced the reported glitch: opening the Desk showed a
 * lettered tile for a few hundred milliseconds before the real mark appeared,
 * every time, because a freshly mounted component starts with `loaded` false
 * whether or not the browser already has the file.
 *
 * The marks are now bundled as data URIs, so there is nothing to wait for and
 * no state to hold. The brand colour stays as the tile behind a mark with
 * transparent edges.
 */
export function CoinLogo({
  asset,
  size = 32,
  className = "",
}: {
  asset: AssetMeta;
  size?: number;
  className?: string;
}) {
  return (
    <img
      src={asset.logo}
      alt=""
      aria-hidden
      width={size}
      height={size}
      decoding="sync"
      className={`shrink-0 rounded-full ${className}`}
      style={{ width: size, height: size, background: asset.color }}
    />
  );
}
