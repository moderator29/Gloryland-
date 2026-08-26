import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Download,
  Hourglass,
  Lock,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { playTing } from "@/lib/sound";
import { useLedger } from "@/hooks/useLedger";
import {
  carryOf,
  claimRewards,
  earlyExit,
  rollPosition,
  settlePosition,
  DAY_MS,
} from "@/domain/ledger";
import { CYCLE_DAYS, CYCLE_RETURN } from "@/domain/tiers";
import { Value } from "@/components/system/Value";
import { Metric, Progress, Status } from "@/components/system/ui";
import { money, fullDate, days, relative } from "@/components/system/format";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { RelayPanel } from "@/features/relay";
import { Explain } from "@/features/explain";

/** The moments in a term, rendered as a vertical timeline. */
function Timeline({
  openedAt,
  startsAt,
  started,
  maturesAt,
  progress,
  matured,
  closed,
}: {
  openedAt: number;
  startsAt: number;
  started: boolean;
  maturesAt: number;
  progress: number;
  matured: boolean;
  closed: boolean;
}) {
  const reduce = useReducedMotion();
  const halfway = startsAt + (maturesAt - startsAt) / 2;
  const steps = [
    { icon: Lock, label: "Capital placed", at: openedAt, done: true },
    // Only shown when the term begins later than it was committed, because a
    // step that always reads the same date as the one above it is noise.
    ...(startsAt > openedAt
      ? [{ icon: Hourglass, label: "Term begins", at: startsAt, done: started }]
      : []),
    { icon: TrendingUp, label: "Accrual running", at: startsAt + DAY_MS, done: progress > 0.03 },
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
    settlePosition(p);
    toast.success("Vault settled. Principal returned to available balance.");
    nav("/app/vaults");
  };

  /**
   * Settle and carry straight into a fresh term, as one write.
   *
   * It carries `claimable`, not `accrued`: rewards already claimed are already
   * cash and may already have been withdrawn, so carrying the accrued figure
   * would open a term on money the ledger cannot pay. And the claim, the close
   * and the open are one batch rather than two writes and a form on another
   * route, because that sequence can be abandoned halfway, which leaves a
   * settled position and no new one.
   */
  const onRoll = () => {
    const rolled = rollPosition(p);
    if (!rolled) return;
    toast.success(`Carrying ${money(rolled.carry)} into a new ${CYCLE_DAYS} day term`);
    nav(`/app/vaults/${rolled.positionId}`);
  };

  const carry = carryOf(p);
  const exit = earlyExit(p);

  return (
    <div className="space-y-6">
      <Link to="/app/vaults" className="min-h-[36px] btn btn-ghost -ml-2 !py-1.5 !text-xs">
        <ArrowLeft className="h-4 w-4" /> Vaults
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="display text-2xl sm:text-3xl">{p.tier.name} vault</h1>
            {/* A term that has not begun is committed capital, not accruing
                capital, and the badge says which. */}
            <Status
              kind={
                p.closed ? "closed" : p.matured ? "matured" : p.started ? "accruing" : "pending"
              }
            />
          </div>
          <p className="mt-1.5 text-sm text-[var(--text-low)]">
            {money(p.principal)} placed {fullDate(p.openedAt)} · {p.asset} on {p.network}
          </p>
          {!p.started && (
            <p className="mt-1 text-sm text-[var(--text-low)]">
              The term begins {fullDate(p.startsAt)}. Nothing accrues until it does.
            </p>
          )}
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
            {/* The clock the explanation runs is the term's, which is the
                start date rather than the commitment. They differ only on a
                term that was placed to begin later. */}
            <Explain
              id="accrued"
              ctx={{ principal: p.principal, openedAt: p.startsAt }}
              className="mt-2"
            />
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
                    <RefreshCw className="h-4 w-4" /> Roll {money(carry)}
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
              {/* The carry is principal plus what is still unclaimed, which is
                  what the roll actually writes. Adding the accrued figure here
                  would quote rewards that have already been claimed out. */}
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-low)]">
                {money(carry)} is ready and is not accruing while it waits. Rolling it starts a new{" "}
                {CYCLE_DAYS} day term.
                {p.claimed > 0
                  ? ` The ${money(p.claimed, 2)} you have already claimed stays in your balance.`
                  : ""}
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

      {/* What an early exit would cost, stated rather than offered.
          The terms, the risk page and the FAQ all describe an early exit as an
          exception the desk may refuse, so there is no button here: a control
          would turn an exception into a right the product does not grant. What
          the ledger can answer is the price, from this position's own figures,
          and a member deciding whether to commit for thirty days deserves to
          read it in dollars rather than in a clause. */}
      {!p.closed && !p.matured && p.started && (
        <section className="panel p-5">
          <h2 className="text-[15px] font-semibold text-[var(--text-hi)]">Before maturity</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-low)]">
            Capital in an open term is not available on demand. An early exit is handled as an
            exception, forfeits accrual on the unfinished term, and may not be granted at all. There
            is no way to request one in this build. If ending this term early were granted today, it
            would read like this.
          </p>
          <dl className="ledger mt-4">
            <div className="rail-row">
              <dt className="min-w-0 flex-1 text-xs text-[var(--text-low)]">Principal returned</dt>
              <dd className="metric tabular shrink-0 text-sm">{money(exit.principal)}</dd>
            </div>
            <div className="rail-row">
              <dt className="min-w-0 flex-1 text-xs text-[var(--text-low)]">
                Accrual forfeited, unclaimed on this term
              </dt>
              <dd className="metric tabular shrink-0 text-sm text-[var(--warn)]">
                {money(exit.forfeited, 2)}
              </dd>
            </div>
            <div className="rail-row">
              <dt className="min-w-0 flex-1 text-xs text-[var(--text-low)]">
                Reward the remaining {days(exit.daysRemaining)} days would have added
              </dt>
              <dd className="metric tabular shrink-0 text-sm text-[var(--warn)]">
                {money(exit.foregone, 2)}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] leading-relaxed text-[var(--text-low)]">
            {p.claimed > 0
              ? `The ${money(p.claimed, 2)} already claimed from this term is cash and stays in your balance. `
              : ""}
            Both figures move every day the term runs, and reach zero at maturity.
          </p>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="mb-4 text-[15px] font-semibold text-[var(--text-hi)]">Term timeline</h2>
          <Timeline
            openedAt={p.openedAt}
            startsAt={p.startsAt}
            started={p.started}
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
