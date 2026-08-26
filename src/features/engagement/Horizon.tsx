import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarClock } from "lucide-react";
import { DAY_MS, type Position, type Snapshot } from "@/domain/ledger";
import { Value } from "@/components/system/Value";
import { Empty } from "@/components/system/ui";
import { money, shortDate } from "@/components/system/format";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Countdown } from "./Countdown";

/**
 * Horizon: the next ninety days of maturing capital, on one rail.
 *
 * Each node is an open position the member actually placed. Its position on
 * the rail is the days between now and the `maturesAt` the ledger recorded,
 * and its size is that position's principal against the largest in the window.
 * The cumulative figure is principal plus the full term reward for each of
 * those positions, which is exactly what the term releases at maturity and
 * nothing more.
 */

const WINDOW_DAYS = 90;

export type HorizonProps = {
  snap: Snapshot;
  className?: string;
};

type Node = {
  position: Position;
  /** Days from now until maturity, clamped into the window. */
  days: number;
  /** 0..1 across the ninety day window. */
  t: number;
  /** Principal plus the term reward: what the maturity releases. */
  releases: number;
  /** Node diameter in pixels, scaled by principal. */
  size: number;
};

function clamp(n: number, lo: number, hi: number) {
  return n < lo ? lo : n > hi ? hi : n;
}

function build(snap: Snapshot, now: number) {
  const inWindow = snap.activePositions
    .filter((p) => (p.maturesAt - now) / DAY_MS <= WINDOW_DAYS)
    .sort((a, b) => a.maturesAt - b.maturesAt);

  const maxPrincipal = inWindow.reduce((m, p) => Math.max(m, p.principal), 0);

  const nodes: Node[] = inWindow.map((position) => {
    const days = clamp((position.maturesAt - now) / DAY_MS, 0, WINDOW_DAYS);
    const share = maxPrincipal > 0 ? position.principal / maxPrincipal : 1;
    return {
      position,
      days,
      t: days / WINDOW_DAYS,
      releases: position.principal + position.termReward,
      // Square root keeps a large position from swallowing the rail.
      size: 12 + Math.round(Math.sqrt(share) * 14),
    };
  });

  return {
    nodes,
    total: nodes.reduce((s, n) => s + n.releases, 0),
    beyond: snap.activePositions.length - inWindow.length,
  };
}

export function Horizon({ snap, className = "" }: HorizonProps) {
  const reduce = useReducedMotion();
  const { nodes, total, beyond } = useMemo(() => build(snap, Date.now()), [snap]);

  if (nodes.length === 0) {
    return (
      <section className={`panel ${className}`} aria-labelledby="horizon-title">
        <h3 id="horizon-title" className="sr-only">
          Horizon
        </h3>
        <Empty
          icon={CalendarClock}
          art="horizon"
          title="Nothing scheduled yet"
          body={
            beyond > 0
              ? "Your open vaults all mature beyond the next ninety days. They will appear here as they come into range."
              : "Open a vault and its maturity date will appear on this rail."
          }
          action={beyond > 0 ? undefined : { label: "Open a vault", to: "/app/vaults/new" }}
        />
      </section>
    );
  }

  const next = nodes[0];

  return (
    <section className={`panel p-4 sm:p-5 ${className}`} aria-labelledby="horizon-title">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="eyebrow">Horizon, next {WINDOW_DAYS} days</p>
          <h3 id="horizon-title" className="metric mt-1 text-2xl">
            <Value value={total} decimals={2} />
          </h3>
          <p className="mt-0.5 text-xs text-[var(--text-low)]">
            Capital and rewards returning across {nodes.length}{" "}
            {nodes.length === 1 ? "vault" : "vaults"}
          </p>
        </div>
        <span className="chip chip-accent">
          Next in <Countdown to={next.position.maturesAt} compact className="ml-1" />
        </span>
      </div>

      {/* ── The rail ── */}
      <div className="relative mt-6 h-16 w-full">
        <div className="absolute inset-x-0 top-6 h-px bg-[var(--line-hi)]" aria-hidden="true" />
        {[0, 30, 60, 90].map((d) => (
          <span
            key={d}
            className="absolute top-6 flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${(d / WINDOW_DAYS) * 100}%` }}
            aria-hidden="true"
          >
            <span className="h-2 w-px bg-[var(--line-hi)]" />
            <span className="mt-1 text-[10px] text-[var(--text-low)]">
              {d === 0 ? "Today" : `${d}d`}
            </span>
          </span>
        ))}

        {nodes.map((n, i) => (
          <motion.span
            key={n.position.id}
            className="absolute top-6 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${clamp(n.t * 100, 3, 97)}%` }}
            initial={reduce ? false : { opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={
              reduce ? { duration: 0 } : { duration: 0.35, delay: i * 0.05, ease: "easeOut" }
            }
          >
            <Link
              to={`/app/vaults/${n.position.id}`}
              className="block rounded-full border border-[var(--accent-hi)] bg-[rgba(46,139,255,0.22)] transition-colors hover:bg-[rgba(46,139,255,0.45)]"
              style={{ width: n.size, height: n.size }}
              aria-label={`${n.position.tier.name} vault of ${money(n.position.principal)}, matures ${shortDate(n.position.maturesAt)}, releasing ${money(n.releases)}`}
              title={`${money(n.position.principal)} matures ${shortDate(n.position.maturesAt)}`}
            />
          </motion.span>
        ))}
      </div>

      {/* ── The same schedule, readable and keyboard reachable ── */}
      <div className="ledger mt-4">
        {nodes.slice(0, 4).map((n) => (
          <Link key={n.position.id} to={`/app/vaults/${n.position.id}`} className="rail-row">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-[var(--text-hi)]">
                {n.position.tier.name} vault
              </span>
              <span className="mt-0.5 block text-xs text-[var(--text-low)]">
                {shortDate(n.position.maturesAt)}, {Math.round(n.days)} days out
              </span>
            </span>
            <span className="metric shrink-0 text-sm text-[var(--gain)]">
              {money(n.releases, 2)}
            </span>
          </Link>
        ))}
      </div>

      {(nodes.length > 4 || beyond > 0) && (
        <p className="mt-3 text-[11px] text-[var(--text-low)]">
          {nodes.length > 4 && `${nodes.length - 4} more in the window. `}
          {beyond > 0 && `${beyond} maturing beyond ${WINDOW_DAYS} days.`}
        </p>
      )}
    </section>
  );
}
