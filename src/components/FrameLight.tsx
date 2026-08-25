import { motion } from "framer-motion";

export function FrameLight() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[5] overflow-hidden">
      <motion.div
        className="absolute inset-0 hidden md:block"
        animate={{ opacity: [0.14, 0.22, 0.14] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background:
            "radial-gradient(120% 60% at 50% -10%, rgba(201,162,39,0.16), transparent 60%), radial-gradient(120% 60% at 50% 110%, rgba(201,162,39,0.12), transparent 60%)",
        }}
      />
    </div>
  );
}
