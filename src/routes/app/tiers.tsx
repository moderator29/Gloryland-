import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, Lock, X } from "lucide-react";
import { useLedger } from "@/hooks/useLedger";
import {
  TIERS,
  CYCLE_DAYS,
  CYCLE_RETURN,
  dailyReward,
  termReward,
  type Tier,
} from "@/domain/tiers";
import { Progress } from "@/components/system/ui";
import { money } from "@/components/system/format";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/** Detail drawer: the deeper layer, opened by choosing a rung. */
function TierSheet({ tier, held, onClose }: { tier: Tier; held: boolean; onClose: () => void }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0 : 0.18 }}
    >
      <div className="absolute inset-0 bg-black/72 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`${tier.name} tier detail`}
        className="raised relative max-h-[88vh] w-full overflow-y-auto rounded-t-3xl p-6 sm:max-w-lg sm:rounded-3xl"
        initial={reduce ? false : { y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={reduce ? undefined : { y: 40, opacity: 0 }}
        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 360, damping: 34 }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="eyebrow">
              Tier {tier.rank} of {TIERS.length}
            </p>
            <h2 className="display mt-1 text-2xl">{tier.name}</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost !px-2" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-[var(--text-mid)]">{tier.blurb}</p>

        <div className="mt-5 grid grid-cols-3 gap-2.5">
          <div className="inset p-3">
            <p className="eyebrow">Entry</p>
            <p className="metric mt-1 text-base">{money(tier.entry)}</p>
          </div>
          <div className="inset p-3">
            <p className="eyebrow">Per day</p>
            <p className="metric mt-1 text-base text-[var(--gain)]">
              {money(dailyReward(tier.entry), 2)}
            </p>
          </div>
          <div className="inset p-3">
            <p className="eyebrow">Per term</p>
            <p className="metric mt-1 text-base text-[var(--gain)]">
              {money(termReward(tier.entry))}
            </p>
          </div>
        </div>

        <h3 className="eyebrow mt-6">Includes</h3>
        <ul className="mt-2.5 space-y-2">
          {tier.benefits.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm text-[var(--text)]">
              <Check
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent-hi)]"
                strokeWidth={3}
              />
              {b}
            </li>
          ))}
          <li className="flex items-start gap-2.5 text-sm text-[var(--text)]">
            <Check
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent-hi)]"
              strokeWidth={3}
            />
            Settlement target {tier.settlementHours}h
          </li>
        </ul>

        <Link
          to={`/app/vaults/new?amount=${tier.entry}`}
          onClick={onClose}
          className="btn btn-primary mt-6 w-full"
        >
          {held ? `Open another ${tier.name} vault` : `Enter ${tier.name} at ${money(tier.entry)}`}
        </Link>
      </motion.div>
    </motion.div>
  );
}

export default function Tiers() {
  const snap = useLedger();
  const [open, setOpen] = useState<Tier | null>(null);
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
            <p className="mt-1 text-xs text-[var(--text-low)]">
              {money(snap.contributed)} contributed to date
            </p>
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
              >
                {held ? <Check className="h-3 w-3" strokeWidth={3.5} /> : t.rank}
              </span>

              <button
                onClick={() => setOpen(t)}
                className={`w-full rounded-2xl border p-5 text-left transition-colors ${
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
                      <Lock className="h-3.5 w-3.5 text-[var(--text-low)]" />
                    )}
                    <ChevronRight className="h-4 w-4 text-[var(--text-low)]" />
                  </div>
                </div>
              </button>
            </motion.li>
          );
        })}
      </ol>

      <AnimatePresence>
        {open && (
          <TierSheet tier={open} held={currentRank >= open.rank} onClose={() => setOpen(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
