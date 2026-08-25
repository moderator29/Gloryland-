import { motion } from "framer-motion";
import {
  Mic2,
  AudioLines,
  Disc3,
  Radio,
  PenLine,
  Tv,
  Handshake,
  ShoppingBag,
  Library,
  type LucideIcon,
} from "lucide-react";
import { REVENUE_STREAMS } from "@/lib/site-config";

const ICONS: Record<string, LucideIcon> = {
  mic: Mic2,
  streaming: AudioLines,
  disc: Disc3,
  radio: Radio,
  pen: PenLine,
  screen: Tv,
  handshake: Handshake,
  merch: ShoppingBag,
  publishing: Library,
};

export function RevenueStreams() {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {REVENUE_STREAMS.map((s, i) => {
        const Icon = ICONS[s.icon] ?? AudioLines;
        return (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }}
            className="group flex items-start gap-3 rounded-2xl border border-border/60 bg-black/40 p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-black/60"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary transition-transform group-hover:scale-105">
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight text-white">{s.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.blurb}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
