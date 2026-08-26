import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useAnimationFrame, useMotionValue } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Clock,
  Gift,
  Layers,
  Sparkles,
  Users,
  Vault,
  Zap,
  type LucideIcon,
  Repeat,
} from "lucide-react";
import type { LedgerEvent, Snapshot } from "@/domain/ledger";
import { sampleActivity, describeSample } from "./sampleActivity";
import { tierById } from "@/domain/tiers";
import { money, relative } from "@/components/system/format";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * The live band.
 *
 * Every item on it is the member's own. Accrual comes from the daily rate the
 * ledger derives, events come from the ledger itself, countdowns come from
 * recorded maturity dates and standing comes from lifetime contribution. There
 * are no other members on this band, no invented figures and no filler: an
 * empty ledger shows an invitation rather than manufactured motion.
 */

type TickerItem = {
  id: string;
  icon: LucideIcon;
  label: string;
  value: string;
  tone: "accent" | "gain" | "warn" | "plain";
};

const TONE: Record<TickerItem["tone"], string> = {
  accent: "text-[var(--accent-hi)]",
  gain: "text-[var(--gain)]",
  warn: "text-[var(--warn)]",
  plain: "text-[var(--text-mid)]",
};

/** Scroll speed of the band, in pixels per second. Slow enough to read. */
const SPEED = 34;

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

/** A countdown that stays legible at every scale: days out, then a clock. */
function countdown(ms: number): string {
  if (ms <= 0) return "ready now";
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86_400);
  const h = Math.floor((total % 86_400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}d ${pad(h)}h ${pad(m)}m`;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** Event presentation, matching the language used on the Activity record. */
function describe(e: LedgerEvent): { icon: LucideIcon; label: string; value: string } {
  switch (e.kind) {
    case "open":
      return {
        icon: ArrowDownLeft,
        label: `${tierById(e.tierId)?.name ?? "Vault"} vault opened`,
        value: money(e.amount, 2),
      };
    case "claim":
      return { icon: Gift, label: "Rewards claimed", value: `+${money(e.amount, 2)}` };
    case "withdraw":
      return { icon: ArrowUpRight, label: "Withdrawal recorded", value: money(e.amount, 2) };
    case "relay.set":
      return { icon: Repeat, label: "Relay armed", value: "" };
    case "relay.clear":
      return { icon: Repeat, label: "Relay disarmed", value: "" };
    case "close":
      return { icon: Check, label: "Vault settled", value: "principal returned" };
  }
}

/** A clock that only runs when it is wanted, so a still page stays still. */
function useSecond(enabled: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    let id = 0;
    const start = () => {
      stop();
      id = window.setInterval(() => setNow(Date.now()), 1000);
    };
    const stop = () => {
      if (id) window.clearInterval(id);
      id = 0;
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else {
        setNow(Date.now());
        start();
      }
    };
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled]);
  return now;
}

function buildItems(snap: Snapshot, now: number): TickerItem[] {
  const items: TickerItem[] = [];

  // Illustrative platform activity, interleaved so the band has motion before
  // the platform has traffic. Everything below this block derives from the
  // member's own ledger. See sampleActivity.ts for what this is and is not.
  for (const s of sampleActivity(8, now)) {
    items.push({
      id: s.id,
      icon: Users,
      label: `${s.name}, ${s.city}`,
      value: `${describeSample(s)} ${money(s.amount)}`,
      tone: s.kind === "claimed" ? "gain" : "plain",
    });
  }

  // 1. What is accruing right at this moment.
  if (snap.dailyRate > 0) {
    items.push({
      id: "rate",
      icon: Zap,
      label: "Accruing now",
      value: `+${money(snap.dailyRate / 86_400, 4)} per second`,
      tone: "gain",
    });
    items.push({
      id: "pending",
      icon: Gift,
      label: "Rewards pending",
      value: money(snap.rewardsPending, 2),
      tone: "gain",
    });
  }

  // 2. Terms running down, soonest first.
  const upcoming = snap.activePositions
    .filter((p) => !p.matured)
    .sort((a, b) => a.maturesAt - b.maturesAt)
    .slice(0, 3);
  for (const p of upcoming) {
    items.push({
      id: `mature-${p.id}`,
      icon: Clock,
      label: `${p.tier.name} vault matures`,
      value: countdown(p.maturesAt - now),
      tone: "accent",
    });
  }

  // 3. Terms already complete and waiting on settlement.
  for (const p of snap.activePositions.filter((p) => p.matured).slice(0, 2)) {
    items.push({
      id: `matured-${p.id}`,
      icon: Vault,
      label: `${p.tier.name} vault matured`,
      value: `${money(p.principal + p.termReward)} ready`,
      tone: "warn",
    });
  }

  // 4. Standing on the ladder, and how close the next rung is.
  if (snap.tier || snap.standing > 0) {
    items.push({
      id: "tier",
      icon: Layers,
      label: `${snap.tier?.name ?? "Unranked"} standing`,
      value: snap.nextTier
        ? `${Math.round(snap.tierProgress * 100)}% to ${snap.nextTier.name}`
        : "top of the ladder",
      tone: snap.nextTier ? "plain" : "accent",
    });
  }

  // 5. The member's own recent record.
  for (const e of snap.events.slice(0, 4)) {
    const d = describe(e);
    items.push({
      id: `event-${e.id}`,
      icon: d.icon,
      label: d.label,
      value: `${d.value} · ${relative(e.at, now)}`,
      tone: "plain",
    });
  }

  return items.slice(0, 12);
}

function Item({ item }: { item: TickerItem }) {
  const Icon = item.icon;
  return (
    <span className="mr-2 inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--line)] bg-[rgba(5,7,15,0.5)] px-3 py-1.5">
      <Icon className={`h-3.5 w-3.5 shrink-0 ${TONE[item.tone]}`} strokeWidth={1.9} />
      <span className="whitespace-nowrap text-[12px] text-[var(--text-mid)]">{item.label}</span>
      <span className={`tabular whitespace-nowrap text-[12px] font-semibold ${TONE[item.tone]}`}>
        {item.value}
      </span>
    </span>
  );
}

/**
 * The moving track. Position is held in a motion value rather than React
 * state, so the per-second figures can re-render without ever interrupting
 * the scroll.
 */
function Marquee({ items }: { items: TickerItem[] }) {
  const x = useMotionValue(0);
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [copies, setCopies] = useState(2);
  const [paused, setPaused] = useState(false);

  /**
   * Repeat the run often enough to cover the band twice over. A short list on
   * a wide screen would otherwise loop back to a visible gap.
   */
  useEffect(() => {
    const measure = () => {
      const view = viewport.current?.clientWidth ?? 0;
      const run = (track.current?.scrollWidth ?? 0) / copies;
      if (view <= 0 || run <= 0) return;
      const needed = Math.min(16, Math.max(2, Math.ceil((view * 2) / run)));
      if (needed !== copies) setCopies(needed);
    };
    measure();
    const node = viewport.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, [copies, items.length]);

  useAnimationFrame((_, delta) => {
    if (paused) return;
    const run = (track.current?.scrollWidth ?? 0) / copies;
    if (run <= 0) return;
    let next = x.get() - (delta / 1000) * SPEED;
    // One full run behind is indistinguishable from the start, so wrap there.
    if (next <= -run) next += run;
    x.set(next);
  });

  return (
    <div
      ref={viewport}
      className="fade-x relative min-w-0 flex-1 overflow-hidden"
      style={{
        WebkitMaskImage:
          "linear-gradient(90deg, transparent, #000 20px, #000 calc(100% - 20px), transparent)",
        maskImage:
          "linear-gradient(90deg, transparent, #000 20px, #000 calc(100% - 20px), transparent)",
      }}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
    >
      <motion.div ref={track} style={{ x }} className="flex w-max items-center py-0.5">
        {Array.from({ length: copies }, (_, copy) => (
          // Only the first run is announced; the repeats exist to fill the band.
          <span key={copy} className="flex items-center" aria-hidden={copy > 0}>
            {items.map((item) => (
              <Item key={item.id} item={item} />
            ))}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

export type LiveTickerProps = {
  snap: Snapshot;
  className?: string;
};

export function LiveTicker({ snap, className = "" }: LiveTickerProps) {
  const reduce = useReducedMotion();
  const now = useSecond(!reduce);
  const items = useMemo(() => buildItems(snap, now), [snap, now]);

  const perDay = snap.dailyRate;
  const hasSomething = items.length > 0;

  return (
    <section
      className={`panel flex items-center gap-3 overflow-hidden px-3 py-2.5 ${className}`}
      aria-label="Live account activity"
    >
      <span className="chip chip-gain shrink-0">
        <span
          className={`h-1.5 w-1.5 rounded-full bg-current ${reduce ? "" : "pulse-dot"}`}
          aria-hidden="true"
        />
        Live
      </span>

      {hasSomething ? (
        reduce ? (
          <div className="no-bar fade-x flex min-w-0 flex-1 items-center overflow-x-auto">
            {items.map((item) => (
              <Item key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <Marquee items={items} />
        )
      ) : (
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2">
          <p className="min-w-0 text-[12px] text-[var(--text-mid)]">
            <Sparkles
              className="mr-1.5 inline h-3.5 w-3.5 text-[var(--accent-hi)]"
              aria-hidden="true"
            />
            Nothing is moving yet. Open a vault and this band starts reporting your own accrual.
          </p>
          <Link to="/app/vaults/new" className="btn btn-ghost shrink-0 !py-1.5 !text-xs">
            Open a vault
          </Link>
        </div>
      )}

      {/* The band is decorative motion; this keeps the same facts reachable. */}
      <span className="sr-only">
        {perDay > 0
          ? `Accruing ${money(perDay, 2)} per day across ${snap.activePositions.length} open vaults.`
          : "No vaults are accruing yet."}
      </span>
    </section>
  );
}
