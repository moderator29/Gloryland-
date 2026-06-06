import { useEffect, useRef, useState } from "react";

export function GoldRail() {
  const [pct, setPct] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      if (raf.current) return;
      raf.current = window.requestAnimationFrame(() => {
        const h = document.documentElement;
        const max = h.scrollHeight - h.clientHeight;
        setPct(max <= 0 ? 0 : Math.min(1, h.scrollTop / max));
        raf.current = 0;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[55] hidden h-screen w-1 md:block"
      style={{
        background: "linear-gradient(180deg, transparent, rgba(255,215,0,0.12), transparent)",
      }}
    >
      <div
        className="absolute left-0 top-0 w-full"
        style={{
          height: `${pct * 100}%`,
          background: "linear-gradient(180deg, #FFD700, #FFF7C2, #B8842B)",
          boxShadow: "0 0 14px 1px rgba(255,215,0,0.6)",
        }}
      />
    </div>
  );
}
