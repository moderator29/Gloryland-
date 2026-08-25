import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, Check, Compass, RotateCcw } from "lucide-react";
import {
  CYCLE_DAYS,
  CYCLE_RETURN,
  TIERS,
  dailyReward,
  termReward,
  type Tier,
} from "@/domain/tiers";
import { useLedger } from "@/hooks/useLedger";
import { money } from "@/components/system/format";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Tier Match.
 *
 * Four questions, one per screen, scored against the published tier table.
 * It reports which rung the answers point at and why, in the member's own
 * terms. It never forecasts an outcome and never tells anyone what to do.
 */

type Choice = { label: string; hint: string };

const CAPITAL: (Choice & { budget: number; short: string })[] = [
  {
    label: "Under $1,000",
    hint: "Starting small while you learn the mechanics",
    budget: 999,
    short: "under $1,000",
  },
  {
    label: "$1,000 to $3,000",
    hint: "A defined amount set aside for a term",
    budget: 2999,
    short: "$1,000 to $3,000",
  },
  {
    label: "$3,000 to $8,000",
    hint: "A meaningful allocation across one or more vaults",
    budget: 7999,
    short: "$3,000 to $8,000",
  },
  {
    label: "$8,000 or more",
    hint: "Placing at the upper end of the ladder",
    budget: 25000,
    short: "$8,000 or more",
  },
];

const ACCESS: (Choice & { maxHours: number; short: string })[] = [
  {
    label: "Within the week",
    hint: "No hurry on a withdrawal request",
    maxHours: 72,
    short: "within the week",
  },
  {
    label: "Within two days",
    hint: "You would want it moving quickly",
    maxHours: 48,
    short: "within two days",
  },
  {
    label: "Within a day",
    hint: "Same business day turnaround matters",
    maxHours: 24,
    short: "within a day",
  },
  {
    label: "Same day, every time",
    hint: "Fastest settlement target on the ladder",
    maxHours: 6,
    short: "same day",
  },
];

const TOOLING: (Choice & { minRank: number; short: string })[] = [
  {
    label: "Just the essentials",
    hint: "Balance, term progress and rewards",
    minRank: 1,
    short: "the essentials only",
  },
  {
    label: "Performance analytics",
    hint: "Charts, projections and history",
    minRank: 2,
    short: "performance analytics",
  },
  {
    label: "Portfolio intelligence",
    hint: "Allocation views and multi-vault management",
    minRank: 3,
    short: "portfolio intelligence",
  },
  {
    label: "Everything, with coverage",
    hint: "Dedicated coverage and early access to new terms",
    minRank: 5,
    short: "the full toolset with dedicated coverage",
  },
];

const STANCE: (Choice & { rankBias: number; short: string })[] = [
  {
    label: "My first placement",
    hint: "Nothing open yet",
    rankBias: -0.35,
    short: "a first placement",
  },
  {
    label: "Adding to a position",
    hint: "Building on what is already running",
    rankBias: 0.35,
    short: "adding to a position",
  },
];

const STEPS: { eyebrow: string; title: string; body: string; options: Choice[] }[] = [
  {
    eyebrow: "Capital",
    title: "How much are you considering placing?",
    body: "A range is enough. It sets the rungs that are actually reachable.",
    options: CAPITAL,
  },
  {
    eyebrow: "Access",
    title: "How quickly might you need access?",
    body: "Tiers differ on the settlement target the desk works to, from 72 hours down to 6.",
    options: ACCESS,
  },
  {
    eyebrow: "Tooling",
    title: "How much tooling do you want?",
    body: "Analytics and portfolio tools unlock as you move up the ladder.",
    options: TOOLING,
  },
  {
    eyebrow: "Context",
    title: "Is this a first placement or an addition?",
    body: "This only nudges the result toward the cautious or the ambitious end of what fits.",
    options: STANCE,
  },
];

type Answers = [number, number, number, number];

/** The highest rung a stated range actually reaches. */
function affordableCeiling(budget: number): number {
  const reachable = TIERS.filter((t) => t.entry <= budget);
  return reachable.length ? reachable[reachable.length - 1].rank : TIERS[0].rank;
}

/** The lowest rung that meets a settlement expectation. */
function accessRank(maxHours: number): number {
  return (TIERS.find((t) => t.settlementHours <= maxHours) ?? TIERS[TIERS.length - 1]).rank;
}

function scoreTier(tier: Tier, a: Answers): number {
  const capital = CAPITAL[a[0]];
  const access = ACCESS[a[1]];
  const tooling = TOOLING[a[2]];
  const stance = STANCE[a[3]];

  // The rung their access and tooling answers actually call for, and the rung
  // their capital reaches. The result is never asked to climb more than one
  // step past what they said they need.
  const required = Math.max(tooling.minRank, accessRank(access.maxHours));
  const settleAt = Math.max(required, affordableCeiling(capital.budget) - 1);

  let s = 0;

  // Capital is the hard constraint: a rung above the stated range is penalised
  // in proportion to how far above it sits.
  if (tier.entry <= capital.budget) s += 4 + tier.rank * 0.4;
  else s -= 5 + ((tier.entry - capital.budget) / capital.budget) * 3;

  if (tier.settlementHours <= access.maxHours) s += 2.5;
  else s -= 1.5 + (tier.settlementHours - access.maxHours) / 24;

  if (tier.rank >= tooling.minRank) s += 2;
  else s -= 1.6 * (tooling.minRank - tier.rank);

  // Reaching past what the answers call for has to earn its place.
  s -= 0.5 * Math.max(0, tier.rank - settleAt);

  s += stance.rankBias * (tier.rank - 1);

  return s;
}

function rank(answers: Answers): Tier[] {
  return [...TIERS].sort((x, y) => {
    const d = scoreTier(y, answers) - scoreTier(x, answers);
    return d !== 0 ? d : x.rank - y.rank;
  });
}

function reasons(tier: Tier, a: Answers): string[] {
  const capital = CAPITAL[a[0]];
  const access = ACCESS[a[1]];
  const tooling = TOOLING[a[2]];
  const stance = STANCE[a[3]];
  const out: string[] = [];

  out.push(
    tier.entry <= capital.budget
      ? `You said ${capital.short}, which covers the ${money(tier.entry)} entry.`
      : `You said ${capital.short}. ${tier.name} starts at ${money(tier.entry)}, so it would take more than the range you named.`,
  );

  out.push(
    tier.settlementHours <= access.maxHours
      ? `You wanted access ${access.short}. This rung carries a ${tier.settlementHours} hour settlement target.`
      : `You wanted access ${access.short}. At ${tier.settlementHours} hours, this is the closest target the ladder offers inside your range.`,
  );

  const toolingHome = TIERS.find((t) => t.rank >= tooling.minRank);
  out.push(
    tier.rank >= tooling.minRank
      ? `You asked for ${tooling.short}, which is included from ${toolingHome?.name ?? tier.name} upward.`
      : `You asked for ${tooling.short}. That arrives at ${toolingHome?.name ?? "a higher rung"}, above what your stated range reaches.`,
  );

  out.push(
    stance.rankBias < 0
      ? `As ${stance.short}, the result leans to the steadier end of what your answers allow.`
      : `As ${stance.short}, the result leans to the higher end of what your answers allow.`,
  );

  const ceiling = affordableCeiling(capital.budget);
  const top = TIERS.find((t) => t.rank === ceiling);
  if (top && tier.rank < ceiling) {
    out.push(
      `Everything you asked for is covered here, one rung below ${top.name} at ${money(top.entry)}, which the same range would also reach.`,
    );
  }

  return out;
}

/* ── Progress ────────────────────────────────────────────────────────── */

function Track({ step, reduce }: { step: number; reduce: boolean }) {
  const total = STEPS.length;
  const done = Math.min(step, total);
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="eyebrow">
          {step < total ? `Question ${step + 1} of ${total}` : "Your match"}
        </p>
        <p className="tabular text-[11px] text-[var(--text-low)]">
          {Math.round((done / total) * 100)}%
        </p>
      </div>
      <div
        className="mt-2 grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-label="Tier Match progress"
      >
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className="h-1 overflow-hidden rounded-full"
            style={{ background: "rgba(5,7,15,0.7)" }}
          >
            <motion.span
              className="block h-full rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, var(--accent-deep), var(--accent), var(--accent-soft))",
              }}
              initial={reduce ? false : { width: 0 }}
              animate={{ width: i < done ? "100%" : "0%" }}
              transition={reduce ? { duration: 0 } : { duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            />
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Screen ──────────────────────────────────────────────────────────── */

export default function TierMatch() {
  const snap = useLedger();
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [picked, setPicked] = useState<(number | null)[]>([null, null, null, null]);

  const answers = useMemo<Answers | null>(
    () => (picked.every((p) => p !== null) ? (picked as Answers) : null),
    [picked],
  );

  const ordered = useMemo(() => (answers ? rank(answers) : []), [answers]);
  const best = ordered[0];
  const runnerUp = ordered[1];

  const choose = (index: number) => {
    setPicked((prev) => prev.map((p, i) => (i === step ? index : p)));
    setDir(1);
    setStep((s) => s + 1);
  };

  const back = () => {
    setDir(-1);
    setStep((s) => Math.max(0, s - 1));
  };

  const restart = () => {
    setPicked([null, null, null, null]);
    setDir(-1);
    setStep(0);
  };

  const variants = reduce
    ? undefined
    : {
        enter: (d: number) => ({ opacity: 0, x: d > 0 ? 28 : -28 }),
        center: { opacity: 1, x: 0 },
        exit: (d: number) => ({ opacity: 0, x: d > 0 ? -28 : 28 }),
      };

  const transition = reduce
    ? { duration: 0 }
    : { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const };

  const showResult = step >= STEPS.length && best && answers;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        {step === 0 ? (
          <Link to="/app/tiers" className="btn btn-ghost -ml-2 !py-1.5 !text-xs">
            <ArrowLeft className="h-4 w-4" /> Tiers
          </Link>
        ) : (
          <button type="button" onClick={back} className="btn btn-ghost -ml-2 !py-1.5 !text-xs">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        )}
        {step > 0 && (
          <button type="button" onClick={restart} className="btn btn-ghost !py-1.5 !text-xs">
            <RotateCcw className="h-3.5 w-3.5" /> Start over
          </button>
        )}
      </div>

      <header>
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-[var(--line-hi)] bg-[rgba(46,139,255,0.08)]">
            <Compass className="h-4 w-4 text-[var(--accent-hi)]" strokeWidth={1.9} aria-hidden />
          </span>
          <h1 className="display text-2xl sm:text-3xl">Tier Match</h1>
        </div>
        <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-[var(--text-low)]">
          Four questions about capital, access, tooling and context. The answers are read against
          the published tier table to show which rung may suit you.
        </p>
      </header>

      <Track step={step} reduce={reduce} />

      <AnimatePresence mode="wait" custom={dir} initial={false}>
        {!showResult ? (
          <motion.section
            key={`step-${step}`}
            custom={dir}
            variants={variants}
            initial={reduce ? false : "enter"}
            animate={reduce ? undefined : "center"}
            exit={reduce ? undefined : "exit"}
            transition={transition}
            className="panel-hi edge-light p-5 sm:p-6"
            aria-live="polite"
          >
            <p className="eyebrow">{STEPS[step].eyebrow}</p>
            <h2 className="display mt-1.5 text-xl sm:text-2xl">{STEPS[step].title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-mid)]">
              {STEPS[step].body}
            </p>

            <div className="mt-5 space-y-2.5">
              {STEPS[step].options.map((o, i) => {
                const active = picked[step] === i;
                return (
                  <button
                    key={o.label}
                    type="button"
                    aria-pressed={active}
                    onClick={() => choose(i)}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${
                      active
                        ? "border-[rgba(46,139,255,0.45)] bg-[rgba(46,139,255,0.1)]"
                        : "border-[var(--line)] bg-[rgba(17,24,41,0.5)] hover:border-[var(--line-hi)] hover:bg-[rgba(46,139,255,0.05)]"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-[var(--text-hi)]">
                        {o.label}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-[var(--text-low)]">
                        {o.hint}
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                        active
                          ? "border-[var(--accent)] bg-[var(--accent)] text-[#04101f]"
                          : "border-[var(--line-hi)]"
                      }`}
                    >
                      {active && <Check className="h-3 w-3" strokeWidth={3.5} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.section>
        ) : (
          <motion.section
            key="result"
            custom={dir}
            variants={variants}
            initial={reduce ? false : "enter"}
            animate={reduce ? undefined : "center"}
            exit={reduce ? undefined : "exit"}
            transition={transition}
            className="space-y-5"
            aria-live="polite"
          >
            <div className="panel-hi edge-light p-5 sm:p-6">
              <p className="eyebrow">May suit you</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
                <h2 className="display text-3xl">{best.name}</h2>
                <span className="chip chip-accent">
                  Tier {best.rank} of {TIERS.length}
                </span>
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-[var(--text-mid)]">{best.blurb}</p>

              <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                <div className="inset p-3">
                  <p className="eyebrow">Entry</p>
                  <p className="metric mt-1 text-base">{money(best.entry)}</p>
                </div>
                <div className="inset p-3">
                  <p className="eyebrow">Per day</p>
                  <p className="metric mt-1 text-base text-[var(--gain)]">
                    {money(dailyReward(best.entry), 2)}
                  </p>
                </div>
                <div className="inset p-3">
                  <p className="eyebrow">Per term</p>
                  <p className="metric mt-1 text-base text-[var(--gain)]">
                    {money(termReward(best.entry))}
                  </p>
                </div>
                <div className="inset p-3">
                  <p className="eyebrow">Settlement</p>
                  <p className="metric mt-1 text-base">{best.settlementHours}h</p>
                </div>
              </div>
              <p className="mt-2.5 text-[11px] leading-relaxed text-[var(--text-low)]">
                Figures are for a position at the entry amount over one {CYCLE_DAYS}-day term at the
                programme rate of {(CYCLE_RETURN * 100).toFixed(0)}%.
              </p>
            </div>

            <div className="panel p-5">
              <h3 className="text-[15px] font-semibold text-[var(--text-hi)]">
                Why your answers point here
              </h3>
              <ul className="mt-3 space-y-2.5">
                {reasons(best, answers).map((r) => (
                  <li key={r} className="flex items-start gap-2.5 text-sm text-[var(--text)]">
                    <Check
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent-hi)]"
                      strokeWidth={3}
                      aria-hidden
                    />
                    <span className="min-w-0 leading-relaxed">{r}</span>
                  </li>
                ))}
                {snap.tier ? (
                  <li className="flex items-start gap-2.5 text-sm text-[var(--text)]">
                    <Check
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent-hi)]"
                      strokeWidth={3}
                      aria-hidden
                    />
                    <span className="min-w-0 leading-relaxed">
                      You stand at {snap.tier.name} today on {money(snap.contributed)} contributed.
                    </span>
                  </li>
                ) : null}
              </ul>
            </div>

            {runnerUp && (
              <div className="inset flex flex-wrap items-center justify-between gap-3 p-4">
                <p className="min-w-0 text-xs leading-relaxed text-[var(--text-low)]">
                  Second closest on your answers: {runnerUp.name} at {money(runnerUp.entry)}, with a{" "}
                  {runnerUp.settlementHours}h settlement target.
                </p>
                <Link
                  to={`/app/tiers/${runnerUp.id}`}
                  className="btn btn-ghost !py-1.5 !text-xs shrink-0"
                >
                  View <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
            )}

            <div className="flex flex-col gap-2.5 sm:flex-row">
              <Link to={`/app/vaults/new?amount=${best.entry}`} className="btn btn-primary flex-1">
                Place {money(best.entry)} at {best.name}
              </Link>
              <Link to={`/app/tiers/${best.id}`} className="btn btn-outline flex-1">
                Read the {best.name} detail
              </Link>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row">
              <button type="button" onClick={back} className="btn btn-ghost flex-1">
                <ArrowLeft className="h-4 w-4" /> Change last answer
              </button>
              <button type="button" onClick={restart} className="btn btn-ghost flex-1">
                <RotateCcw className="h-3.5 w-3.5" /> Start over
              </button>
            </div>

            <p className="pb-2 text-center text-[11px] leading-relaxed text-[var(--text-low)]">
              Tier Match compares your answers to the published tier table. It is not financial
              advice, and it does not predict what any position will do.
            </p>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
