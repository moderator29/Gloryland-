import confetti from "canvas-confetti";

const GOLD = ["#B3902F", "#F4E3AC", "#A07C22", "#c9a227", "#f8edc8"];

export function goldBurst(origin?: { x: number; y: number }) {
  const o = origin ?? { x: 0.5, y: 0.55 };
  confetti({
    particleCount: 90,
    spread: 75,
    startVelocity: 42,
    decay: 0.92,
    scalar: 0.95,
    origin: o,
    colors: GOLD,
    ticks: 220,
  });
  setTimeout(() => {
    confetti({
      particleCount: 50,
      spread: 110,
      startVelocity: 28,
      decay: 0.94,
      scalar: 0.7,
      origin: o,
      colors: GOLD,
      ticks: 220,
    });
  }, 140);
}
