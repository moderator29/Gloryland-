export function haptic(pattern: number | number[] = 8) {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}

export const tap = () => haptic(6);
export const success = () => haptic([10, 30, 12]);
export const warn = () => haptic([20, 40, 20]);
