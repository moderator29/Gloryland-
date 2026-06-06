import { motion } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
};

export function LiquidMorphButton({ children, onClick, className = "" }: Props) {
  return (
    <div style={{ filter: "url(#goo)" }} className="inline-block">
      <motion.button
        onClick={onClick}
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.04 }}
        transition={{ type: "spring", stiffness: 360, damping: 16 }}
        className={`btn-foil-hover relative px-6 py-3 text-sm ${className}`}
      >
        {children}
      </motion.button>
    </div>
  );
}
