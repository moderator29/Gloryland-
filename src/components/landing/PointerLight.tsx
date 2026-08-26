import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * A soft light that tracks the pointer across the surface it sits in.
 *
 * It listens on its own parent rather than taking a ref, so any positioned
 * surface picks it up by dropping it in as a child. Fine pointers only: on a
 * touch screen the light would stick wherever the last tap landed, which
 * reads as a rendering fault rather than a highlight.
 *
 * The negative z-index puts it above the host's painted background and below
 * the host's content, which is the same slot the glass stride occupies.
 */
export function PointerLight({
  size = 460,
  tint = "rgba(92,171,255,0.15)",
}: {
  size?: number;
  tint?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const lit = useMotionValue(0);

  // Spring the position so the light trails the cursor instead of snapping to
  // it, which is what makes it read as light rather than as a sprite.
  const sx = useSpring(x, { stiffness: 90, damping: 22, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 90, damping: 22, mass: 0.6 });
  const opacity = useSpring(lit, { stiffness: 60, damping: 20 });

  useEffect(() => {
    if (reduce) return;
    const host = ref.current?.parentElement;
    if (!host) return;
    if (typeof window.matchMedia !== "function") return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const move = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      x.set(e.clientX - r.left);
      y.set(e.clientY - r.top);
      lit.set(1);
    };
    const leave = () => lit.set(0);

    host.addEventListener("pointermove", move);
    host.addEventListener("pointerleave", leave);
    return () => {
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
    };
  }, [reduce, x, y, lit]);

  if (reduce) return null;

  return (
    <motion.div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-0 -z-10 rounded-full"
      style={{
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        background: `radial-gradient(circle, ${tint} 0%, transparent 68%)`,
        x: sx,
        y: sy,
        opacity,
      }}
    />
  );
}
