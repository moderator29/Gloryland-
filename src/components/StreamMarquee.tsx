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
import { useReducedMotion } from "@/hooks/useReducedMotion";

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

function Row({ dir, duration, offset }: { dir: 1 | -1; duration: number; offset: number }) {
  const reduce = useReducedMotion();
  // rotate the list so the two rows lead with different streams
  const items = [...REVENUE_STREAMS.slice(offset), ...REVENUE_STREAMS.slice(0, offset)];
  const loop = [...items, ...items];

  return (
    <div
      className="overflow-hidden"
      style={{
        maskImage: "linear-gradient(90deg, transparent 0%, #000 10%, #000 90%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(90deg, transparent 0%, #000 10%, #000 90%, transparent 100%)",
      }}
    >
      <motion.div
        className="flex w-max gap-2.5"
        animate={reduce ? undefined : { x: dir === 1 ? ["0%", "-50%"] : ["-50%", "0%"] }}
        transition={{ duration, repeat: Infinity, ease: "linear" }}
      >
        {loop.map((s, i) => {
          const navy = i % 3 === 1;
          const Icon = ICONS[s.icon] ?? AudioLines;
          return (
            <span
              key={`${s.label}-${i}`}
              className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[11px] font-medium tracking-wide ${
                navy
                  ? "border border-[#7ea0dc]/35 bg-gradient-to-br from-[#24406f]/60 to-[#0c1a33]/90 text-[#cfe0ff]"
                  : "border border-primary/30 bg-black/45 text-[#f4e3ac]"
              }`}
            >
              <Icon
                className={`h-3.5 w-3.5 shrink-0 ${navy ? "text-[#9fc0f5]" : "text-primary"}`}
                strokeWidth={1.9}
              />
              {s.label}
            </span>
          );
        })}
      </motion.div>
    </div>
  );
}

/**
 * Breaking-news style ribbon for the hero crest card: two counter-scrolling
 * rows of the nine revenue streams, edge-faded so they drift in and out of
 * the glass.
 */
export function StreamMarquee() {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-center gap-2">
        <span className="h-px w-10 bg-gradient-to-r from-transparent to-primary/50" />
        <span className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.3em] text-primary/80">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
          </span>
          Nine Revenue Streams
        </span>
        <span className="h-px w-10 bg-gradient-to-l from-transparent to-primary/50" />
      </div>
      <Row dir={1} duration={30} offset={0} />
      <Row dir={-1} duration={38} offset={4} />
    </div>
  );
}
