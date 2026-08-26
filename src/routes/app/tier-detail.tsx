import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, Check, Clock, Layers, Search } from "lucide-react";
import { CYCLE_DAYS, CYCLE_RETURN, TIERS, dailyReward, termReward, tierById } from "@/domain/tiers";
import { useLedger } from "@/hooks/useLedger";
import { Progress } from "@/components/system/ui";
import { money } from "@/components/system/format";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/** Benefit lines that only restate the rung below carry no new information. */
function isCarryOver(line: string) {
  return /^everything in /i.test(line);
}

function NotFound({ id }: { id?: string }) {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link to="/app/tiers" className="btn btn-ghost -ml-2 !py-1.5 !text-xs">
        <ArrowLeft className="h-4 w-4" /> Tiers
      </Link>
      <section className="panel-hi edge-light p-8 text-center">
        <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-[var(--line-hi)] bg-[rgba(46,139,255,0.08)]">
          <Search className="h-5 w-5 text-[var(--accent-hi)]" strokeWidth={1.7} aria-hidden />
        </span>
        <h1 className="display text-xl">No tier by that name</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[var(--text-low)]">
          {id ? `"${id}" is not one of the six rungs.` : "That rung does not exist."} The ladder
          runs from {TIERS[0].name} at {money(TIERS[0].entry)} to {TIERS[TIERS.length - 1].name} at{" "}
          {money(TIERS[TIERS.length - 1].entry)}.
        </p>
        <Link to="/app/tiers" className="btn btn-secondary mt-6">
          View every tier
        </Link>
      </section>
    </div>
  );
}

export default function TierDetail() {
  const { tierId } = useParams();
  const snap = useLedger();
  const reduce = useReducedMotion();
  const tier = tierId ? tierById(tierId) : undefined;

  if (!tier) return <NotFound id={tierId} />;

  const below = TIERS.find((t) => t.rank === tier.rank - 1) ?? null;
  const added = below
    ? tier.benefits.filter((b) => !isCarryOver(b) && !below.benefits.includes(b))
    : [];
  const hoursSaved = below ? below.settlementHours - tier.settlementHours : 0;
  const stepUp = below ? tier.entry - below.entry : 0;

  const held = (snap.tier?.rank ?? 0) >= tier.rank;
  const isNext = snap.nextTier?.id === tier.id;
  const gap = isNext ? snap.toNextTier : Math.max(0, tier.entry - snap.standing);
  const progress = tier.entry > 0 ? Math.min(1, snap.standing / tier.entry) : 1;

  const fade = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/app/tiers" className="btn btn-ghost -ml-2 !py-1.5 !text-xs">
        <ArrowLeft className="h-4 w-4" /> Tiers
      </Link>

      {/* Identity */}
      <motion.header {...fade(0)}>
        <p className="eyebrow">
          Tier {tier.rank} of {TIERS.length}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
          <h1 className="display text-3xl sm:text-4xl">{tier.name}</h1>
          {held && <span className="chip chip-accent">Held</span>}
          {isNext && <span className="chip chip-warn">Next rung</span>}
        </div>
        <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-[var(--text-mid)]">
          {tier.blurb}
        </p>
      </motion.header>

      {/* Figures */}
      <motion.section
        {...fade(0.05)}
        className="grid grid-cols-2 gap-2.5 sm:grid-cols-4"
        aria-label={`${tier.name} figures`}
      >
        <div className="inset p-3.5">
          <p className="eyebrow">Entry</p>
          <p className="metric mt-1.5 text-lg">{money(tier.entry)}</p>
        </div>
        <div className="inset p-3.5">
          <p className="eyebrow">Per day</p>
          <p className="metric mt-1.5 text-lg text-[var(--gain)]">
            {money(dailyReward(tier.entry), 2)}
          </p>
        </div>
        <div className="inset p-3.5">
          <p className="eyebrow">Per term</p>
          <p className="metric mt-1.5 text-lg text-[var(--gain)]">
            {money(termReward(tier.entry))}
          </p>
        </div>
        <div className="inset p-3.5">
          <p className="eyebrow">Settlement</p>
          <p className="metric mt-1.5 text-lg">{tier.settlementHours}h</p>
        </div>
      </motion.section>

      <p className="text-xs leading-relaxed text-[var(--text-low)]">
        Figures shown are for a position placed at the entry amount, over one {CYCLE_DAYS}-day term
        at the programme rate of {(CYCLE_RETURN * 100).toFixed(0)}%. Every tier earns that same
        rate, so a larger position scales the figures rather than the percentage.
      </p>

      {/* What this rung adds */}
      <motion.section {...fade(0.1)} className="panel p-5">
        <div className="flex items-center gap-2.5">
          <Layers className="h-4 w-4 text-[var(--accent-hi)]" aria-hidden />
          <h2 className="text-[15px] font-semibold text-[var(--text-hi)]">
            {below ? `What ${tier.name} adds over ${below.name}` : "Where the ladder starts"}
          </h2>
        </div>

        {below ? (
          <>
            <p className="mt-2 text-xs leading-relaxed text-[var(--text-low)]">
              {money(stepUp)} more capital than {below.name} at {money(below.entry)}.
            </p>
            <ul className="mt-3.5 space-y-2.5">
              {hoursSaved > 0 && (
                <li className="flex items-start gap-2.5 text-sm text-[var(--text)]">
                  <Clock
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent-hi)]"
                    strokeWidth={2.4}
                    aria-hidden
                  />
                  <span>
                    Settlement target moves from {below.settlementHours}h to {tier.settlementHours}
                    h, which is {hoursSaved}h sooner on a withdrawal request.
                  </span>
                </li>
              )}
              {added.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-[var(--text)]">
                  <Check
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent-hi)]"
                    strokeWidth={3}
                    aria-hidden
                  />
                  <span>{b}</span>
                </li>
              ))}
              {added.length === 0 && hoursSaved <= 0 && (
                <li className="text-sm text-[var(--text-low)]">
                  This rung carries the same access as {below.name} at a higher entry.
                </li>
              )}
            </ul>
          </>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-mid)]">
            {tier.name} is the first rung, so nothing sits below it. It carries the full term rate
            from the first dollar placed, with a {tier.settlementHours}h settlement target.
          </p>
        )}
      </motion.section>

      {/* Everything included */}
      <motion.section {...fade(0.15)} className="panel p-5">
        <h2 className="text-[15px] font-semibold text-[var(--text-hi)]">Included at {tier.name}</h2>
        <ul className="mt-3 space-y-2.5">
          {tier.benefits.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm text-[var(--text)]">
              <Check
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent-hi)]"
                strokeWidth={3}
                aria-hidden
              />
              <span>{b}</span>
            </li>
          ))}
          <li className="flex items-start gap-2.5 text-sm text-[var(--text)]">
            <Clock
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent-hi)]"
              strokeWidth={2.4}
              aria-hidden
            />
            <span>Settlement target of {tier.settlementHours} hours</span>
          </li>
        </ul>
      </motion.section>

      {/* Your standing against this rung */}
      <motion.section {...fade(0.2)} className="panel-hi edge-light p-5">
        <h2 className="eyebrow">Your standing</h2>
        {held ? (
          <>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text)]">
              You hold {tier.name}. Your standing of {money(snap.standing)} clears the{" "}
              {money(tier.entry)} entry
              {snap.tier && snap.tier.id !== tier.id
                ? `, and your standing is ${snap.tier.name}.`
                : "."}
            </p>
            {snap.nextTier && (
              <p className="mt-1.5 text-xs text-[var(--text-low)]">
                {money(snap.toNextTier)} more would reach {snap.nextTier.name}.
              </p>
            )}
          </>
        ) : (
          <>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
              <p className="text-sm leading-relaxed text-[var(--text)]">
                {money(gap)} of further capital reaches {tier.name}.
              </p>
              <p className="tabular text-xs text-[var(--text-low)]">
                {money(snap.standing)} of {money(tier.entry)}
              </p>
            </div>
            <div className="mt-3">
              <Progress value={progress} label={`Progress toward ${tier.name}`} />
            </div>
            {!isNext && snap.nextTier && (
              <p className="mt-2.5 text-xs text-[var(--text-low)]">
                {snap.nextTier.name} comes first on the ladder, at {money(snap.toNextTier)} more.
              </p>
            )}
          </>
        )}
      </motion.section>

      {/* Actions */}
      <motion.div {...fade(0.25)} className="flex flex-col gap-2.5 pb-2 sm:flex-row">
        <Link to={`/app/vaults/new?amount=${tier.entry}`} className="btn btn-primary flex-1">
          {held ? `Open another ${tier.name} vault` : `Place ${money(tier.entry)} at ${tier.name}`}
        </Link>
        <Link to="/app/tiers/compare" className="btn btn-outline flex-1">
          Compare tiers <ArrowUpRight className="h-4 w-4" aria-hidden />
        </Link>
      </motion.div>
    </div>
  );
}
