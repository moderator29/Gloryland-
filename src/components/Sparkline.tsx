import { Area, AreaChart, ResponsiveContainer } from "recharts";

const POINTS = [
  18, 20, 19, 22, 24, 23, 26, 28, 27, 31, 33, 30, 34,
  36, 39, 38, 41, 44, 43, 47, 49, 52, 55, 60,
].map((y, i) => ({ x: i, y }));

export function Sparkline({ height = 70 }: { height?: number }) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={POINTS} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gold-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FCF6BA" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#BF953F" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gold-stroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#BF953F" />
              <stop offset="50%" stopColor="#FCF6BA" />
              <stop offset="100%" stopColor="#B38728" />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="y"
            stroke="url(#gold-stroke)"
            strokeWidth={2}
            fill="url(#gold-fill)"
            isAnimationActive
            animationDuration={1400}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
