import { useId } from "react";

/** Compact 7-day price trace. Tinted by direction, no axes, no chrome. */
export function Sparkline({
  points,
  up,
  width = 96,
  height = 30,
}: {
  points: number[];
  up: boolean;
  width?: number;
  height?: number;
}) {
  const id = useId().replace(/:/g, "");
  if (points.length < 2) return <div style={{ width, height }} aria-hidden />;

  // Sample down so a 168-point series stays cheap to render.
  const step = Math.max(1, Math.floor(points.length / 48));
  const pts = points.filter((_, i) => i % step === 0);
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;

  const coords = pts.map((p, i) => {
    const x = (i / (pts.length - 1)) * width;
    const y = height - ((p - min) / span) * (height - 3) - 1.5;
    return [x, y] as const;
  });

  const line = coords
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${width} ${height} L0 ${height} Z`;
  const stroke = up ? "var(--gain)" : "var(--loss)";

  return (
    <svg width={width} height={height} className="block overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
