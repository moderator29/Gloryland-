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
  closeValue,
  compoundPosition,
  settlePosition,
  DAY_MS,
} from "@/domain/ledger";
import { DAILY_RATE, WITHDRAW_INTERVAL_DAYS, dailyReward } from "@/domain/tiers";
import { Value } from "@/components/system/Value";
import { Metric, Status } from "@/components/system/ui";
import { money, fullDate, days, relative } from "@/components/system/format";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { RelayPanel } from "@/features/relay";
import { Explain } from "@/features/explain";

/**
 * The moments in a position's life, rendered as a vertical timeline.
 *
 * It ends open on purpose. There is no maturity and no final step, so the last
 * entry is the one the position is living in rather than one it is travelling
 * toward, and the rail is drawn to the last event rather than to a proportion
 * of a length that does not exist.
 */
function Timeline({
  openedAt,
  startsAt,
  started,
  daysElapsed,
  closed,
  closedAt,
}: {
  openedAt: number;
  startsAt: number;
  started: boolean;
  daysElapsed: number;
  closed: boolean;
  closedAt: number | null;
}) {
  const reduce = useReducedMotion();
  const steps = [
    { icon: Lock, label: "Capital placed", at: openedAt, done: true },
    // Only shown when accrual begins later than the capital was committed,
    // because a step that always reads the same date as the one above it is
    // noise.
    ...(startsAt > openedAt
      ? [{ icon: Hourglass, label: "Accrual begins", at: startsAt, done: started }]
      : []),
    { icon: TrendingUp, label: "First full day", at: startsAt + DAY_MS, done: daysElapsed >= 1 },
    {
      icon: Sparkles,
      label: "First withdrawal window",
      at: startsAt + WITHDRAW_INTERVAL_DAYS * DAY_MS,
      done: daysElapsed >= WITHDRAW_INTERVAL_DAYS,
    },
  ];
  if (closed && closedAt !== null) {
    steps.push({ icon: Download, label: "Closed", at: closedAt, done: true });
  } else {
    steps.push({
      icon: Check,
      label: "Still accruing",
      at: startsAt + Math.max(1, Math.ceil(daysElapsed)) * DAY_MS,
      done: false,
    });
  }

  const reached = steps.filter((x) => x.done).length;
  const fill = steps.length > 1 ? (reached - 1) / (steps.length - 1) : 0;

  return (
    <ol className="relative space-y-5 pl-7">
      <span className="absolute bottom-2 left-[9px] top-2 w-px bg-[var(--line)]" aria-hidden />
      <motion.span
        aria-hidden
        className="absolute left-[9px] top-2 w-px origin-top"
        style={{ background: "linear-gradient(180deg, var(--accent), var(--accent-soft))" }}
        initial={reduce ? false : { height: 0 }}
        animate={{ height: `${Math.min(100, Math.max(0, fill) * 100)}%` }}
        transition={{ duration: reduce ? 0 : 1.1, ease: [0.22, 1, 0.36, 1] }}
      />
      {steps.map((step) => (
        <li key={step.label} className="relative">
          <span
            className={`absolute -left-7 grid h-[19px] w-[19px] place-items-center rounded-full border ${
              step.done
                ? "border-[var(--accent)] bg-[var(--accent)] text-[#04101f]"
                : "border-[var(--line-hi)] bg-[var(--ink-100)] text-[var(--text-low)]"
            }`}
          >
            <step.icon className="h-2.5 w-2.5" strokeWidth={3} />
          </span>
          <p
            className={`text-sm ${step.done ? "text-[var(--text-hi)]" : "text-[var(--text-low)]"}`}
          >
            {step.label}
          </p>
          <p className="mt-0.5 text-[11px] text-[var(--text-low)]">
            {step.done ? fullDate(step.at) : relative(step.at)}
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

  const onClose = () => {
    settlePosition(p);
    toast.success("Vault closed. Principal returned to available balance.");
    nav("/app/vaults");
  };

  /**
   * Fold the reward into the principal, as one write.
   *
   * It folds `claimable`, not `accrued`: rewards already claimed are already
   * cash and may already have been withdrawn, so folding the accrued figure
   * would open a position on money the ledger cannot pay. And the claim, the
   * close and the open are one batch rather than two writes and a form on
   * another route, because that sequence can be abandoned halfway, which leaves
   * a closed position and no new one.
   */
  const onCompound = () => {
    const folded = compoundPosition(p);
    if (!folded) return;
    toast.success(
      `${money(folded.carry, 2)} of principal, now accruing ${money(dailyReward(folded.carry), 2)} a day`,
    );
    nav(`/app/vaults/${folded.positionId}`);
  };

  const carry = carryOf(p);
  const exit = closeValue(p);

  return (
    <div className="space-y-6">
      <Link to="/app/vaults" className="min-h-[36px] btn btn-ghost -ml-2 !py-1.5 !text-xs">
        <ArrowLeft className="h-4 w-4" /> Vaults
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="display text-2xl sm:text-3xl">{p.tier.name} vault</h1>
            {/* Capital that has not begun accruing is committed capital, not
                working capital, and the badge says which. */}
            <Status kind={p.closed ? "closed" : p.started ? "accruing" : "pending"} />
          </div>
          <p className="mt-1.5 text-sm text-[var(--text-low)]">
            {money(p.principal)} placed {fullDate(p.openedAt)} · {p.asset} on {p.network}
          </p>
          {!p.started && (
            <p className="mt-1 text-sm text-[var(--text-low)]">
              Accrual begins {fullDate(p.startsAt)}. Nothing accrues until it does.
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
              {days(p.daysElapsed)} days at {money(p.dailyReward, 2)} a day, and still running
            </p>
            {/* The clock the explanation runs is accrual's, which is the start
                date rather than the commitment. They differ only on capital
                placed to begin later. */}
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
              <button onClick={onClose} className="btn btn-outline">
                <Download className="h-4 w-4" /> Close to cash
              </button>
              <button
                onClick={onCompound}
                disabled={p.claimable < 0.01}
                className="btn btn-primary"
              >
                <RefreshCw className="h-4 w-4" /> Compound to {money(carry, 2)}
              </button>
            </div>
          )}
        </div>

        {!p.closed && p.claimable >= 0.01 && (
          <div className="inset mt-5 flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text-hi)]">
                {money(p.claimable, 2)} is not accruing
              </p>
              {/* The carry is principal plus what is still unclaimed, which is
                  what the fold actually writes. Adding the accrued figure here
                  would quote rewards that have already been claimed out. */}
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-low)]">
                Accrual runs on principal alone, so this reward earns nothing while it sits here.
                Folding it in makes the principal {money(carry, 2)}, accruing{" "}
                {money(dailyReward(carry), 2)} a day.
                {p.claimed > 0
                  ? ` The ${money(p.claimed, 2)} you have already claimed stays in your balance.`
                  : ""}
              </p>
            </div>
          </div>
        )}

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
          every day, so it sits directly beneath them. Hidden once a position is
          closed, when there is nothing left to act on. */}
      {!p.closed && <RelayPanel position={p} relay={relay} />}

      {/* What closing costs, stated in dollars rather than in a clause.
          Nothing is forfeited by closing: accrual is paid for the days that
          actually ran. What a member gives up is the future, and the only
          honest way to state that is per day, because how long they would have
          left it there is their decision and not a figure this page may assume
          on their behalf. */}
      {!p.closed && p.started && (
        <section className="panel p-5">
          <h2 className="text-[15px] font-semibold text-[var(--text-hi)]">
            If you closed it today
          </h2>
          <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-low)]">
            Closing is available at any point and nothing is forfeited by it. Accrual is paid for
            the days the capital actually ran and stops at that instant. Cash then leaves the
            account on the {WITHDRAW_INTERVAL_DAYS} day withdrawal window like any other balance.
          </p>
          <dl className="ledger mt-4">
            <div className="rail-row">
              <dt className="min-w-0 flex-1 text-xs text-[var(--text-low)]">Principal returned</dt>
              <dd className="metric tabular shrink-0 text-sm">{money(exit.principal)}</dd>
            </div>
            <div className="rail-row">
              <dt className="min-w-0 flex-1 text-xs text-[var(--text-low)]">
                Unclaimed reward, claimed on the way out
              </dt>
              <dd className="metric tabular shrink-0 text-sm text-[var(--gain)]">
                {money(exit.claimable, 2)}
              </dd>
            </div>
            <div className="rail-row">
              <dt className="min-w-0 flex-1 text-xs text-[var(--text-low)]">
                Your balance receives
              </dt>
              <dd className="metric tabular shrink-0 text-sm">{money(exit.returns, 2)}</dd>
            </div>
            <div className="rail-row">
              <dt className="min-w-0 flex-1 text-xs text-[var(--text-low)]">
                Accrual it stops earning, per day
              </dt>
              <dd className="metric tabular shrink-0 text-sm text-[var(--warn)]">
                {money(exit.forgoneDaily, 2)}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] leading-relaxed text-[var(--text-low)]">
            {p.claimed > 0
              ? `The ${money(p.claimed, 2)} already claimed from this position is cash and stays in your balance. `
              : ""}
            There is no total to quote for what closing gives up, because there is no date the
            position would otherwise have ended on.
          </p>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-5">
          <h2 className="mb-4 text-[15px] font-semibold text-[var(--text-hi)]">Timeline</h2>
          <Timeline
            openedAt={p.openedAt}
            startsAt={p.startsAt}
            started={p.started}
            daysElapsed={p.daysElapsed}
            closed={p.closed}
            closedAt={p.closedAt}
          />
        </section>

        <section className="panel p-5">
          <h2 className="mb-4 text-[15px] font-semibold text-[var(--text-hi)]">Structure</h2>
          <dl className="space-y-3 text-sm">
            {[
              ["Rate", `${(DAILY_RATE * 100).toFixed(0)}% of principal a day`],
              ["Length", "No end date, runs until closed"],
              ["Accrual", "Daily, continuous, on principal only"],
              ["Days accruing", `${days(p.daysElapsed)}`],
              ["Withdrawal window", `every ${WITHDRAW_INTERVAL_DAYS} days`],
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
