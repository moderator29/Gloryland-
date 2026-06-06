import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function PortraitGlow({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto h-28 w-28">
      <motion.div
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, rgba(252,246,186,0.55) 60deg, transparent 140deg)",
          filter: "blur(8px)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        aria-hidden
        className="absolute -inset-2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(212,175,55,0.35), transparent 70%)",
          filter: "blur(10px)",
        }}
        animate={{ opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative h-full w-full overflow-hidden rounded-full ring-2 ring-primary/60 ring-offset-4 ring-offset-background">
        {children}
      </div>
    </div>
  );
}
