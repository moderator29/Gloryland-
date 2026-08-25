import { motion } from "framer-motion";
import { useEffect, useState } from "react";

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = () => setMobile(mq.matches);
    handler();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return mobile;
}

export function Backdrop() {
  const mobile = useIsMobile();

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(179,144,47,0.1),_transparent_55%)]" />

      <motion.div
        className="absolute -left-40 top-10 h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,_rgba(201,162,39,0.18),_transparent_60%)] blur-2xl md:h-[34rem] md:w-[34rem] md:blur-3xl"
        animate={mobile ? undefined : { x: [0, 120, 0], y: [0, 80, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-40 top-1/3 h-[22rem] w-[22rem] rounded-full bg-[radial-gradient(circle,_rgba(36,64,111,0.28),_transparent_62%)] blur-2xl md:h-[32rem] md:w-[32rem] md:blur-3xl"
        animate={mobile ? undefined : { x: [0, -100, 0], y: [0, 60, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-8rem] left-1/4 h-[20rem] w-[20rem] rounded-full bg-[radial-gradient(circle,_rgba(36,64,111,0.22),_transparent_60%)] blur-2xl md:h-[28rem] md:w-[28rem] md:blur-3xl"
        animate={mobile ? undefined : { x: [0, 80, 0], y: [0, -50, 0] }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
      />

      {!mobile && (
        <motion.div
          className="absolute left-1/2 top-1/2 h-[60rem] w-[60rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.05]"
          style={{
            background:
              "conic-gradient(from 0deg, transparent, #B3902F, transparent, #24406F, transparent, #F4E3AC, transparent)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
        />
      )}

      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,_transparent_0%,_rgba(0,0,0,0.4)_100%)]" />
    </div>
  );
}
