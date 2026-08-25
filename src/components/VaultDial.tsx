import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function VaultDial({ trigger }: { trigger: string }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    setShow(true);
    const id = window.setTimeout(() => setShow(false), 1100);
    return () => window.clearTimeout(id);
  }, [trigger]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-[120] grid place-items-center"
        >
          <div className="relative h-44 w-44">
            <div className="vault-dial absolute inset-0" />
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1, 1.4], opacity: [0, 1, 0] }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-8 rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(232,194,92,0.6), transparent 70%)",
              }}
            />
            <div
              className="absolute left-1/2 top-1/2 h-1 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                background: "linear-gradient(90deg, transparent, #E8C25C, transparent)",
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
