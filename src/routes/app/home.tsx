import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Vault, Gift, ChartLine, TrendingUp, Layers, Clock } from "lucide-react";
import { useLedger } from "@/hooks/useLedger";
import { useUser } from "@/context/UserContext";
import { Value } from "@/components/system/Value";
import { Progress, Empty, NavRow, Status } from "@/components/system/ui";
import { money, moneyCompact, pct, relative, days } from "@/components/system/format";
import { CYCLE_RETURN } from "@/domain/tiers";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { LiveTicker, Trajectory } from "@/features/pulse";
import { Orientation } from "@/features/onboarding";
import { RelayDue } from "@/features/relay";
import { Explain } from "@/features/explain";
import { Arrange, type ArrangeItem } from "@/features/utility";
import {
  Cadence,
  Concurrent,
  Countdown,
  FirstLight,
  Horizon,
  Redeploy,
  Standards,
  TierBadge,
} from "@/features/engagement";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/**
 * Left-aligned section head: accent tick, label, hairline out to the edge.
 * Kept local to the route because the shared SectionHeader is still in use by
 * the routes that have not moved to the band grammar yet.
 */
function BandHead({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="mb-4">
      <div className="band-head">
        <h2 className="band-title">{title}</h2>
        <span className="hairline" aria-hidden="true" />
        {action}
      </div>
      {hint && <p className="mt-2 pl-[0.9375rem] text-xs text-[var(--text-low)]">{hint}</p>}
    </div>
  );
}

/** One supporting figure in the narrow rail beside the lead figure. */
function RailStat({
  label,
  children,
  tone = "default",
}: {
  label: string;
  children: ReactNode;
  tone?: "default" | "gain" | "accent";
}) {
  const toneClass =
    tone === "gain"
      ? "text-[var(--gain)]"
      : tone === "accent"
        ? "text-[var(--accent-hi)]"
        : "text-[var(--text-hi)]";
  return (
    <div className="rail-stat">
      <span className="tag-micro">{label}</span>
      <span className={`metric text-lg ${toneClass}`}>{children}</span>
    </div>
  );
}

export default function Home() {
  const snap = useLedger();
  const { username } = useUser();
  const reduce = useReducedMotion();

  const hasPositions = snap.activePositions.length > 0;
  const soonest = [...snap.activePositions]
    .filter((p) => !p.matured)
    .sort((a, b) => a.maturesAt - b.maturesAt)[0];

  const rise = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.45, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as const },
        };

  // The stacked bands below the lede are the member's to order. The lede
  // itself is not in the list, because a dashboard whose headline figure can
  // be pushed below the fold stops being a dashboard.
  const sections: ArrangeItem[] = [
    {
      key: "live",
      label: "Live band",
      // Live band: the account in motion, from the member's own ledger
      node: (
        <motion.div {...rise(1)}>
          <LiveTicker snap={snap} />
        </motion.div>
      ),
    },
    {
      key: "bento",
      label: "Vaults, standing and shortcuts",
      // Bento: tall primary, two tiles, one wide secondary
      node: (
        <section className="band">
          <div className="bento">
            {/* Tall primary: open vaults, as ledger rows */}
            <motion.div
              {...rise(1)}
              className="bento-cell panel p-5 lg:col-span-8 lg:row-span-2 xl:p-6"
            >
              <BandHead
                title="Vaults"
                hint={
                  hasPositions
                    ? `${snap.activePositions.length} active · ${(CYCLE_RETURN * 100).toFixed(0)}% per 30-day term`
                    : undefined
                }
                action={
                  hasPositions ? (
                    <Link
                      to="/app/vaults"
                      className="btn btn-ghost min-h-[44px] shrink-0 !py-1.5 !text-xs"
                    >
                      View all <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : undefined
                }
              />

              {hasPositions ? (
                <div className="ledger">
                  {snap.activePositions.slice(0, 3).map((p) => (
                    <Link key={p.id} to={`/app/vaults/${p.id}`} className="rail-row">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-[var(--text-hi)]">
                            {p.tier.name}
                          </span>
                          <Status kind={p.matured ? "matured" : "accruing"} />
                        </div>
                        <p className="mt-1 text-xs text-[var(--text-low)]">
                          {money(p.principal)} ·{" "}
                          {p.matured ? "Term complete" : `${days(p.daysRemaining)}d remaining`}
                        </p>
                        <div className="mt-2.5 max-w-xs">
                          <Progress
                            value={p.progress}
                            height={4}
                            label={`${p.tier.name} term progress`}
                          />
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="metric text-lg text-[var(--gain)]">
                          <Value value={p.accrued} decimals={2} />
                        </p>
                        <p className="tag-micro mt-1.5">Earned</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <Empty
                  icon={Vault}
                  title="No vaults open"
                  body={`Place capital into a vault and it accrues ${(CYCLE_RETURN * 100).toFixed(0)}% across a 30-day term, paid daily.`}
                  action={{ label: "Open your first vault", to: "/app/vaults/new" }}
                />
              )}
            </motion.div>

            {/* Small tile: standing */}
            <motion.div {...rise(2)} className="bento-cell panel p-5 lg:col-span-4">
              <BandHead
                title="Standing"
                action={
                  <Link
                    to="/app/tiers"
                    className="btn btn-ghost min-h-[44px] shrink-0 !py-1.5 !text-xs"
                  >
                    All tiers <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                }
              />

              <p className="tag-micro">Current tier</p>
              <div className="mt-2">
                <TierBadge tier={snap.tier} showEntry />
              </div>

              {snap.nextTier ? (
                <div className="mt-auto pt-6">
                  <div className="mb-2 flex items-baseline justify-between gap-2 text-xs">
                    <span className="min-w-0 truncate text-[var(--text-low)]">
                      {snap.tier?.name ?? "Start"} →{" "}
                      <span className="text-[var(--accent-hi)]">{snap.nextTier.name}</span>
                    </span>
                    <span className="tabular shrink-0 text-[var(--text-mid)]">
                      {money(snap.toNextTier)} to go
                    </span>
                  </div>
                  <Progress value={snap.tierProgress} label={`Progress to ${snap.nextTier.name}`} />
                </div>
              ) : (
                <p className="mt-auto pt-6 text-sm text-[var(--text-low)]">
                  You hold the highest tier on the ladder.
                </p>
              )}
            </motion.div>

            {/* Small tile: next up */}
            <motion.div {...rise(3)} className="bento-cell panel p-5 lg:col-span-4">
              <BandHead title="Next up" />
              {soonest ? (
                <div className="ledger">
                  <div className="rail-row">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-[rgba(46,139,255,0.08)]">
                      <Clock className="h-4 w-4 text-[var(--accent-hi)]" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--text-hi)]">
                        {soonest.tier.name} vault matures
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--text-low)]">
                        {relative(soonest.maturesAt)} · releases{" "}
                        {money(soonest.principal + soonest.termReward)}
                      </p>
                      <Countdown to={soonest.maturesAt} className="mt-2" doneLabel="Matured" />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[var(--text-low)]">
                  Nothing scheduled. Open a vault to start a term.
                </p>
              )}
            </motion.div>

            {/* Wide secondary: shortcuts, side by side rather than stacked */}
            <motion.div {...rise(4)} className="bento-cell panel p-5 lg:col-span-12">
              <BandHead title="Shortcuts" />
              <div className="grid gap-1 sm:grid-cols-3">
                <NavRow
                  icon={Gift}
                  title="Rewards"
                  hint={
                    snap.rewardsPending > 0
                      ? `${money(snap.rewardsPending, 2)} ready to claim`
                      : "Nothing pending yet"
                  }
                  to="/app/rewards"
                />
                <NavRow
                  icon={Layers}
                  title="Tiers"
                  hint={
                    snap.nextTier
                      ? `${money(snap.toNextTier)} to ${snap.nextTier.name}`
                      : "Top tier held"
                  }
                  to="/app/tiers"
                />
                <NavRow
                  icon={ChartLine}
                  title="Analytics"
                  hint={`${moneyCompact(snap.rewardsAccrued)} earned to date`}
                  to="/app/analytics"
                />
              </div>
            </motion.div>
          </div>
        </section>
      ),
    },
    {
      key: "trajectory",
      label: "Trajectory",
      // Trajectory: what the open terms are already scheduled to return
      node: (
        <motion.section {...rise(5)} className="band">
          <BandHead title="Trajectory" hint="Capital already scheduled to return" />
          <Trajectory snap={snap} />
        </motion.section>
      ),
    },
    {
      key: "horizon",
      label: "Horizon",
      // Horizon: the same capital placed on a calendar rather than a curve
      node: hasPositions ? (
        <motion.section {...rise(6)} className="band">
          <BandHead
            title="Horizon"
            hint="Every open term against the next ninety days"
            action={
              <Link
                to="/app/horizon"
                className="btn btn-ghost min-h-[44px] shrink-0 !py-1.5 !text-xs"
              >
                Full calendar <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <Horizon snap={snap} />
        </motion.section>
      ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Lede: oversized figure left, supporting rail right ── */}
      <motion.section {...rise(0)} className="lede">
        <div className="min-w-0">
          <p className="eyebrow">{greeting()}</p>
          <h1 className="display mt-1.5 text-2xl sm:text-3xl">{username || "Member"}</h1>

          <p className="tag-micro mt-5 sm:mt-8">Portfolio value</p>
          <p className="figure-lead mt-2 sm:mt-3">
            <Value value={snap.portfolioValue} decimals={2} />
          </p>
          <Explain id="portfolioValue" className="mt-1.5" />

          <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-5">
            <span className={`chip ${snap.netGain >= 0 ? "chip-gain" : ""}`}>
              <TrendingUp className="h-3 w-3" />
              {money(snap.netGain, 2)} ({pct(snap.returnPct)})
            </span>
            {snap.dailyRate > 0 && (
              <span className="chip chip-accent">+{money(snap.dailyRate, 2)} / day</span>
            )}
            <Link to="/app/analytics" className="btn btn-outline min-h-[44px] !text-[13px]">
              <ChartLine className="h-4 w-4" /> Performance
            </Link>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 sm:mt-4">
            <Cadence />
            <Concurrent />
          </div>
        </div>

        <div className="lede-rail">
          <RailStat label="Deployed">{money(snap.deployed)}</RailStat>
          <RailStat label="Rewards" tone={snap.rewardsPending > 0 ? "gain" : "default"}>
            <Value value={snap.rewardsPending} decimals={2} />
          </RailStat>
          <RailStat label="Available" tone="accent">
            {money(snap.available, 2)}
          </RailStat>
          <RailStat label="Contributed">{money(snap.contributed)}</RailStat>
        </div>
      </motion.section>

      {/* Both hide themselves once the member has placed capital, so a funded
          account never sees an introduction it has outgrown. */}
      <Orientation />
      <FirstLight snap={snap} />

      {/* A relay that has come due but not run, which only happens when a
          member turned automatic firing off. Names what the wait costs. */}
      <RelayDue snap={snap} />

      {/* Idle cash prompt. Absent below the first tier entry, where there is
          nothing that could be opened with it. */}
      <Redeploy snap={snap} />

      {/* Order is the member's, persisted to this browser. Sections that have
          nothing to show return null and drop out of the stack entirely. */}
      <Arrange items={sections.filter((s) => s.node !== null)} title="Your layout" />

      {/* What the platform holds itself to, stated rather than implied. */}
      <Standards />
    </div>
  );
}
