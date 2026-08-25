import { useId } from "react";

/**
 * The Rigel aperture.
 *
 * Six blades closing on a luminous core: a vault mechanism, a lens, and the
 * starburst the company is named for, in one mark. Drawn from geometry rather
 * than a traced path so it stays exact at any size, and deliberately built
 * from few, wide shapes so the silhouette survives at favicon scale.
 */

const point = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return `${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`;
};

/** Six trapezoid blades, splayed around the centre. */
const BLADES = Array.from({ length: 6 }, (_, i) => {
  const s = i * 60 - 90;
  const e = s + 46;
  return `M ${point(23, s)} L ${point(45, s + 6)} L ${point(45, e)} L ${point(23, e - 6)} Z`;
}).join(" ");

export function Mark({
  size = 32,
  className = "",
  glow = true,
}: {
  size?: number;
  className?: string;
  glow?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const blade = `${uid}-blade`;
  const core = `${uid}-core`;
  const soft = `${uid}-soft`;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`block shrink-0 ${className}`}
      role="img"
      aria-label="Rigel"
    >
      <defs>
        <linearGradient id={blade} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#8FDCFF" />
          <stop offset="42%" stopColor="#2E8BFF" />
          <stop offset="100%" stopColor="#1636A0" />
        </linearGradient>
        <radialGradient id={core}>
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="40%" stopColor="#7DD3FC" />
          <stop offset="100%" stopColor="#2E8BFF" />
        </radialGradient>
        {glow && (
          <filter id={soft} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>

      <g filter={glow ? `url(#${soft})` : undefined}>
        <path d={BLADES} fill={`url(#${blade})`} />
        <circle cx="50" cy="50" r="12" fill={`url(#${core})`} />
        {/* star glint: the mark is named for a star, so the core carries one */}
        <path
          d="M50 39 L52.2 47.8 L61 50 L52.2 52.2 L50 61 L47.8 52.2 L39 50 L47.8 47.8 Z"
          fill="#FFFFFF"
          opacity="0.9"
        />
      </g>
    </svg>
  );
}

/** Mark plus wordmark. `stacked` centres them for hero and splash use. */
export function Wordmark({
  size = 30,
  className = "",
  stacked = false,
  tagline = false,
}: {
  size?: number;
  className?: string;
  stacked?: boolean;
  tagline?: boolean;
}) {
  return (
    <span
      className={`inline-flex ${stacked ? "flex-col items-center gap-3" : "items-center gap-2.5"} ${className}`}
    >
      <Mark size={stacked ? size * 2.2 : size} />
      <span className={`flex flex-col ${stacked ? "items-center" : ""} leading-none`}>
        <span
          className="font-semibold text-[var(--text-hi)]"
          style={{ fontSize: size * 0.66, letterSpacing: "0.24em", paddingLeft: "0.24em" }}
        >
          RIGEL
        </span>
        {tagline && (
          <span
            className="mt-1.5 text-[var(--accent-soft)]"
            style={{ fontSize: size * 0.27, letterSpacing: "0.4em", paddingLeft: "0.4em" }}
          >
            CAPITAL
          </span>
        )}
      </span>
    </span>
  );
}
