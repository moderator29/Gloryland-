/** Type-safe access to the loosely typed data recharts hands back. */

/** Narrow the untyped recharts tooltip payload down to one of our data points. */
export function pointOf<T>(payload: unknown, guard: (v: unknown) => v is T): T | null {
  if (!Array.isArray(payload) || payload.length === 0) return null;
  const inner = (payload[0] as { payload?: unknown })?.payload;
  return guard(inner) ? inner : null;
}
