import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BrandLockup } from "@/components/BrandLogo";

const KEY = "hal_curtain_seen_v1";

export function CurtainReveal() {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(KEY)) {
        setOpen(false);
        return;
      }
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    const id = window.setTimeout(() => setOpen(false), 1600);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 z-[200] pointer-events-auto"
        >
          <motion.div
            initial={{ x: 0 }}
            animate={{ x: "-100%" }}
            transition={{ duration: 1.1, ease: [0.65, 0, 0.35, 1], delay: 0.5 }}
            className="absolute inset-y-0 left-0 w-1/2 bg-[#080d16]"
          >
            <div
              className="absolute right-0 top-0 h-full w-px"
              style={{
                background: "linear-gradient(180deg, transparent, #E8C25C, transparent)",
                boxShadow: "0 0 24px 2px rgba(232,194,92,0.6)",
              }}
            />
          </motion.div>
          <motion.div
            initial={{ x: 0 }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.1, ease: [0.65, 0, 0.35, 1], delay: 0.5 }}
            className="absolute inset-y-0 right-0 w-1/2 bg-[#080d16]"
          >
            <div
              className="absolute left-0 top-0 h-full w-px"
              style={{
                background: "linear-gradient(180deg, transparent, #E8C25C, transparent)",
                boxShadow: "0 0 24px 2px rgba(232,194,92,0.6)",
              }}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.3, times: [0, 0.4, 1] }}
            className="absolute inset-0 grid place-items-center"
          >
            <BrandLockup size={92} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
