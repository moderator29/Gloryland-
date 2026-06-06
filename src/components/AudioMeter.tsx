import { motion } from "framer-motion";

export function AudioMeter({ active }: { active: boolean }) {
  return (
    <span aria-hidden className="inline-flex items-end gap-[2px]">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-[2px] rounded-full bg-primary"
          animate={
            active
              ? {
                  height: ["3px", "10px", "5px", "8px", "3px"],
                }
              : { height: "3px" }
          }
          transition={{
            duration: 1.2,
            repeat: active ? Infinity : 0,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </span>
  );
}
