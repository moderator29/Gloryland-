import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";

type Props = {
  front: ReactNode;
  back: ReactNode;
  onClick?: () => void;
  size?: number;
};

export function CoinFlipButton({ front, back, onClick, size = 64 }: Props) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      onClick={() => {
        setFlipped((f) => !f);
        onClick?.();
      }}
      className="relative"
      style={{ perspective: 800, width: size, height: size }}
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0"
        style={{ transformStyle: "preserve-3d" }}
      >
        <div className="btn-coin absolute inset-0" style={{ backfaceVisibility: "hidden" }}>
          {front}
        </div>
        <div
          className="btn-coin absolute inset-0"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          {back}
        </div>
      </motion.div>
    </button>
  );
}
