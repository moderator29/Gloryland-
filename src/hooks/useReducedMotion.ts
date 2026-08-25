import { useEffect, useState } from "react";
import { useMotionLevel } from "@/context/MotionContext";

/**
 * Whether animation should be suppressed.
 *
 * Two inputs, either of which wins: the operating system preference, and the
 * member's own choice in Settings. Every animated component in the product
 * gates on this single hook, so honouring the in-app control here is what
 * makes that control real.
 */
export function useReducedMotion(): boolean {
  const { level } = useMotionLevel();
  const [osPrefers, setOsPrefers] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setOsPrefers(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return osPrefers || level === "solo";
}
