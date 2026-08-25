import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Mic2, Handshake, AudioLines, Library, Radio } from "lucide-react";

const EVENTS = [
  { date: "2026 Q2", icon: Mic2, label: "Summer arena run confirmed" },
  { date: "2026 Q1", icon: Handshake, label: "Sponsorship wave two signed" },
  { date: "2025 Q4", icon: AudioLines, label: "Streaming catalogue renewal" },
  { date: "2025 Q3", icon: Library, label: "Publishing rights acquisition closed" },
  { date: "2025 Q2", icon: Radio, label: "Festival headline slots locked" },
];

export function RevenueTimeline() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });

  return (
    <div ref={ref} className="glass-luxury p-5">
      <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        Revenue Timeline
      </p>

      <div className="relative mt-4 pl-6">
        <motion.div
          initial={{ scaleY: 0 }}
          animate={inView ? { scaleY: 1 } : {}}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          className="absolute left-2 top-1 h-full w-px origin-top"
          style={{ background: "linear-gradient(180deg, #E8C25C, transparent)" }}
        />
        <ul className="space-y-4">
          {EVENTS.map((e, i) => {
            const Icon = e.icon;
            return (
              <motion.li
                key={e.label}
                initial={{ opacity: 0, x: 12 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.12 }}
                className="relative flex items-start gap-3"
              >
                <span
                  className="absolute -left-[18px] mt-1 grid h-3 w-3 place-items-center rounded-full bg-primary"
                  style={{ boxShadow: "0 0 12px 2px rgba(232,194,92,0.6)" }}
                />
                <Icon className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.6} />
                <div className="flex-1">
                  <p className="font-numeric text-[10px] uppercase tracking-wider text-muted-foreground">
                    {e.date}
                  </p>
                  <p className="text-sm text-white">{e.label}</p>
                </div>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
