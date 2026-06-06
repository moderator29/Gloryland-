import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";

export function ReserveStickyPill({
  onClick,
  label = "Reserve a seat",
}: {
  onClick?: () => void;
  label?: string;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 220);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          onClick={onClick}
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 24 }}
          className="btn-foil fixed bottom-[5.5rem] left-1/2 z-30 max-w-[80vw] -translate-x-1/2 truncate px-4 py-2.5 text-xs sm:bottom-24 sm:px-5 sm:py-3 sm:text-sm"
        >
          <span className="inline-flex items-center gap-2">
            {label}
            <ArrowRight className="h-4 w-4" />
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
