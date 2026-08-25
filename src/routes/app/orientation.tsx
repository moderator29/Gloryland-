import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Clock, Compass, Layers, Rocket } from "lucide-react";
import {
  CYCLE_DAYS,
  CYCLE_RETURN,
  DAILY_RATE,
  TIERS,
  dailyReward,
  termReward,
} from "@/domain/tiers";
import { money } from "@/components/system/format";
import { Value } from "@/components/system/Value";
import { NAV } from "@/components/shell/nav";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { ORIENTATION_KEY } from "@/features/onboarding";

/**
 * Orientation: the first run introduction.
 *
 * A route, never a modal. Someone who wants to read this again should be able
 * to reach it by address, share it, or leave halfway and come back, and none
 * of that works when the content is trapped in an overlay.
 *
 * Four panels, skippable from the first one. Every figure on this page is
 * computed from the same domain constants the rest of the product uses, so
 * orientation cannot drift from what a vault actually does.
 */

const TERM_PCT = (CYCLE_RETURN * 100).toFixed(0);
const DAILY_PCT = (DAILY_RATE * 100).toFixed(0);

/** One line on what each surface is for, keyed by its route. */
const SURFACE_BLURB: Record<string, string> = {
  "/app": "Your standing at a glance and anything that needs attention.",
  "/app/desk": "Where you act: fund a vault, request a withdrawal, read the market.",
  "/app/vaults": "Every position you hold and how far through its term it is.",
  "/app/tiers": "The ladder, what each rung unlocks, and what it takes to reach it.",
  "/app/rewards": "Accrued rewards and claiming.",
  "/app/market": "Live prices for the assets you can fund with.",
  "/app/signal": "Notes published by the platform.",
  "/app/insights": "Observations drawn from your own ledger.",
  "/app/analytics": "Charts for value, rewards and allocation.",
  "/app/activity": "The complete record of every event on your account.",
  "/app/copilot": "The analyst assistant.",
  "/app/support": "Practical help with using the product.",
  "/app/circle": "Invites and the people you brought in.",
  "/app/settings": "Identity, motion, notifications and your data.",
};

const SURFACE_COUNT = NAV.reduce((n, g) => n + g.items.length, 0);

const STEPS = [
  { id: "vault", label: "The vault", icon: Compass },
  { id: "tiers", label: "The ladder", icon: Layers },
  { id: "map", label: "The map", icon: Clock },
  { id: "start", label: "Begin", icon: Rocket },
] as const;

/* ── Panel one: what a vault is ─────────────────────────────────────────── */

function VaultPanel() {
  const [amount, setAmount] = useState(TIERS[0].entry);

  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">Step one</p>
        <h2 className="display mt-1.5 text-2xl sm:text-3xl">What a vault is</h2>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-[var(--text-mid)]">
          A vault is capital you place for a fixed term. The term runs {CYCLE_DAYS} days and returns{" "}
          {TERM_PCT}% of what you placed, which works out to {DAILY_PCT}% of principal accruing
          every day. Rewards build continuously across the term rather than landing in one payment
          at the end, and accrual stops the moment the term matures.
        </p>
      </div>

      <div className="ledger">
        <div className="rail-row">
          <span className="tag-micro flex-1">Term length</span>
          <span className="metric tabular text-base">{CYCLE_DAYS} days</span>
        </div>
        <div className="rail-row">
          <span className="tag-micro flex-1">Daily accrual</span>
          <span className="metric tabular text-base">{DAILY_PCT}% of principal</span>
        </div>
        <div className="rail-row rail-row-gain">
          <span className="tag-micro flex-1">Return over the full term</span>
          <span className="metric tabular text-base text-[var(--gain)]">{TERM_PCT}%</span>
        </div>
      </div>

      <div className="panel p-4 sm:p-5">
        <p className="eyebrow">Work it through</p>
        <p className="mt-2 text-sm text-[var(--text-mid)]">
          Pick an amount to see the arithmetic. These are the entry points of the tier ladder.
        </p>

        <div className="mt-3.5 flex flex-wrap gap-2">
          {TIERS.map((t) => {
            const on = t.entry === amount;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setAmount(t.entry)}
                aria-pressed={on}
                className={`chip ${on ? "chip-accent" : ""} transition-colors`}
              >
                {money(t.entry)}
              </button>
            );
          })}
        </div>

        <dl className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <div className="inset p-3.5">
            <dt className="eyebrow">Each day</dt>
            <dd className="metric mt-1.5 text-lg text-[var(--text-hi)]">
              <Value value={dailyReward(amount)} decimals={2} />
            </dd>
          </div>
          <div className="inset p-3.5">
            <dt className="eyebrow">Over {CYCLE_DAYS} days</dt>
            <dd className="metric mt-1.5 text-lg text-[var(--gain)]">
              <Value value={termReward(amount)} decimals={2} />
            </dd>
          </div>
          <div className="inset p-3.5">
            <dt className="eyebrow">Back at maturity</dt>
            <dd className="metric mt-1.5 text-lg text-[var(--accent-hi)]">
              <Value value={amount + termReward(amount)} decimals={2} />
            </dd>
          </div>
        </dl>

        <p className="mt-3.5 text-[11px] leading-relaxed text-[var(--text-low)]">
          Principal plus reward, worked out from the published term. It is arithmetic on the terms
          above, not a forecast of anything.
        </p>
      </div>
    </div>
  );
}

/* ── Panel two: what tiers change ───────────────────────────────────────── */

function TiersPanel() {
  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">Step two</p>
        <h2 className="display mt-1.5 text-2xl sm:text-3xl">What a tier changes</h2>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-[var(--text-mid)]">
          Not the rate. Every tier earns the same {TERM_PCT}% over the same {CYCLE_DAYS} days, from
          the first rung to the last. What moves as you climb is access and how fast the desk
          targets settling a withdrawal request.
        </p>
      </div>

      <div className="ledger">
        {TIERS.map((t) => (
          <div key={t.id} className="rail-row flex-wrap">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-[var(--text-hi)]">{t.name}</span>
              <span className="mt-0.5 block text-xs text-[var(--text-low)]">
                From {money(t.entry)}
              </span>
            </span>
            <span className="chip chip-gain shrink-0">{TERM_PCT}% term</span>
            <span className="chip shrink-0">{t.settlementHours}h settlement target</span>
          </div>
        ))}
      </div>

      <p className="text-xs leading-relaxed text-[var(--text-low)]">
        Your tier follows your lifetime contribution, so it is reached by placing capital rather
        than by buying a plan. Settlement figures are the target the desk works to, not a guarantee.
      </p>
    </div>
  );
}

/* ── Panel three: where things live ─────────────────────────────────────── */

function MapPanel() {
  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">Step three</p>
        <h2 className="display mt-1.5 text-2xl sm:text-3xl">Where things live</h2>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-[var(--text-mid)]">
          {SURFACE_COUNT} surfaces in {NAV.length} groups. Anything that is a detail of one of these
          lives inside it rather than beside it in the navigation.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {NAV.map((group) => (
          <section key={group.heading} className="panel p-4">
            <div className="band-head">
              <h3 className="band-title">{group.heading}</h3>
              <span className="hairline" aria-hidden="true" />
            </div>
            <ul className="mt-3 space-y-2.5">
              {group.items.map((item) => (
                <li key={item.to} className="flex items-start gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-[rgba(46,139,255,0.07)]">
                    <item.icon className="h-4 w-4 text-[var(--accent-hi)]" strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-[var(--text-hi)]">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-[var(--text-low)]">
                      {SURFACE_BLURB[item.to] ?? ""}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

/* ── Panel four: the close ──────────────────────────────────────────────── */

function StartPanel({ onLeave }: { onLeave: () => void }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">Step four</p>
        <h2 className="display mt-1.5 text-2xl sm:text-3xl">That is the whole model</h2>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-[var(--text-mid)]">
          Place capital, watch it accrue {DAILY_PCT}% a day, claim rewards whenever you like, and
          collect your principal when the {CYCLE_DAYS} days are up. Everything else in the product
          is a view onto that one movement.
        </p>
      </div>

      <div className="panel-hi edge-light p-5">
        <p className="eyebrow">Ready when you are</p>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-[var(--text-mid)]">
          Opening a vault starts at {money(TIERS[0].entry)}, the entry point of the {TIERS[0].name}{" "}
          tier. Nothing is committed until you confirm it.
        </p>
        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <Link to="/app/vaults/new" onClick={onLeave} className="btn btn-primary">
            Open your first vault <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/app" onClick={onLeave} className="btn btn-ghost">
            Look around first
          </Link>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-[var(--text-low)]">
        Orientation stays at this address. You can return to it whenever you want a refresher.
      </p>
    </div>
  );
}

/* ── The route ──────────────────────────────────────────────────────────── */

export default function OrientationRoute() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);

  const last = STEPS.length - 1;

  const markDone = () => {
    try {
      localStorage.setItem(ORIENTATION_KEY, String(Date.now()));
    } catch {
      /* a blocked store only means orientation offers itself again */
    }
  };

  const skip = () => {
    markDone();
    navigate("/app");
  };

  const go = (next: number) => {
    setDir(next > step ? 1 : -1);
    setStep(Math.max(0, Math.min(last, next)));
  };

  const panelMotion = reduce
    ? {}
    : {
        initial: { opacity: 0, x: dir * 18 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: dir * -18 },
        transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Orientation</p>
          <h1 className="display mt-1 text-xl sm:text-2xl">Getting your bearings</h1>
        </div>
        <button type="button" onClick={skip} className="btn btn-ghost shrink-0">
          Skip orientation
        </button>
      </header>

      {/* Step indicator: a widening segment for the panel you are on. */}
      <div>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {STEPS.map((s, i) => (
            <motion.span
              key={s.id}
              className="h-1 rounded-full"
              style={{
                background:
                  i <= step
                    ? "linear-gradient(90deg, var(--accent-deep), var(--accent-hi))"
                    : "var(--line-hi)",
              }}
              initial={false}
              animate={{ width: i === step ? 34 : 12, opacity: i <= step ? 1 : 0.5 }}
              transition={reduce ? { duration: 0 } : { duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            />
          ))}
        </div>
        <p className="eyebrow mt-2.5" role="status" aria-live="polite">
          Step {step + 1} of {STEPS.length}. {STEPS[step].label}
        </p>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.section key={STEPS[step].id} {...panelMotion}>
          {step === 0 && <VaultPanel />}
          {step === 1 && <TiersPanel />}
          {step === 2 && <MapPanel />}
          {step === 3 && <StartPanel onLeave={markDone} />}
        </motion.section>
      </AnimatePresence>

      <nav
        aria-label="Orientation steps"
        className="flex items-center justify-between gap-3 border-t border-[var(--line)] pt-4"
      >
        <button
          type="button"
          onClick={() => go(step - 1)}
          disabled={step === 0}
          className="btn btn-ghost"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {step < last ? (
          <button type="button" onClick={() => go(step + 1)} className="btn btn-primary">
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button type="button" onClick={skip} className="btn btn-outline">
            <Check className="h-4 w-4" /> Finish
          </button>
        )}
      </nav>
    </div>
  );
}
