import confetti from "canvas-confetti";

const GOLD = ["#FFD700", "#FFF7C2", "#E5B947", "#B8842B"];

export function goldDust(x: number, y: number) {
  confetti({
    particleCount: 16,
    spread: 30,
    startVelocity: 18,
    decay: 0.92,
    scalar: 0.45,
    origin: {
      x: x / window.innerWidth,
      y: y / window.innerHeight,
    },
    colors: GOLD,
    ticks: 90,
  });
}

const TIER_PALETTE: Record<string, string[]> = {
  "Starter Plan": ["#cbd5e1", "#94a3b8", "#f1f5f9"],
  "Bronze Plan": ["#fde68a", "#a16207", "#fb923c", "#fed7aa"],
  "Silver Plan": ["#f1f5f9", "#94a3b8", "#cbd5e1", "#e5e7eb"],
  "Gold Plan": GOLD,
  "Legendary Plan": ["#f3e8ff", "#a855f7", "#6b21a8", "#c084fc"],
  "Immortal Plan": ["#ffffff", "#FFD700", "#FFF7C2", "#fef3c7"],
};

export function tierConfetti(tier: string, origin?: { x: number; y: number }) {
  const palette = TIER_PALETTE[tier] ?? GOLD;
  const o = origin ?? { x: 0.5, y: 0.5 };
  confetti({
    particleCount: 110,
    spread: 80,
    startVelocity: 44,
    decay: 0.92,
    scalar: 1,
    origin: o,
    colors: palette,
    ticks: 240,
  });
  if (tier === "Immortal Plan") {
    setTimeout(() => {
      confetti({
        particleCount: 220,
        spread: 160,
        startVelocity: 22,
        decay: 0.96,
        gravity: 0.4,
        scalar: 0.6,
        origin: { x: 0.5, y: 0 },
        colors: palette,
        ticks: 360,
      });
    }, 200);
  }
}
