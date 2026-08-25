import { useEffect, useRef, useState } from "react";

/**
 * Measures the element the ref is attached to. Charts use it to decide what
 * they can afford to draw: at phone widths axis ticks are thinned or dropped
 * entirely rather than allowed to collide or clip.
 */
export function useContainerWidth<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, width };
}
