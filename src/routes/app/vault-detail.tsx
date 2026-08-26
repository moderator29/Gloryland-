import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Download, Lock, RefreshCw, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { playTing } from "@/lib/sound";
import { useLedger } from "@/hooks/useLedger";
import { claimRewards, closePosition, DAY_MS } from "@/domain/ledger";
import { CYCLE_DAYS, CYCLE_RETURN } from "@/domain/tiers";
import { Value } from "@/components/system/Value";
import { Metric, Progress, Status } from "@/components/system/ui";
import { money, fullDate, days, relative } from "@/components/system/format";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { RelayPanel } from "@/features/relay";

/** The four moments in a term, rendered as a vertical timeline. */
function Timeline({
  openedAt,
  maturesAt,
  progress,
  matured,
  closed,
}: {
  openedAt: number;
  maturesAt: number;
  progress: number;
  matured: boolean;
  closed: boolean;
}) {
  const reduce = useReducedMotion();
  const halfway = openedAt + (maturesAt - openedAt) / 2;
  const steps = [
    { icon: Lock, label: "Capital placed", at: openedAt, done: true },
    { icon: TrendingUp, label: "Accrual running", at: openedAt + DAY_MS, done: progress > 0.03 },
    { icon: Sparkles, label: "Halfway", at: halfway, done: progress >= 0.5 },
    { icon: Check, label: "Term complete", at: maturesAt, done: matured },
  ];
  if (closed) steps.push({ icon: Download, label: "Settled", at: maturesAt, done: true });

  return (
    <ol className="relative space-y-5 pl-7">
      <span className="absolute bottom-2 left-[9px] top-2 w-px bg-[var(--line)]" aria-hidden />
      <motion.span
        aria-hidden
        className="absolute left-[9px] top-2 w-px origin-top"
        style={{ background: "linear-gradient(180deg, var(--accent), var(--accent-soft))" }}
        initial={reduce ? false : { height: 0 }}
        animate={{ height: `${Math.min(100, progress * 100)}%` }}
        transition={{ duration: reduce ? 0 : 1.1, ease: [0.22, 1, 0.36, 1] }}
      />
      {steps.map((s, i) => (
        <li key={s.label} className="relative">
          <span
            className={`absolute -left-7 grid h-[19px] w-[19px] place-items-center rounded-full border ${
              s.done
                ? "border-[var(--accent)] bg-[var(--accent)] text-[#04101f]"
                : "border-[var(--line-hi)] bg-[var(--ink-100)] text-[var(--text-low)]"
            }`}
          >
            <s.icon className="h-2.5 w-2.5" strokeWidth={3} />
          </span>
          <p className={`text-sm ${s.done ? "text-[var(--text-hi)]" : "text-[var(--text-low)]"}`}>
            {s.label}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--text-low)]">
            {i === 3 && !s.done ? relative(s.at) : fullDate(s.at)}
          </p>
        </li>
      ))}
    </ol>
  );
}

export default function VaultDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const snap = useLedger();
  const p = snap.positions.find((x) => x.id === id);
  const relay = snap.relays.find((r) => r.positionId === id);

  if (!p) {
    return (
      <div className="panel p-10 text-center">
        <p className="text-[var(--text-hi)]">That vault no longer exists.</p>
        <Link to="/app/vaults" className="btn btn-secondary mt-4">
          Back to vaults
        </Link>
      </div>
    );
  }

  const onClaim = () => {
    claimRewards(p.id, p.claimable);
    playTing();
    toast.success(`${money(p.claimable, 2)} moved to available balance`);
  };

  const onSettle = () => {
    if (p.claimable > 0) claimRewards(p.id, p.claimable);
    closePosition(p.id);
    toast.success("Vault settled. Principal returned to available balance.");
    nav("/app/vaults");
  };

  /**
   * Settle and immediately carry principal plus the full term reward into a
   * fresh term. This is the compounding path: rolling a matured position is
   * often what crosses a member into the next tier, so the amount is handed
   * straight to the placement flow rather than left sitting as idle cash.
   */
  const onRoll = () => {
    if (p.claimable > 0) claimRewards(p.id, p.claimable);
    closePosition(p.id);
    const carried = Math.round(p.principal + p.accrued);
    toast.success(`Carrying ${money(carried)} into a new term`);
    nav(`/app/vaults/new?amount=${carried}&from=${p.id}`);
  };

  return (
    <div className="space-y-6">
      <Link to="/app/vaults" className="btn btn-ghost -ml-2 !py-1.5 !text-xs">
        <ArrowLeft className="h-4 w-4" /> Vaults
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="display text-2xl sm:text-3xl">{p.tier.name} vault</h1>
            <Status kind={p.closed ? "closed" : p.matured ? "matured" : "accruing"} />
          </div>
          <p className="mt-1.5 text-sm text-[var(--text-low)]">
            {money(p.principal)} placed {fullDate(p.openedAt)} · {p.asset} on {p.network}
          </p>
        </div>
      </div>

      <section className="panel-hi edge-light p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Earned so far</p>
            <p className="metric mt-2 text-4xl text-[var(--gain)]">
              <Value value={p.accrued} decimals={2} />
            </p>
            <p className="mt-1.5 text-xs text-[var(--text-low)]">
              of {money(p.termReward)} across the full term
            </p>
          </div>
          {!p.closed && (
            <div className="flex flex-wrap gap-2">
              <button onClick={onClaim} disabled={p.claimable < 0.01} className="btn btn-secondary">
                Claim {p.claimable >= 0.01 ? money(p.claimable, 2) : ""}
              </button>
              {p.matured && (
                <>
                  <button onClick={onSettle} className="btn btn-outline">
                    <Download className="h-4 w-4" /> Settle to cash
                  </button>
                  <button onClick={onRoll} className="btn btn-primary">
                    <RefreshCw className="h-4 w-4" /> Roll now
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {p.matured && !p.closed && (
          <div className="inset mt-5 flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text-hi)]">Term complete</p>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-low)]">
                {money(p.principal + p.accrued)} is ready and is not accruing while it waits.
                Rolling it starts a new {CYCLE_DAYS} day term.
              </p>
            </div>
          </div>
        )}

        <div className="mt-6">
          <div className="mb-2 flex justify-between text-xs text-[var(--text-low)]">
            <span>
              Day {days(p.daysElapsed)} of {CYCLE_DAYS}
            </span>
            <span>{Math.round(p.progress * 100)}%</span>
          </div>
          <Progress
            value={p.progress}
            tone={p.matured ? "gain" : "accent"}
            height={8}
            label="Term progress"
          />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Metric label="Principal">{money(p.principal)}</Metric>
          <Metric label="Per day" tone="gain">
            {money(p.dailyReward, 2)}
          </Metric>
          <Metric label="Claimed">{money(p.claimed, 2)}</Metric>
          <Metric label="Claimable" tone="accent">
            <Value value={p.claimable} decimals={2} />
          </Metric>
        </div>
      </section>

      {/* Arming is the alternative to performing the actions above by hand
          every month, so it sits directly beneath them. Hidden once a term is
          settled, when there is nothing left to carry. */}
      {!p.closed && <RelayPanel position={p} relay={relay} />}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="mb-4 text-[15px] font-semibold text-[var(--text-hi)]">Term timeline</h2>
          <Timeline
            openedAt={p.openedAt}
            maturesAt={p.maturesAt}
            progress={p.progress}
            matured={p.matured}
            closed={p.closed}
          />
        </section>

        <section className="panel p-5">
          <h2 className="mb-4 text-[15px] font-semibold text-[var(--text-hi)]">Terms</h2>
          <dl className="space-y-3 text-sm">
            {[
              ["Term length", `${CYCLE_DAYS} days`],
              ["Term return", `${(CYCLE_RETURN * 100).toFixed(0)}%`],
              ["Accrual", "Daily, continuous"],
              ["Matures", fullDate(p.maturesAt)],
              ["Settlement target", `${p.tier.settlementHours}h`],
              ["Tier", p.tier.name],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between gap-4 border-b border-[var(--line)] pb-3 last:border-0 last:pb-0"
              >
                <dt className="text-[var(--text-low)]">{k}</dt>
                <dd className="tabular text-right font-medium text-[var(--text-hi)]">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
