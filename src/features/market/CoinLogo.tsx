import { useState } from "react";
import type { AssetMeta } from "./assets";

/**
 * Asset logo, layered over its own fallback.
 *
 * The monogram is always rendered underneath and the remote image sits on top,
 * so a slow, blocked or failed CDN shows a branded tile instead of an empty
 * circle, with no flash when the image does arrive.
 */
export function CoinLogo({ asset, size = 32 }: { asset: AssetMeta; size?: number }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <span
      className="relative grid shrink-0 place-items-center overflow-hidden rounded-full"
      style={{ width: size, height: size, background: asset.color }}
      aria-hidden
    >
      <span
        className="absolute inset-0 grid place-items-center font-bold text-[#04101f]"
        style={{ fontSize: size * 0.34, letterSpacing: "-0.02em" }}
      >
        {asset.symbol.slice(0, 3)}
      </span>

      {!failed && (
        <img
          src={asset.logo}
          crossOrigin="anonymous"
          alt=""
          width={size}
          height={size}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full rounded-full transition-opacity"
          style={{ opacity: loaded ? 1 : 0 }}
        />
      )}
    </span>
  );
}
