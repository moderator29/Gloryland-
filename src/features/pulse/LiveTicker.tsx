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
  Pause,
  Play,
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
 * Two kinds of item share it, and they are not interchangeable.
 *
 * The member's own: accrual from the daily rate the ledger derives, events
 * from the ledger itself, countdowns from recorded maturity dates, standing
 * from the derived standing figure. Every one of those is real.
 *
 * And illustrative platform activity, which is generated rather than observed,
 * because the platform has no traffic to show yet. Those items carry a visible
 * sample marker, because a name and a city read as a person and a member
 * should never have to guess which half of the band is theirs. See
 * sampleActivity.ts, which is the only file that produces them.
 */

type TickerItem = {
  id: string;
  icon: LucideIcon;
  label: string;
  value: string;
  tone: "accent" | "gain" | "warn" | "plain";
  /** Generated rather than observed, and marked as such on screen. */
  sample?: boolean;
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
    case "course.set":
      return { icon: Repeat, label: "Course set", value: money(e.amount) };
    case "course.stop":
      return { icon: Repeat, label: "Course stopped", value: "" };
    case "course.fill":
      return { icon: Repeat, label: `Leg ${e.leg} filled`, value: "" };
    case "close":
      return { icon: Check, label: "Vault settled", value: "principal returned" };
  }
}

/**
 * The per second clock behind the figures in the band.
 *
 * It is not gated on reduced motion. The accrual reading, the countdowns and
 * the relative times are data, and a member who asked for less animation did
 * not ask to be shown a stopped account. What reduced motion turns off is the
 * scroll, which is directly below. The clock stops on a hidden tab, where it
 * would only cost battery.
 */
function useSecond(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
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
  }, []);
  return now;
}

function buildItems(snap: Snapshot, now: number): TickerItem[] {
  const items: TickerItem[] = [];

  // Illustrative platform activity, so the band has motion before the platform
  // has traffic. Marked, because everything below this block is the member's
  // own and the two must be told apart at a glance.
  for (const s of sampleActivity(8, now)) {
    items.push({
      id: s.id,
      icon: Users,
      label: `${s.name}, ${s.city}`,
      value: `${describeSample(s)} ${money(s.amount)}`,
      tone: s.kind === "claimed" ? "gain" : "plain",
      sample: true,
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

  // 2. The withdrawal window, which is the only clock left in the product.
  //    Positions no longer mature, so there is no maturity to count down to:
  //    what a member is actually waiting on is the next time they may request
  //    a withdrawal.
  items.push(
    snap.withdrawAllowed
      ? {
          id: "window",
          icon: Vault,
          label: "Withdrawal window",
          value: "open now",
          tone: "gain",
        }
      : {
          id: "window",
          icon: Clock,
          label: "Withdrawal window opens",
          value: countdown(snap.withdrawUnlocksAt - now),
          tone: "accent",
        },
  );

  // 3. The largest positions and what each adds per day, biggest first.
  for (const p of [...snap.activePositions].sort((a, b) => b.principal - a.principal).slice(0, 3)) {
    items.push({
      id: `pos-${p.id}`,
      icon: Vault,
      label: `${p.tier.name} vault`,
      value: `+${money(p.dailyReward, 2)} a day`,
      tone: "gain",
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
    <span className="min-h-[36px] mr-2 inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--line)] bg-[rgba(5,7,15,0.5)] px-3 py-1.5">
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
 *
 * Three things stop it, and all three matter. The pointer, so reading one item
 * does not require chasing it. Focus anywhere inside, so a keyboard user
 * tabbing into the band is not fighting it. And `stopped`, the member's own
 * explicit choice from the control in the header, which is the one WCAG 2.2.2
 * actually requires: content that moves for more than five seconds needs a
 * mechanism to pause it, and hovering is not a mechanism a keyboard has.
 */
function Marquee({ items, stopped }: { items: TickerItem[]; stopped: boolean }) {
  const x = useMotionValue(0);
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [copies, setCopies] = useState(2);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = stopped || hovered || focused;

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
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={() => setFocused(false)}
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
  const now = useSecond();
  const items = useMemo(() => buildItems(snap, now), [snap, now]);

  // The member's own choice, held here rather than in the track, because the
  // control that sets it sits outside the track it stops.
  const [stopped, setStopped] = useState(false);

  const perDay = snap.dailyRate;
  const hasSomething = items.length > 0;
  // Under reduced motion the band never scrolls, so there is nothing to pause
  // and offering a pause control would be a button that does nothing.
  const scrolls = hasSomething && !reduce;
  const hasSample = items.some((item) => item.sample);

  return (
    <section className={`panel px-3 py-2.5 ${className}`} aria-label="Live account activity">
      <div className="flex min-h-[36px] items-center gap-3 overflow-hidden">
        <span className="chip chip-gain shrink-0">
          <span
            className={`h-1.5 w-1.5 rounded-full bg-current ${reduce || stopped ? "" : "pulse-dot"}`}
            aria-hidden="true"
          />
          Live
        </span>

        {scrolls && (
          <button
            type="button"
            onClick={() => setStopped((s) => !s)}
            aria-pressed={stopped}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[var(--line)] text-[var(--text-mid)] transition-colors hover:border-[var(--line-hi)] hover:text-[var(--text-hi)]"
          >
            {stopped ? (
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Pause className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span className="sr-only">
              {stopped ? "Resume the live band" : "Pause the live band"}
            </span>
          </button>
        )}

        {hasSomething ? (
          reduce ? (
            <div className="no-bar fade-x flex min-w-0 flex-1 items-center overflow-x-auto">
              {items.map((item) => (
                <Item key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <Marquee items={items} stopped={stopped} />
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
            <Link
              to="/app/vaults/new"
              className="min-h-[36px] btn btn-ghost shrink-0 !py-1.5 !text-xs"
            >
              Open a vault
            </Link>
          </div>
        )}
      </div>

      {/* What "Sample" means, on the screen rather than in a title attribute.
          The word alone qualifies the row; this says what it qualifies it to,
          and it appears only while a generated row is actually in the band. */}
      {hasSample && (
        <p className="mt-2 text-[11px] leading-relaxed text-[var(--text-low)]">
          Rows marked Sample are generated for illustration. No other member activity stands behind
          them.
        </p>
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
