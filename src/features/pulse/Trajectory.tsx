import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, CalendarClock } from "lucide-react";
import { DAY_MS, type Position, type Snapshot } from "@/domain/ledger";
import { Value } from "@/components/system/Value";
import { Empty } from "@/components/system/ui";
import { money, relative, shortDate } from "@/components/system/format";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Trajectory: what is already scheduled to come back.
 *
 * Nothing here is a projection of new business. Every node is an open position
 * the member has actually placed, plotted at the maturity date the ledger
 * recorded for it and sized by its principal. The curve is the cumulative sum
 * of those releases across the next ninety days, so it can only move when the
 * member opens or settles a vault.
 */

const WINDOW_DAYS = 90;
const WINDOW_MS = WINDOW_DAYS * DAY_MS;

type Leg = {
  position: Position;
  /** Principal plus the full term reward, the figure the term releases. */
  releases: number;
  /** Running total of everything released up to and including this leg. */
  cumulative: number;
  /** 0..1 across the window. */
  t: number;
  /** The term is already complete and only settlement is outstanding. */
  ready: boolean;
};

function clamp(n: number, lo: number, hi: number) {
  return n < lo ? lo : n > hi ? hi : n;
}

function build(snap: Snapshot, now: number) {
  const horizon = now + WINDOW_MS;
  const open = snap.activePositions
    .filter((p) => p.maturesAt <= horizon)
    .sort((a, b) => a.maturesAt - b.maturesAt);

  let running = 0;
  const legs: Leg[] = open.map((position) => {
    const releases = position.principal + position.termReward;
    running += releases;
    return {
      position,
      releases,
      cumulative: running,
      t: clamp((position.maturesAt - now) / WINDOW_MS, 0, 1),
      ready: position.maturesAt <= now,
    };
  });

  return {
    legs,
    total: running,
    beyond: snap.activePositions.length - open.length,
    maxPrincipal: open.reduce((m, p) => Math.max(m, p.principal), 0),
  };
}

/** Height of the curve for a cumulative figure, as a percentage from the top. */
function yFor(cumulative: number, total: number) {
  if (total <= 0) return 96;
  return 96 - (cumulative / total) * 82;
}

export type TrajectoryProps = {
  snap: Snapshot;
  className?: string;
};

export function Trajectory({ snap, className = "" }: TrajectoryProps) {
  const reduce = useReducedMotion();
  const model = useMemo(() => build(snap, Date.now()), [snap]);
  const { legs, total, beyond, maxPrincipal } = model;

  if (legs.length === 0) {
    return (
      <section className={`panel ${className}`} aria-label="Trajectory">
        <Empty
          icon={CalendarClock}
          art="horizon"
          title="Nothing scheduled yet"
          body="Open a vault and its maturity date lands here, with the capital it releases plotted across the next 90 days."
          action={{ label: "Open a vault", to: "/app/vaults/new" }}
        />
      </section>
    );
  }

  // A stepped area: flat until a term matures, then up by what it releases.
  let path = `M 0 ${yFor(0, total)}`;
  for (const leg of legs) {
    const x = leg.t * 100;
    path += ` L ${x.toFixed(2)} ${yFor(leg.cumulative - leg.releases, total).toFixed(2)}`;
    path += ` L ${x.toFixed(2)} ${yFor(leg.cumulative, total).toFixed(2)}`;
  }
  path += ` L 100 ${yFor(total, total).toFixed(2)}`;
  const area = `${path} L 100 100 L 0 100 Z`;

  return (
    <section className={`panel p-5 ${className}`} aria-label="Trajectory">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Next {WINDOW_DAYS} days</p>
          <p className="metric mt-1.5 text-2xl">
            <Value value={total} decimals={2} />
          </p>
          <p className="mt-1 text-xs text-[var(--text-low)]">
            Scheduled to release from {legs.length} open {legs.length === 1 ? "vault" : "vaults"}
            {beyond > 0 ? `, with ${beyond} maturing later` : ""}
          </p>
        </div>
        <Link to="/app/vaults" className="min-h-[36px] btn btn-ghost shrink-0 !py-1.5 !text-xs">
          All vaults <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-5">
        <div className="relative h-24 w-full">
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <linearGradient id="rgl-trajectory-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={area} fill="url(#rgl-trajectory-fill)" />
            <motion.path
              d={path}
              fill="none"
              stroke="var(--accent-hi)"
              strokeWidth={1.6}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              initial={reduce ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={reduce ? { duration: 0 } : { duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>

          {legs.map((leg, i) => {
            const size = 9 + 11 * Math.sqrt(leg.position.principal / (maxPrincipal || 1));
            return (
              <motion.span
                key={leg.position.id}
                className="absolute"
                style={{
                  left: `${clamp(leg.t * 100, 2, 98)}%`,
                  top: `${yFor(leg.cumulative, total)}%`,
                  x: "-50%",
                  y: "-50%",
                }}
                initial={reduce ? false : { opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={reduce ? { duration: 0 } : { duration: 0.4, delay: 0.35 + i * 0.08 }}
              >
                <Link
                  to={`/app/vaults/${leg.position.id}`}
                  aria-label={`${leg.position.tier.name} vault ${leg.ready ? "matured" : "matures"} ${shortDate(leg.position.maturesAt)}, releasing ${money(leg.releases)}`}
                  className="grid h-8 w-8 place-items-center rounded-full"
                >
                  <span
                    className="block rounded-full border border-[var(--accent-hi)] bg-[rgba(46,139,255,0.35)] transition-transform hover:scale-110"
                    style={{
                      width: size,
                      height: size,
                      boxShadow: "0 0 0 3px rgba(46,139,255,0.12)",
                    }}
                  />
                </Link>
              </motion.span>
            );
          })}
        </div>

        <div className="mt-1 flex justify-between border-t border-[var(--line)] pt-2">
          {["Today", "30d", "60d", `${WINDOW_DAYS}d`].map((tick) => (
            <span key={tick} className="text-[10px] text-[var(--text-low)]">
              {tick}
            </span>
          ))}
        </div>
      </div>

      <ul className="mt-4 space-y-1.5">
        {legs.slice(0, 4).map((leg) => (
          <li key={leg.position.id} className="inset flex items-center gap-3 px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-xs text-[var(--text-mid)]">
              <span className="font-medium text-[var(--text-hi)]">{leg.position.tier.name}</span>{" "}
              {leg.ready ? "matured" : "matures"} {shortDate(leg.position.maturesAt)} ·{" "}
              {leg.ready ? "ready to settle" : relative(leg.position.maturesAt)}
            </span>
            <span className="tabular shrink-0 text-xs text-[var(--text-hi)]">
              {money(leg.releases, 2)}
            </span>
            <span className="tabular hidden shrink-0 text-[11px] text-[var(--text-low)] sm:block">
              {money(leg.cumulative)} total
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[11px] text-[var(--text-low)]">
        Figures are principal plus the full term reward for each open vault. Settlement moves the
        capital into your available balance.
      </p>
    </section>
  );
}
