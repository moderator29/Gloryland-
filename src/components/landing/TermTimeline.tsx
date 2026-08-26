import { useRef, useState } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "framer-motion";
import { CYCLE_DAYS, CYCLE_RETURN, DAILY_RATE, dailyReward, termReward } from "@/domain/tiers";
import { money } from "@/components/system/format";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { DAY_RATE, TERM_RATE, rate } from "./figures";

/**
 * The term, drawn and staged against scroll.
 *
 * One column per day, each column's height being cumulative accrual on that
 * day, so the shape is the arithmetic: a straight ramp from open to maturity
 * with no compounding sleight of hand anywhere in it. Scrolling the stages
 * fills the ramp and moves the readout, which means the explanation and the
 * figure are the same object rather than a diagram sitting next to some prose.
 *
 * Under reduced motion the ramp is drawn complete, every stage is lit, and
 * neither the scroll listener nor the sticky column does any work.
 */

const DAYS = Array.from({ length: CYCLE_DAYS }, (_, i) => i + 1);
const HALF = CYCLE_DAYS / 2;

type Stage = {
  marker: string;
  title: string;
  body: string;
  figureLabel: string;
  figure: (principal: number) => string;
};

const STAGES: Stage[] = [
  {
    marker: "Day 0",
    title: "The vault is written",
    body: "Principal, the day it opens and the day it matures are recorded before a cent accrues. Once written, none of the three can move.",
    figureLabel: "Principal placed",
    figure: (p) => money(p),
  },
  {
    marker: "Day 1",
    title: "Accrual begins",
    body: `${DAY_RATE} of the original principal is credited to the position each day. Linear, against principal, never against the running balance, so there is no compounding hidden inside the term.`,
    figureLabel: "Credited per day",
    figure: (p) => money(dailyReward(p), 2),
  },
  {
    marker: `Day ${HALF}`,
    title: "Half the term",
    body: `At the midpoint the position carries ${rate(CYCLE_RETURN / 2, 0)} of principal. The figure in the portal is the same arithmetic you can do on paper, which is the point of publishing the rate rather than a projection.`,
    figureLabel: `Accrued by day ${HALF}`,
    figure: (p) => money(p * DAILY_RATE * HALF),
  },
  {
    marker: `Day ${CYCLE_DAYS}`,
    title: "Maturity, and a decision",
    body: `The term closes at ${TERM_RATE} of principal. Nothing rolls on its own: settle to an allow listed address, or open a new term with the whole balance. Both are instructions you give.`,
    figureLabel: "Principal and reward",
    figure: (p) => money(p + termReward(p)),
  },
];

/** The ramp, painted once per tone so the two layers cannot drift apart. */
function Bars({ bright }: { bright: boolean }) {
  return (
    <div className="absolute inset-0 flex items-end gap-[2px]">
      {DAYS.map((d) => (
        <span
          key={d}
          className="min-w-0 flex-1 rounded-t-[2px]"
          style={{
            height: `${(d / CYCLE_DAYS) * 100}%`,
            background: bright
              ? "linear-gradient(180deg, rgba(125,211,252,0.95), rgba(22,54,160,0.42))"
              : "rgba(120,160,220,0.12)",
          }}
        />
      ))}
    </div>
  );
}

export function TermTimeline({ principal }: { principal: number }) {
  const reduce = useReducedMotion();
  const stages = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(0);

  // The stage column is the driver. It starts filling once its top has risen
  // past two thirds of the viewport and completes as its foot clears, which
  // keeps the ramp in step with whichever stage is being read.
  const { scrollYProgress } = useScroll({
    target: stages,
    offset: ["start 70%", "end 85%"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const i = Math.min(STAGES.length - 1, Math.max(0, Math.floor(v * STAGES.length)));
    setActive((prev) => (prev === i ? prev : i));
  });

  const cut = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const mask = useMotionTemplate`linear-gradient(90deg, #000 ${cut}%, transparent ${cut}%)`;
  const cursor = useMotionTemplate`${cut}%`;
  const dayText = useTransform(scrollYProgress, (v) => String(Math.round(v * CYCLE_DAYS)));
  const accruedText = useTransform(scrollYProgress, (v) =>
    money(principal * DAILY_RATE * Math.round(v * CYCLE_DAYS), 2),
  );

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
      {/* The figure sticks while the stages pass it. Two sticky positions,
          because the constraint differs by layout: in the phone's single
          block flow this wrapper is what sticks, and in the two column grid
          it is stretched to the row and the inner element sticks inside it.
          The opaque backing is phone only, where stage text scrolls directly
          underneath the figure. */}
      <div
        className={`-mx-5 bg-[var(--ink-000)] px-5 pb-4 pt-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:h-full lg:bg-transparent lg:px-0 lg:pb-0 ${
          reduce ? "" : "sticky top-[4.25rem] z-10 lg:static"
        }`}
      >
        <div className={reduce ? "" : "lg:sticky lg:top-24"}>
          <figure className="glass p-4 sm:p-5">
            <figcaption className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
              <div className="min-w-0">
                <p className="eyebrow">Cumulative accrual</p>
                <p className="mt-1 text-sm text-[var(--text-mid)]">
                  on a {money(principal)} position
                </p>
              </div>
              <div className="text-right">
                <p className="tag-micro">Day</p>
                <p className="metric text-xl text-[var(--text-hi)] sm:text-2xl">
                  {reduce ? CYCLE_DAYS : <motion.span>{dayText}</motion.span>}
                  <span className="text-sm text-[var(--text-low)]"> / {CYCLE_DAYS}</span>
                </p>
              </div>
            </figcaption>

            <div
              className="relative mt-5 h-28 sm:h-36 lg:h-44"
              role="img"
              aria-label={`Cumulative accrual rises in a straight line from zero on day one to ${money(
                termReward(principal),
              )} on day ${CYCLE_DAYS}.`}
            >
              <Bars bright={false} />
              {reduce ? (
                <Bars bright />
              ) : (
                <>
                  <motion.div
                    className="absolute inset-0"
                    style={{ maskImage: mask, WebkitMaskImage: mask }}
                  >
                    <Bars bright />
                  </motion.div>
                  {/* The reading head: where the term currently stands. */}
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-y-0 w-px bg-[var(--accent-soft)]"
                    style={{ left: cursor, boxShadow: "0 0 14px 1px rgba(125,211,252,0.55)" }}
                  />
                </>
              )}
            </div>

            <div className="mt-3 flex items-baseline justify-between border-t border-[var(--line)] pt-3">
              <p className="tag-micro">Accrued</p>
              <p className="metric text-base text-[var(--gain)] sm:text-lg">
                {reduce ? money(termReward(principal)) : <motion.span>{accruedText}</motion.span>}
              </p>
            </div>
          </figure>

          <p className="mt-3 text-[11px] leading-relaxed text-[var(--text-low)]">
            Arithmetic on the published term structure, not a forecast and not a guarantee of
            payment.
          </p>
        </div>
      </div>

      {/* The stages. */}
      <ol ref={stages} className="mt-8 lg:mt-0">
        {STAGES.map((s, i) => {
          const lit = reduce || i <= active;
          return (
            <li
              key={s.marker}
              className="border-t border-[var(--line)] py-7 first:border-0 first:pt-0 lg:py-9"
            >
              <div className="transition-opacity duration-500" style={{ opacity: lit ? 1 : 0.34 }}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  {/* The marker is repeated inside the heading for screen
                      readers, so the chip itself is decoration. */}
                  <span aria-hidden="true" className={`chip tabular ${lit ? "chip-accent" : ""}`}>
                    {s.marker}
                  </span>
                  <span aria-hidden="true" className="hairline" />
                </div>

                <h3 className="mt-4 text-lg font-semibold text-[var(--text-hi)] sm:text-xl">
                  <span className="sr-only">{s.marker}: </span>
                  {s.title}
                </h3>
                <p className="mt-2.5 max-w-prose text-[15px] leading-relaxed text-[var(--text-mid)]">
                  {s.body}
                </p>

                <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="tag-micro">{s.figureLabel}</p>
                  <p className="metric text-lg text-[var(--accent-hi)]">{s.figure(principal)}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
