import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, Vault, Gift, ChartLine, TrendingUp, Layers, Clock } from "lucide-react";
import { useLedger } from "@/hooks/useLedger";
import { useUser } from "@/context/UserContext";
import { Value } from "@/components/system/Value";
import { Metric, Progress, SectionHeader, Empty, NavRow, Status } from "@/components/system/ui";
import { money, moneyCompact, pct, relative, days } from "@/components/system/format";
import { CYCLE_RETURN } from "@/domain/tiers";
import { useReducedMotion } from "@/hooks/useReducedMotion";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
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

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <motion.div {...rise(0)}>
        <p className="eyebrow">{greeting()}</p>
        <h1 className="display mt-1 text-2xl sm:text-3xl">{username || "Member"}</h1>
      </motion.div>

      {/* ── Portfolio ── */}
      <motion.section {...rise(1)} className="panel-hi edge-light overflow-hidden">
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Portfolio value</p>
              <p className="metric mt-2 text-4xl sm:text-5xl">
                <Value value={snap.portfolioValue} decimals={2} />
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className={`chip ${snap.netGain >= 0 ? "chip-gain" : ""}`}>
                  <TrendingUp className="h-3 w-3" />
                  {money(snap.netGain, 2)} ({pct(snap.returnPct)})
                </span>
                {snap.dailyRate > 0 && (
                  <span className="chip chip-accent">+{money(snap.dailyRate, 2)} / day</span>
                )}
              </div>
            </div>

            <Link to="/app/analytics" className="btn btn-outline !py-2 !text-[13px]">
              <ChartLine className="h-4 w-4" /> Performance
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Metric label="Deployed">{money(snap.deployed)}</Metric>
            <Metric label="Rewards" tone={snap.rewardsPending > 0 ? "gain" : "default"}>
              <Value value={snap.rewardsPending} decimals={2} />
            </Metric>
            <Metric label="Available">{money(snap.available, 2)}</Metric>
            <Metric label="Contributed">{money(snap.contributed)}</Metric>
          </div>
        </div>
      </motion.section>

      {/* ── Tier progress ── */}
      <motion.section {...rise(2)} className="panel p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">Standing</p>
            <p className="mt-1.5 text-lg font-semibold text-[var(--text-hi)]">
              {snap.tier ? snap.tier.name : "Unranked"}
            </p>
          </div>
          <Link to="/app/tiers" className="btn btn-ghost !py-1.5 !text-xs">
            All tiers <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {snap.nextTier ? (
          <div className="mt-4">
            <div className="mb-2 flex items-baseline justify-between text-xs">
              <span className="text-[var(--text-low)]">
                {snap.tier?.name ?? "Start"} →{" "}
                <span className="text-[var(--accent-hi)]">{snap.nextTier.name}</span>
              </span>
              <span className="tabular text-[var(--text-mid)]">{money(snap.toNextTier)} to go</span>
            </div>
            <Progress value={snap.tierProgress} label={`Progress to ${snap.nextTier.name}`} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--text-low)]">
            You hold the highest tier on the ladder.
          </p>
        )}
      </motion.section>

      {/* ── Vaults ── */}
      <motion.section {...rise(3)}>
        <SectionHeader
          title="Vaults"
          hint={
            hasPositions
              ? `${snap.activePositions.length} active · ${(CYCLE_RETURN * 100).toFixed(0)}% per 30-day term`
              : undefined
          }
          action={
            hasPositions ? (
              <Link to="/app/vaults" className="btn btn-ghost !py-1.5 !text-xs">
                View all <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            ) : undefined
          }
        />

        {hasPositions ? (
          <div className="panel divide-y divide-[var(--line)]">
            {snap.activePositions.slice(0, 3).map((p) => (
              <Link
                key={p.id}
                to={`/app/vaults/${p.id}`}
                className="flex items-center gap-4 p-4 transition-colors hover:bg-[rgba(46,139,255,0.04)]"
              >
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
                  <p className="metric text-sm text-[var(--gain)]">
                    <Value value={p.accrued} decimals={2} />
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--text-low)]">earned</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="panel">
            <Empty
              icon={Vault}
              title="No vaults open"
              body={`Place capital into a vault and it accrues ${(CYCLE_RETURN * 100).toFixed(0)}% across a 30-day term, paid daily.`}
              action={{ label: "Open your first vault", to: "/app/vaults/new" }}
            />
          </div>
        )}
      </motion.section>

      {/* ── Next up + shortcuts ── */}
      <motion.section {...rise(4)} className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-5">
          <SectionHeader title="Next up" />
          {soonest ? (
            <div className="inset flex items-center gap-3 p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-[rgba(46,139,255,0.08)]">
                <Clock className="h-4 w-4 text-[var(--accent-hi)]" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-hi)]">
                  {soonest.tier.name} vault matures
                </p>
                <p className="mt-0.5 text-xs text-[var(--text-low)]">
                  {relative(soonest.maturesAt)} · releases{" "}
                  {money(soonest.principal + soonest.termReward)}
                </p>
              </div>
            </div>
          ) : (
            <p className="py-2 text-sm text-[var(--text-low)]">
              Nothing scheduled. Open a vault to start a term.
            </p>
          )}
        </div>

        <div className="panel p-5">
          <SectionHeader title="Shortcuts" />
          <div className="space-y-1">
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
        </div>
      </motion.section>
    </div>
  );
}
