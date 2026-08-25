import { useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, Check, Clock, Wallet } from "lucide-react";
import {
  CYCLE_RETURN,
  TIERS,
  dailyReward,
  termReward,
  type Tier,
  type TierId,
} from "@/domain/tiers";
import { useLedger } from "@/hooks/useLedger";
import { money } from "@/components/system/format";
import { useReducedMotion } from "@/hooks/useReducedMotion";

function isCarryOver(line: string) {
  return /^everything in /i.test(line);
}

/** Everything a rung carries, including what it inherits from the rungs below. */
function cumulativeBenefits(tier: Tier): string[] {
  const out: string[] = [];
  for (const t of TIERS) {
    if (t.rank > tier.rank) break;
    for (const b of t.benefits) if (!isCarryOver(b) && !out.includes(b)) out.push(b);
  }
  return out;
}

function TierSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: TierId;
  onChange: (v: TierId) => void;
}) {
  const uid = useId();
  const id = `tier-select-${uid}`;
  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as TierId)}
        className="mt-1.5 w-full rounded-xl border border-[var(--line-hi)] bg-[rgba(5,7,15,0.6)] px-3.5 py-3 text-sm font-medium text-[var(--text-hi)] outline-none transition-colors focus:border-[var(--accent)]"
      >
        {TIERS.map((t) => (
          <option key={t.id} value={t.id} className="bg-[var(--ink-200)]">
            {t.name} ({money(t.entry)})
          </option>
        ))}
      </select>
    </div>
  );
}

function DiffRow({
  label,
  lower,
  higher,
  lowerValue,
  higherValue,
  note,
}: {
  label: string;
  lower: Tier;
  higher: Tier;
  lowerValue: string;
  higherValue: string;
  note: string;
}) {
  return (
    <div className="inset p-4">
      <p className="eyebrow">{label}</p>
      <div className="mt-2.5 grid grid-cols-2 gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-low)]">
            {lower.name}
          </p>
          <p className="metric mt-1 text-base sm:text-lg">{lowerValue}</p>
        </div>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-hi)]">
            {higher.name}
          </p>
          <p className="metric mt-1 text-base text-[var(--text-hi)] sm:text-lg">{higherValue}</p>
        </div>
      </div>
      <p className="mt-2.5 text-xs leading-relaxed text-[var(--text-low)]">{note}</p>
    </div>
  );
}

export default function TierCompare() {
  const snap = useLedger();
  const reduce = useReducedMotion();

  const [aId, setA] = useState<TierId>(() => snap.tier?.id ?? TIERS[0].id);
  const [bId, setB] = useState<TierId>(() => snap.nextTier?.id ?? TIERS[TIERS.length - 1].id);

  const a = TIERS.find((t) => t.id === aId) ?? TIERS[0];
  const b = TIERS.find((t) => t.id === bId) ?? TIERS[TIERS.length - 1];
  const same = a.id === b.id;

  const lower = a.rank <= b.rank ? a : b;
  const higher = a.rank <= b.rank ? b : a;

  const uniqueBenefits = useMemo(() => {
    if (same) return [];
    const held = cumulativeBenefits(lower);
    return cumulativeBenefits(higher).filter((x) => !held.includes(x));
  }, [same, lower, higher]);

  const hoursSaved = lower.settlementHours - higher.settlementHours;
  const capitalStep = higher.entry - lower.entry;
  const gap = Math.max(0, higher.entry - snap.contributed);

  const fade = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 8 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.32, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/app/tiers" className="btn btn-ghost -ml-2 !py-1.5 !text-xs">
        <ArrowLeft className="h-4 w-4" /> Tiers
      </Link>

      <header>
        <p className="eyebrow">Programme</p>
        <h1 className="display mt-1 text-2xl sm:text-3xl">Compare tiers</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--text-low)]">
          Only the lines that actually change are listed. The term rate is fixed at{" "}
          {(CYCLE_RETURN * 100).toFixed(0)}% on every rung, so the difference is always access,
          settlement speed and tooling.
        </p>
      </header>

      <section className="panel p-5" aria-label="Choose two tiers">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <TierSelect label="Compare" value={aId} onChange={setA} />
          <TierSelect label="With" value={bId} onChange={setB} />
        </div>
      </section>

      {same ? (
        <section className="panel p-6 text-center">
          <h2 className="text-[15px] font-semibold text-[var(--text-hi)]">
            Both selectors are on {a.name}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[var(--text-low)]">
            Pick a second rung to see what changes between them.
          </p>
          <Link to={`/app/tiers/${a.id}`} className="btn btn-secondary mt-5">
            Open {a.name} detail
          </Link>
        </section>
      ) : (
        <>
          <motion.section {...fade(0)} className="space-y-2.5" aria-label="Differences">
            <h2 className="text-[15px] font-semibold text-[var(--text-hi)]">
              {lower.name} to {higher.name}
            </h2>

            <DiffRow
              label="Entry"
              lower={lower}
              higher={higher}
              lowerValue={money(lower.entry)}
              higherValue={money(higher.entry)}
              note={`${money(capitalStep)} more capital, taking a position at entry from ${money(
                dailyReward(lower.entry),
                2,
              )} to ${money(dailyReward(higher.entry), 2)} per day and ${money(
                termReward(lower.entry),
              )} to ${money(termReward(higher.entry))} across the term.`}
            />

            {hoursSaved > 0 && (
              <DiffRow
                label="Settlement target"
                lower={lower}
                higher={higher}
                lowerValue={`${lower.settlementHours}h`}
                higherValue={`${higher.settlementHours}h`}
                note={`${hoursSaved} hours saved on a withdrawal request, a ${Math.round(
                  (hoursSaved / lower.settlementHours) * 100,
                )}% shorter target window.`}
              />
            )}

            <div className="inset p-4">
              <p className="eyebrow">Only at {higher.name}</p>
              {uniqueBenefits.length > 0 ? (
                <ul className="mt-2.5 space-y-2.5">
                  {uniqueBenefits.map((x) => (
                    <li key={x} className="flex items-start gap-2.5 text-sm text-[var(--text)]">
                      <Check
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent-hi)]"
                        strokeWidth={3}
                        aria-hidden
                      />
                      <span className="min-w-0">{x}</span>
                    </li>
                  ))}
                  {hoursSaved > 0 && (
                    <li className="flex items-start gap-2.5 text-sm text-[var(--text)]">
                      <Clock
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent-hi)]"
                        strokeWidth={2.4}
                        aria-hidden
                      />
                      <span className="min-w-0">
                        {higher.settlementHours}h settlement target, down from{" "}
                        {lower.settlementHours}h
                      </span>
                    </li>
                  )}
                </ul>
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-low)]">
                  {higher.name} carries the same access lines as {lower.name}. The change is entry
                  size and settlement speed alone.
                </p>
              )}
            </div>
          </motion.section>

          <motion.section {...fade(0.06)} className="panel-hi edge-light p-5">
            <div className="flex items-center gap-2.5">
              <Wallet className="h-4 w-4 text-[var(--accent-hi)]" aria-hidden />
              <h2 className="text-[15px] font-semibold text-[var(--text-hi)]">The capital gap</h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text)]">
              {gap > 0 ? (
                <>
                  You have contributed {money(snap.contributed)} to date, so {money(gap)} more
                  reaches {higher.name}.
                </>
              ) : (
                <>
                  Your {money(snap.contributed)} contributed already clears the{" "}
                  {money(higher.entry)} entry for {higher.name}.
                </>
              )}
            </p>
            <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
              <Link
                to={`/app/vaults/new?amount=${higher.entry}`}
                className="btn btn-primary flex-1"
              >
                Place {money(higher.entry)} at {higher.name}
              </Link>
              <Link to={`/app/tiers/${higher.id}`} className="btn btn-outline flex-1">
                {higher.name} detail <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </motion.section>
        </>
      )}

      <p className="pb-2 text-center text-xs text-[var(--text-low)]">
        Not sure which rung fits?{" "}
        <Link to="/app/tiers/match" className="text-[var(--accent-hi)] hover:underline">
          Try Tier Match
        </Link>
      </p>
    </div>
  );
}
