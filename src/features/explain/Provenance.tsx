import { useId } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, TriangleAlert } from "lucide-react";
import type { Position, Snapshot } from "@/domain/ledger";
import { CYCLE_DAYS, DAILY_RATE, TIERS, termReward, tierForAmount } from "@/domain/tiers";
import { days, fullDate, money, relative } from "@/components/system/format";
import {
  explainValue,
  getDefinition,
  glossaryHref,
  previewPosition,
  type ExplainContext,
  type FigureId,
} from "./definitions";

/**
 * Provenance: the full derivation of one figure, line by line.
 *
 * The larger companion to `Explain`. Where that answers a passing question
 * beside a metric, this belongs on a detail page, where a member has come
 * specifically to check the arithmetic. Each step names an input, states what
 * the model does with it, and shows the value, so principal can be followed to
 * the final figure without leaving the page.
 *
 * Every number below is read off a derived `Position` or `Snapshot`, or off a
 * position produced by `previewPosition`, which runs `derive` in
 * `@/domain/ledger` over a synthetic one event log. Nothing here recomputes
 * accrual, so this block cannot disagree with the figure it is explaining.
 */

const DAILY_PCT = `${(DAILY_RATE * 100).toFixed(0)}%`;
const ENTRY = TIERS[0];
const LADDER = TIERS.map((t) => `${t.name} ${money(t.entry)}`).join(", ");
const TARGETS = TIERS.map((t) => `${t.name} ${t.settlementHours}h`).join(", ");

type Tone = "default" | "gain" | "accent" | "warn";

type Step = {
  /** Short technical label for the input. Omitted on a plain prose step. */
  label?: string;
  detail: string;
  value?: string;
  tone?: Tone;
};

export type ProvenanceProps = {
  id: FigureId;
  /** A derived position, when the figure belongs to one vault. */
  position?: Position;
  /** A derived snapshot, for figures that describe the whole account. */
  snap?: Snapshot;
  /** Raw inputs, used only when no derived position is to hand. */
  ctx?: ExplainContext;
  className?: string;
};

/* ── step builders ──────────────────────────────────────────────────────── */

function positionSteps(id: FigureId, p: Position): Step[] | null {
  switch (id) {
    case "principal":
      return [
        {
          label: "Open event",
          detail: `Recorded ${fullDate(p.openedAt)} at the ${p.tier.name} tier.`,
          value: money(p.principal),
        },
        {
          label: "Every later event",
          detail:
            "A claim moves rewards, a withdrawal moves cash. Neither writes back to the open event.",
          value: "no change",
        },
        {
          label: "Principal",
          detail: "The figure every other number on this position is built from.",
          value: money(p.principal),
          tone: "accent",
        },
      ];

    case "accrued":
      return [
        {
          label: "Principal",
          detail: `Recorded on the open event ${fullDate(p.openedAt)}.`,
          value: money(p.principal),
        },
        {
          label: "Daily rate",
          detail: `${DAILY_PCT} of principal per day, the same rate at every tier.`,
          value: `${money(p.dailyReward, 2)} / day`,
        },
        {
          label: "Days elapsed",
          detail: p.closed
            ? "Measured from the open event to the settlement instant."
            : "Measured from the open event to now, whole and fractional.",
          value: `${days(p.daysElapsed)} days`,
        },
        {
          label: "Bound",
          detail: p.closed
            ? "The clock was cut at settlement, so accrual is frozen where it stood."
            : p.matured
              ? `Days elapsed is capped at ${CYCLE_DAYS}, so accrual stopped at maturity.`
              : `Days elapsed is capped at ${CYCLE_DAYS}. This term has not reached that cap yet.`,
          value: p.closed ? "settled" : p.matured ? "matured" : "running",
          tone: p.closed || p.matured ? "warn" : "default",
        },
        {
          label: "Accrued",
          detail: "Principal at the daily rate, for the days elapsed.",
          value: money(p.accrued, 2),
          tone: "gain",
        },
      ];

    case "daily":
      return [
        {
          label: "Principal",
          detail: "The amount the open event placed into this vault.",
          value: money(p.principal),
        },
        {
          label: "Rate",
          detail: `${DAILY_PCT} of principal per day, identical from ${ENTRY.name} to ${TIERS[TIERS.length - 1].name}.`,
          value: DAILY_PCT,
        },
        {
          label: "Daily accrual",
          detail: p.matured
            ? "The term has matured, so this position has stopped adding to the daily figure."
            : "What this position adds each day for the rest of the term.",
          value: p.matured ? "stopped" : `${money(p.dailyReward, 2)} / day`,
          tone: p.matured ? "warn" : "gain",
        },
      ];

    case "termTotal":
      return [
        {
          label: "Principal",
          detail: "The amount the open event placed into this vault.",
          value: money(p.principal),
        },
        {
          label: "Daily rate",
          detail: `${DAILY_PCT} of principal per day.`,
          value: `${money(p.dailyReward, 2)} / day`,
        },
        {
          label: "Term length",
          detail: "Fixed the moment the vault was opened.",
          value: `${CYCLE_DAYS} days`,
        },
        {
          label: "Term reward",
          detail: "The ceiling on this position. Accrual rises toward it and stops there.",
          value: money(p.termReward, 2),
          tone: "gain",
        },
        {
          label: "Released at settlement",
          detail: "Principal back to available cash, alongside the rewards accrued.",
          value: money(p.principal + p.termReward),
          tone: "accent",
        },
      ];

    case "progress":
      return [
        {
          label: "Days elapsed",
          detail: p.closed
            ? "Measured to the settlement instant, where the clock was cut."
            : "Measured from the open event to now.",
          value: `${days(p.daysElapsed)} days`,
        },
        {
          label: "Term length",
          detail: "The divisor. Every term is the same length.",
          value: `${CYCLE_DAYS} days`,
        },
        {
          label: "Remaining",
          detail: p.matured ? "The term is complete." : "What is left of the term.",
          value: `${days(p.daysRemaining)} days`,
        },
        {
          label: "Term progress",
          detail: "Days elapsed divided by the term length, moving continuously.",
          value: `${(p.progress * 100).toFixed(1)}%`,
          tone: "accent",
        },
      ];

    case "maturity":
      return [
        {
          label: "Opened",
          detail: "The instant the open event was recorded.",
          value: fullDate(p.openedAt),
        },
        {
          label: "Term length",
          detail: "Added to the open time. Nothing moves it afterwards.",
          value: `${CYCLE_DAYS} days`,
        },
        {
          label: "Matures",
          detail: relative(p.maturesAt),
          value: fullDate(p.maturesAt),
          tone: "accent",
        },
        {
          label: "State",
          detail: p.closed
            ? "Settled. The principal has already returned to available cash."
            : p.matured
              ? "Matured and still open. Settling returns the principal to available cash."
              : "Accruing. The term has not completed yet.",
          value: p.closed ? "settled" : p.matured ? "matured" : "accruing",
          tone: p.matured || p.closed ? "warn" : "default",
        },
      ];

    default:
      return null;
  }
}

function snapshotSteps(id: FigureId, s: Snapshot): Step[] | null {
  switch (id) {
    case "available": {
      // `derive` calls this returned principal: the principal of every position
      // carrying a close event. Read off the derived positions rather than the
      // raw events, so it cannot disagree with the snapshot beside it.
      const settled = s.positions.filter((p) => p.closed);
      const returned = settled.reduce((sum, p) => sum + p.principal, 0);
      return [
        {
          label: "Rewards claimed",
          detail: "Every claim event, at the amount it recorded.",
          value: money(s.rewardsClaimed, 2),
        },
        {
          label: "Principal returned",
          detail: settled.length
            ? `${settled.length} settled vault${settled.length === 1 ? "" : "s"} returned principal to cash.`
            : "No vault has been settled yet.",
          value: money(returned, 2),
        },
        {
          label: "Withdrawals",
          detail: "Every withdraw event subtracts at its recorded amount.",
          value: `- ${money(s.withdrawn, 2)}`,
        },
        {
          label: "Available cash",
          detail: "Floored at zero, so the figure never reads negative.",
          value: money(s.available, 2),
          tone: "accent",
        },
      ];
    }

    case "portfolioValue":
      return [
        {
          label: "Deployed principal",
          detail: `Principal across ${s.activePositions.length} open vault${s.activePositions.length === 1 ? "" : "s"}.`,
          value: money(s.deployed),
        },
        {
          label: "Unclaimed rewards",
          detail: "Lifetime accrued less everything already claimed, floored at zero.",
          value: money(s.rewardsPending, 2),
          tone: "gain",
        },
        {
          label: "Available cash",
          detail: "Settled money that has not been withdrawn.",
          value: money(s.available, 2),
        },
        {
          label: "Withdrawn",
          detail: `${money(s.withdrawn, 2)} has left the portfolio. It counts toward net gain, not toward value held.`,
          value: "not counted",
        },
        {
          label: "Portfolio value",
          detail: "The three lines above, added.",
          value: money(s.portfolioValue, 2),
          tone: "accent",
        },
      ];

    case "lifetime": {
      if (!s.positions.length) {
        return [
          {
            label: "Positions",
            detail: "No vault has been opened yet, so there is nothing to sum.",
            value: money(0, 2),
          },
          {
            label: "Lifetime rewards",
            detail: "The total starts the moment the first vault is opened.",
            value: money(s.rewardsAccrued, 2),
            tone: "gain",
          },
        ];
      }
      const shown = s.positions.slice(0, 5);
      const rest = s.positions.slice(5);
      const steps: Step[] = shown.map((p) => ({
        label: `${p.tier.name} vault`,
        detail: `${money(p.principal)} opened ${fullDate(p.openedAt)}${p.closed ? ", settled" : ""}.`,
        value: money(p.accrued, 2),
      }));
      if (rest.length) {
        steps.push({
          label: `${rest.length} further position${rest.length === 1 ? "" : "s"}`,
          detail: "Each computed on its own clock, then summed with the rest.",
          value: money(
            rest.reduce((sum, p) => sum + p.accrued, 0),
            2,
          ),
        });
      }
      steps.push({
        label: "Lifetime rewards",
        detail: "Every position, open and settled. Claiming does not remove anything from it.",
        value: money(s.rewardsAccrued, 2),
        tone: "gain",
      });
      return steps;
    }

    case "standing": {
      const opens = s.events.filter((e) => e.kind === "open").length;
      return [
        {
          label: "Lifetime contribution",
          detail: `${opens} open event${opens === 1 ? "" : "s"}, summed. Settled vaults stay in the total.`,
          value: money(s.contributed),
        },
        {
          label: "The ladder",
          detail: LADDER,
        },
        {
          label: "Highest entry cleared",
          detail: s.tier
            ? `${s.tier.name} opens at ${money(s.tier.entry)}, and nothing above it is cleared yet.`
            : `The first rung opens at ${money(ENTRY.entry)}.`,
          value: s.tier ? money(s.tier.entry) : "none cleared",
        },
        {
          label: "Distance to next",
          detail: s.nextTier
            ? `Further contribution required to reach ${s.nextTier.name}.`
            : "There is no rung above this one.",
          value: s.nextTier ? money(s.toNextTier) : "top rung",
        },
        {
          label: "Standing",
          detail: "Measured on contribution, so it does not fall when you settle or withdraw.",
          value: s.tier ? s.tier.name : "Unranked",
          tone: "accent",
        },
      ];
    }

    case "settlementTarget": {
      const tier = s.tier ?? ENTRY;
      return [
        {
          label: "Standing",
          detail: s.tier
            ? "Your current rung on the ladder."
            : `Unranked, so the ${ENTRY.name} target is the one that would apply.`,
          value: tier.name,
        },
        {
          label: "Published targets",
          detail: TARGETS,
        },
        {
          label: "Measured from",
          detail: "The moment a withdrawal request is filed, not from when a term matures.",
          value: "request filed",
        },
        {
          label: "Settlement target",
          detail: "A service target the desk publishes so it can be measured. Not a guarantee.",
          value: `${tier.settlementHours} hours`,
          tone: "accent",
        },
      ];
    }

    case "redeploy": {
      const placeable = Math.floor(s.available);
      const tier = tierForAmount(placeable);
      return [
        {
          label: "Available cash",
          detail: "Settled money sitting still rather than accruing.",
          value: money(s.available, 2),
        },
        {
          label: "Floored",
          detail: "Whole dollars, so the amount named is the amount the form receives.",
          value: money(placeable),
        },
        {
          label: "Tier cleared",
          detail: tier
            ? `${money(placeable)} clears the ${money(tier.entry)} entry.`
            : `Below the ${money(ENTRY.entry)} entry for ${ENTRY.name}, so there is no vault to open.`,
          value: tier ? tier.name : "none",
        },
        {
          label: "Term reward",
          detail: `${DAILY_PCT} per day across ${CYCLE_DAYS} days, the same as every other vault.`,
          value: tier ? money(termReward(placeable), 2) : "nothing to place",
          tone: tier ? "gain" : "default",
        },
        {
          label: "Redeploy",
          detail: tier
            ? `Opens a ${tier.name} vault today and starts a fresh term.`
            : "The prompt stays hidden until there is enough idle cash to open a vault.",
          value: tier ? money(placeable) : money(s.available, 2),
          tone: "accent",
        },
      ];
    }

    default:
      return null;
  }
}

/* ── component ──────────────────────────────────────────────────────────── */

const TONE: Record<Tone, string> = {
  default: "text-[var(--text-hi)]",
  gain: "text-[var(--gain)]",
  accent: "text-[var(--accent-hi)]",
  warn: "text-[var(--warn)]",
};

export function Provenance({ id, position, snap, ctx, className = "" }: ProvenanceProps) {
  const headingId = `provenance-${id}-${useId()}`;
  const def = getDefinition(id);

  // A real derived position wins. Failing that, run the caller's raw inputs
  // through the same derivation so the worked figures are still the model's.
  const pos = position ?? previewPosition(ctx ?? {});

  const steps =
    (pos ? positionSteps(id, pos) : null) ??
    (snap ? snapshotSteps(id, snap) : null) ??
    // Nothing derivable was supplied, so fall back to the definition itself
    // rather than showing invented values beside real labels.
    def.how.map((detail) => ({ detail }));

  const exampleCtx: ExplainContext = pos
    ? { principal: pos.principal, openedAt: pos.openedAt, now: ctx?.now, closedAt: ctx?.closedAt }
    : (ctx ?? {});

  return (
    <section className={`panel p-5 sm:p-6 ${className}`} aria-labelledby={headingId}>
      <p className="eyebrow">Provenance</p>
      <h3 id={headingId} className="mt-1.5 text-[15px] font-semibold text-[var(--text-hi)]">
        {def.label}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-low)]">{def.short}</p>

      {def.formula && (
        <p className="tabular mt-4 break-words rounded-lg border border-[var(--line)] bg-[rgba(5,7,15,0.6)] px-3 py-2.5 text-[11px] leading-relaxed text-[var(--accent-soft)] sm:text-xs">
          {def.formula}
        </p>
      )}

      {/* The derivation. One step per line, input on the left, running value on
          the right, so the eye can walk principal down to the final figure. */}
      <ol className="mt-5">
        {steps.map((s, i) => {
          const last = i === steps.length - 1;
          return (
            <li key={i} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3 sm:gap-x-4">
              <div className="flex flex-col items-center">
                <span
                  className={`tabular grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[10px] font-semibold ${
                    last
                      ? "border-[rgba(46,139,255,0.45)] bg-[rgba(46,139,255,0.14)] text-[var(--accent-hi)]"
                      : "border-[var(--line-hi)] text-[var(--text-mid)]"
                  }`}
                >
                  {i + 1}
                </span>
                {!last && <span className="w-px flex-1 bg-[var(--line)]" aria-hidden="true" />}
              </div>

              <div className={`min-w-0 ${last ? "" : "pb-5"}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  {s.label && <p className="tag-micro">{s.label}</p>}
                  {s.value && (
                    <p className={`metric tabular text-sm ${TONE[s.tone ?? "default"]}`}>
                      {s.value}
                    </p>
                  )}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-low)]">{s.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-5 border-t border-[var(--line)] pt-4">
        <p className="tag-micro">In one line</p>
        <p className="tabular mt-1.5 text-[13px] leading-relaxed text-[var(--text)]">
          {explainValue(id, exampleCtx)}
        </p>
      </div>

      {def.caveats?.length ? (
        <ul className="mt-4 space-y-2">
          {def.caveats.map((c, i) => (
            <li key={i} className="flex gap-2">
              <TriangleAlert
                className="mt-px h-3.5 w-3.5 shrink-0 text-[var(--warn)]"
                strokeWidth={1.8}
                aria-hidden="true"
              />
              <span className="min-w-0 text-[11px] leading-relaxed text-[var(--text-low)]">{c}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link
          to={glossaryHref(id)}
          className="inline-flex min-h-[24px] items-center gap-1 text-[11px] font-semibold text-[var(--accent-hi)] hover:text-[var(--accent-soft)]"
        >
          Full definition <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
        </Link>
        {def.related?.map((r) => (
          <Link
            key={r}
            to={glossaryHref(r)}
            className="inline-flex min-h-[24px] items-center text-[11px] text-[var(--text-low)] hover:text-[var(--text-hi)]"
          >
            {getDefinition(r).label}
          </Link>
        ))}
      </div>
    </section>
  );
}
