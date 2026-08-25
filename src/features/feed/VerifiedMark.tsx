import { useId } from "react";

/**
 * The Signal publisher mark.
 *
 * Drawn from the same geometry as the rest of the brand rather than borrowed
 * from anywhere else: a six sided plate, matching the six blades of the Rigel
 * aperture and the six rungs of the tier ladder, with a check cut through it
 * and a hairline of brand light along the upper left edge. It is deliberately
 * not a scalloped disc, which is another platform's badge, and it is not sold
 * to members: nobody can buy this mark, because only Rigel publishes.
 *
 * Pure geometry, no external asset, and it survives down to 12px because the
 * silhouette is one wide shape.
 */
export function VerifiedMark({
  size = 15,
  className = "",
  title = "Verified publisher",
}: {
  size?: number;
  className?: string;
  /** Accessible name. Set to an empty string when the label is next to it. */
  title?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const plate = `${uid}-plate`;
  const decorative = title.length === 0;

  // Pointy top hexagon on a 24 unit grid, centred on 12,12.
  const hex = "M12 1.4 L20.2 6.2 L20.2 17.8 L12 22.6 L3.8 17.8 L3.8 6.2 Z";

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`inline-block shrink-0 align-[-0.14em] ${className}`}
      role={decorative ? "presentation" : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : title}
    >
      <defs>
        <linearGradient id={plate} x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="var(--accent-soft)" />
          <stop offset="45%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--accent-deep)" />
        </linearGradient>
      </defs>

      <path d={hex} fill={`url(#${plate})`} />
      {/* Edge light: the same hairline the panels use, at icon scale. */}
      <path
        d="M12 1.4 L3.8 6.2 L3.8 13"
        fill="none"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M7.9 12.1 L10.8 15 L16.2 8.9"
        fill="none"
        stroke="#04101f"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
