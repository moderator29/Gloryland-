import { useEffect, useRef, useState } from "react";
import { motion, useAnimationFrame, useMotionValue } from "framer-motion";
import {
  AudioLines,
  Clapperboard,
  Disc3,
  Handshake,
  Library,
  Mic2,
  Pause,
  PenLine,
  Play,
  RadioTower,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * The income lines the programme is built around, flowing.
 *
 * Two rows moving against each other at different speeds, so the band reads
 * as a working system rather than a single loop. Three things stop it: the
 * pointer entering it, focus landing anywhere inside it, and the explicit
 * control in the head, which is what makes a moving band operable from a
 * keyboard. Reduced motion skips the mechanism entirely and lays the same
 * nine items out as a static wrapped list.
 *
 * Naming discipline: these are categories of income, not holdings. No
 * counterparty, catalogue or agreement is named, because none of them has
 * been published as a document a visitor could check.
 */

type Stream = { icon: LucideIcon; label: string; note: string };

const STREAMS: Stream[] = [
  {
    icon: Mic2,
    label: "Live performance",
    note: "Ticket receipts, guarantees and appearance fees, settled show by show.",
  },
  {
    icon: AudioLines,
    label: "Streaming",
    note: "Per stream payouts from the major services, reported monthly and paid on a lag.",
  },
  {
    icon: Disc3,
    label: "Recorded sales",
    note: "Downloads, pressings and reissues, counted per unit sold.",
  },
  {
    icon: RadioTower,
    label: "Broadcast royalties",
    note: "Collected when a recording is played on air, through the societies that meter it.",
  },
  {
    icon: PenLine,
    label: "Songwriting",
    note: "The writer's share of a composition, paid separately from the recording.",
  },
  {
    icon: Clapperboard,
    label: "Screen and media",
    note: "Synchronisation into film, television and advertising, licensed per placement.",
  },
  {
    icon: Handshake,
    label: "Brand agreements",
    note: "Fixed fee endorsement work, contracted term by term.",
  },
  {
    icon: ShoppingBag,
    label: "Merchandise",
    note: "Physical goods sold on tour and direct, at a known margin per unit.",
  },
  {
    icon: Library,
    label: "Publishing rights",
    note: "Ownership of the catalogue itself, and the licence income it collects.",
  },
];

/** Pixels a second. Slow enough that a label can be read as it passes. */
const SPEED = 26;

function Chip({ stream, dense }: { stream: Stream; dense: boolean }) {
  const Icon = stream.icon;
  return (
    <span
      className={`min-h-[36px] inline-flex shrink-0 items-center gap-2.5 rounded-full border border-[var(--line)] bg-[rgba(5,7,15,0.55)] py-2 pl-2 pr-4 ${
        dense ? "" : "sm:pr-5"
      }`}
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[var(--line-hi)] bg-[rgba(46,139,255,0.1)]">
        <Icon
          className="h-3.5 w-3.5 text-[var(--accent-hi)]"
          strokeWidth={1.8}
          aria-hidden="true"
        />
      </span>
      <span className="whitespace-nowrap text-[13px] font-medium text-[var(--text-hi)]">
        {stream.label}
      </span>
      {!dense && (
        <span className="hidden whitespace-nowrap text-[12px] text-[var(--text-low)] lg:inline">
          {stream.note}
        </span>
      )}
    </span>
  );
}

/**
 * One moving row. Position lives in a motion value rather than React state,
 * so nothing above it re-renders sixty times a second to keep it moving.
 */
function Row({
  items,
  direction,
  speed,
  paused,
  dense,
  label,
}: {
  items: Stream[];
  /** 1 flows left, -1 flows right. */
  direction: 1 | -1;
  speed: number;
  paused: boolean;
  dense: boolean;
  /** Undefined on the second row: it repeats the first, so it is announced once. */
  label?: string;
}) {
  const x = useMotionValue(0);
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [copies, setCopies] = useState(3);

  // Repeat the run often enough to cover the viewport twice over, otherwise a
  // short list on a wide screen loops back to a visible gap.
  useEffect(() => {
    const measure = () => {
      const view = viewport.current?.clientWidth ?? 0;
      const run = (track.current?.scrollWidth ?? 0) / copies;
      if (view <= 0 || run <= 0) return;
      const needed = Math.min(12, Math.max(3, Math.ceil((view * 2) / run) + 1));
      if (needed !== copies) setCopies(needed);
    };
    measure();
    const node = viewport.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, [copies]);

  useAnimationFrame((_, delta) => {
    if (paused) return;
    const run = (track.current?.scrollWidth ?? 0) / copies;
    if (run <= 0) return;
    let next = x.get() - (delta / 1000) * speed * direction;
    // One whole run out of place is indistinguishable from the start, so wrap.
    if (next <= -run) next += run;
    if (next > 0) next -= run;
    x.set(next);
  });

  return (
    <div
      ref={viewport}
      className="relative min-w-0 overflow-hidden"
      style={{
        WebkitMaskImage: "linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)",
        maskImage: "linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent)",
      }}
    >
      <motion.div ref={track} style={{ x }} className="flex w-max">
        {Array.from({ length: copies }, (_, copy) => (
          // Only the first run carries the list to assistive technology. The
          // repeats exist to fill the band and are noise to a screen reader.
          <ul
            key={copy}
            aria-label={copy === 0 ? label : undefined}
            aria-hidden={copy > 0 || !label || undefined}
            className="flex items-center gap-2.5 pr-2.5"
          >
            {items.map((s) => (
              <li key={`${copy}-${s.label}`} className="flex">
                <Chip stream={s} dense={dense} />
              </li>
            ))}
          </ul>
        ))}
      </motion.div>
    </div>
  );
}

export function CapitalMarquee() {
  const reduce = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [stopped, setStopped] = useState(false);
  const paused = hovered || focused || stopped;

  // Reduced motion gets the same nine items with the mechanism removed. It
  // wraps instead of scrolling, so it can never push the page sideways.
  if (reduce) {
    return (
      <ul
        aria-label="Income lines the programme is built around"
        className="flex flex-wrap gap-2.5"
      >
        {STREAMS.map((s) => (
          <li key={s.label} className="flex">
            <Chip stream={s} dense={false} />
          </li>
        ))}
      </ul>
    );
  }

  // The second row leads with a different item so the two never read as a
  // mirror of one another.
  const offset = [...STREAMS.slice(5), ...STREAMS.slice(0, 5)];

  return (
    <div
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <div className="mb-4 flex items-center gap-3">
        <p className="eyebrow whitespace-nowrap">Nine lines, always moving</p>
        <span aria-hidden="true" className="hairline" />
        <button
          type="button"
          className="min-h-[36px] btn btn-ghost !py-1.5 !text-[11px]"
          aria-pressed={stopped}
          onClick={() => setStopped((v) => !v)}
        >
          {stopped ? (
            <Play className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          ) : (
            <Pause className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          )}
          {stopped ? "Resume" : "Pause"}
        </button>
      </div>

      <div className="space-y-2.5">
        <Row
          items={STREAMS}
          direction={1}
          speed={SPEED}
          paused={paused}
          dense={false}
          label="Income lines the programme is built around"
        />
        <Row items={offset} direction={-1} speed={SPEED * 0.72} paused={paused} dense />
      </div>
    </div>
  );
}
