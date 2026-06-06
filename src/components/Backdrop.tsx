import { motion } from "framer-motion";

export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(191,149,63,0.10),_transparent_55%)]" />

      <motion.div
        className="absolute -left-40 top-10 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,_rgba(212,175,55,0.22),_transparent_60%)] blur-3xl"
        animate={{ x: [0, 120, 0], y: [0, 80, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-40 top-1/3 h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle,_rgba(252,246,186,0.14),_transparent_60%)] blur-3xl"
        animate={{ x: [0, -100, 0], y: [0, 60, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-32 left-1/4 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,_rgba(179,135,40,0.18),_transparent_60%)] blur-3xl"
        animate={{ x: [0, 80, 0], y: [0, -70, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute left-1/2 top-1/2 h-[60rem] w-[60rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.06]"
        style={{
          background:
            "conic-gradient(from 0deg, transparent, #BF953F, transparent, #FCF6BA, transparent)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      />

      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,_transparent_0%,_rgba(0,0,0,0.4)_100%)]" />

      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
    </div>
  );
}
