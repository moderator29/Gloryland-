import { motion } from "framer-motion";

export function FrameLight() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[5] overflow-hidden">
      <motion.div
        className="absolute inset-0"
        animate={{ opacity: [0.18, 0.32, 0.18] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background:
            "radial-gradient(120% 60% at 50% -10%, rgba(212,175,55,0.18), transparent 60%), radial-gradient(120% 60% at 50% 110%, rgba(212,175,55,0.14), transparent 60%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(212,175,55,0.10), transparent 8%, transparent 92%, rgba(212,175,55,0.10))",
        }}
      />
    </div>
  );
}
