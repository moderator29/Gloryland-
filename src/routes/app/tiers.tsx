import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, ChevronRight, Compass, Lock, Scale } from "lucide-react";
import { useLedger } from "@/hooks/useLedger";
import { TIERS, CYCLE_DAYS, CYCLE_RETURN, dailyReward } from "@/domain/tiers";
import { Progress } from "@/components/system/ui";
import { money } from "@/components/system/format";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export default function Tiers() {
  const snap = useLedger();
  const reduce = useReducedMotion();
  const currentRank = snap.tier?.rank ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Programme</p>
        <h1 className="display mt-1 text-2xl sm:text-3xl">Tiers</h1>
        <p className="mt-2 max-w-xl text-sm text-[var(--text-low)]">
          Every tier earns the same {(CYCLE_RETURN * 100).toFixed(0)}% across a {CYCLE_DAYS}-day
          term. What changes as you progress is access, settlement speed and the depth of tooling.
        </p>
      </div>

      {/* Standing */}
      <section className="panel-hi edge-light p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Current standing</p>
            <p className="display mt-1.5 text-2xl">{snap.tier?.name ?? "Unranked"}</p>
            <p className="mt-1 text-xs text-[var(--text-low)]">{money(snap.standing)} standing</p>
          </div>
          {snap.nextTier && (
            <div className="text-right">
              <p className="eyebrow">Next</p>
              <p className="mt-1.5 text-lg font-semibold text-[var(--accent-hi)]">
                {snap.nextTier.name}
              </p>
              <p className="tabular mt-1 text-xs text-[var(--text-low)]">
                {money(snap.toNextTier)} to unlock
              </p>
            </div>
          )}
        </div>
        {snap.nextTier && (
          <div className="mt-4">
            <Progress value={snap.tierProgress} label={`Progress to ${snap.nextTier.name}`} />
          </div>
        )}
      </section>

      {/* Ways in */}
      <section className="grid gap-2.5 sm:grid-cols-2" aria-label="Tier tools">
        <Link
          to="/app/tiers/match"
          className="group flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[rgba(17,24,41,0.5)] p-4 transition-colors hover:border-[rgba(46,139,255,0.4)] hover:bg-[rgba(46,139,255,0.06)]"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-[rgba(46,139,255,0.08)]">
            <Compass className="h-4 w-4 text-[var(--accent-hi)]" strokeWidth={1.9} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-[var(--text-hi)]">Tier Match</span>
            <span className="mt-0.5 block text-xs text-[var(--text-low)]">
              Four questions, one suggested rung
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-low)]" aria-hidden />
        </Link>

        <Link
          to="/app/tiers/compare"
          className="group flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[rgba(17,24,41,0.5)] p-4 transition-colors hover:border-[rgba(46,139,255,0.4)] hover:bg-[rgba(46,139,255,0.06)]"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-[rgba(46,139,255,0.08)]">
            <Scale className="h-4 w-4 text-[var(--accent-hi)]" strokeWidth={1.9} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-[var(--text-hi)]">Compare tiers</span>
            <span className="mt-0.5 block text-xs text-[var(--text-low)]">
              See only what changes between two rungs
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-low)]" aria-hidden />
        </Link>
      </section>

      {/* Ladder */}
      <ol className="relative space-y-3 pl-8">
        <span className="absolute bottom-6 left-[11px] top-6 w-px bg-[var(--line)]" aria-hidden />
        {TIERS.map((t, i) => {
          const held = currentRank >= t.rank;
          const isNext = snap.nextTier?.id === t.id;
          return (
            <motion.li
              key={t.id}
              initial={reduce ? false : { opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: reduce ? 0 : 0.35, delay: reduce ? 0 : i * 0.05 }}
              className="relative"
            >
              <span
                className={`absolute -left-8 top-6 grid h-[23px] w-[23px] place-items-center rounded-full border text-[10px] font-bold ${
                  held
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[#04101f]"
                    : isNext
                      ? "border-[var(--accent)] bg-[var(--ink-100)] text-[var(--accent-hi)]"
                      : "border-[var(--line-hi)] bg-[var(--ink-100)] text-[var(--text-low)]"
                }`}
                aria-hidden
              >
                {held ? <Check className="h-3 w-3" strokeWidth={3.5} /> : t.rank}
              </span>

              <Link
                to={`/app/tiers/${t.id}`}
                aria-label={`${t.name}, tier ${t.rank} of ${TIERS.length}, entry ${money(t.entry)}`}
                className={`block w-full rounded-2xl border p-5 text-left transition-colors ${
                  isNext
                    ? "border-[rgba(46,139,255,0.4)] bg-[rgba(46,139,255,0.07)]"
                    : "border-[var(--line)] bg-[rgba(17,24,41,0.5)] hover:border-[var(--line-hi)]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-[var(--text-hi)]">{t.name}</p>
                      {held && <span className="chip chip-accent">Held</span>}
                      {isNext && <span className="chip chip-warn">Next</span>}
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-low)]">{t.blurb}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="text-right">
                      <p className="metric text-lg">{money(t.entry)}</p>
                      <p className="mt-0.5 text-[11px] text-[var(--gain)]">
                        +{money(dailyReward(t.entry), 0)}/day
                      </p>
                    </div>
                    {!held && !isNext && currentRank > 0 && (
                      <Lock className="h-3.5 w-3.5 text-[var(--text-low)]" aria-hidden />
                    )}
                    <ChevronRight className="h-4 w-4 text-[var(--text-low)]" aria-hidden />
                  </div>
                </div>
              </Link>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
