import { motion } from "framer-motion";
import { CYCLE_DAYS, CYCLE_RETURN, DAILY_RATE, dailyReward, termReward } from "@/domain/tiers";
import { money, pct } from "@/components/system/format";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * The 30-day term, drawn.
 *
 * One column per day, each column's height being cumulative accrual on that
 * day — so the shape *is* the arithmetic: a straight ramp from open to
 * maturity, with no compounding sleight of hand. Marked at open, midpoint
 * and maturity, with a worked example underneath.
 */

const DAYS = Array.from({ length: CYCLE_DAYS }, (_, i) => i + 1);

export function TermTimeline({ principal }: { principal: number }) {
  const reduce = useReducedMotion();

  return (
    <figure className="panel-hi edge-light overflow-hidden p-5 sm:p-6">
      <figcaption className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Term structure</p>
          <p className="mt-1 text-sm text-[var(--text-mid)]">
            Cumulative accrual on a {money(principal)} position
          </p>
        </div>
        <span className="chip chip-accent tabular">{pct(DAILY_RATE, 2)} / day</span>
      </figcaption>

      {/* The ramp. */}
      <div
        className="flex h-28 items-end gap-[2px] sm:h-36"
        role="img"
        aria-label={`Cumulative accrual rises in a straight line from zero on day one to ${money(
          termReward(principal),
        )} on day ${CYCLE_DAYS}.`}
      >
        {DAYS.map((d) => {
          const h = (d / CYCLE_DAYS) * 100;
          const last = d === CYCLE_DAYS;
          const paint = {
            background: last
              ? "linear-gradient(180deg, var(--accent-soft), var(--accent))"
              : "linear-gradient(180deg, rgba(92,171,255,0.85), rgba(22,54,160,0.35))",
            boxShadow: last ? "0 0 18px -2px rgba(125,211,252,0.65)" : undefined,
          };

          // Reduced motion draws the finished ramp outright, no growth.
          if (reduce) {
            return (
              <span
                key={d}
                className="min-w-0 flex-1 rounded-t-[2px]"
                style={{ ...paint, height: `${h}%` }}
              />
            );
          }

          return (
            <motion.span
              key={d}
              className="min-w-0 flex-1 rounded-t-[2px]"
              style={paint}
              initial={{ height: 0, opacity: 0 }}
              whileInView={{ height: `${h}%`, opacity: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: d * 0.018, ease: [0.22, 1, 0.36, 1] }}
            />
          );
        })}
      </div>

      {/* Axis. */}
      <div className="mt-3 flex items-center justify-between border-t border-[var(--line)] pt-3">
        {[
          { k: "Day 0", v: "Vault opens" },
          { k: `Day ${CYCLE_DAYS / 2}`, v: `${pct(CYCLE_RETURN / 2, 0)} accrued` },
          { k: `Day ${CYCLE_DAYS}`, v: "Maturity" },
        ].map((m, i) => (
          <div
            key={m.k}
            className={i === 1 ? "hidden text-center sm:block" : i === 2 ? "text-right" : ""}
          >
            <p className="tabular text-[11px] font-semibold text-[var(--text-mid)]">{m.k}</p>
            <p className="mt-0.5 text-[11px] text-[var(--text-low)]">{m.v}</p>
          </div>
        ))}
      </div>

      {/* Worked example. */}
      <dl className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Cell label="Principal" value={money(principal)} />
        <Cell label="Per day" value={money(dailyReward(principal), 2)} />
        <Cell label="Term reward" value={money(termReward(principal))} tone="gain" />
        <Cell label="At maturity" value={money(principal + termReward(principal))} tone="accent" />
      </dl>
    </figure>
  );
}

function Cell({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "gain" | "accent";
}) {
  const toneClass =
    tone === "gain"
      ? "text-[var(--gain)]"
      : tone === "accent"
        ? "text-[var(--accent-hi)]"
        : "text-[var(--text-hi)]";
  return (
    <div className="inset p-3">
      <dt className="eyebrow">{label}</dt>
      <dd className={`metric mt-1.5 text-base sm:text-lg ${toneClass}`}>{value}</dd>
    </div>
  );
}
