import { Check } from "lucide-react";
import { TIERS, termReward } from "@/domain/tiers";
import { money } from "@/components/system/format";
import { Stagger, StaggerItem } from "./Reveal";

/**
 * The tier ladder.
 *
 * Not a pricing table — every tier carries the same rate, so a column grid
 * comparing prices would be lying about what changes. It is drawn as a rail
 * you climb: one rung per tier, a node on the rail, and a reach bar showing
 * where the entry threshold sits against the top of the ladder.
 */

const TOP = TIERS[TIERS.length - 1].entry;

export function TierLadder() {
  return (
    <div className="relative">
      {/* The rail itself, behind the rungs. */}
      <span
        aria-hidden="true"
        className="absolute bottom-6 left-[19px] top-6 hidden w-px sm:block"
        style={{
          background:
            "linear-gradient(to bottom, rgba(46,139,255,0.12), rgba(92,171,255,0.55), rgba(125,211,252,0.85))",
        }}
      />

      <Stagger as="ol" className="space-y-2.5">
        {TIERS.map((tier) => {
          const reach = (tier.entry / TOP) * 100;
          const top = tier.entry === TOP;

          return (
            <StaggerItem as="li" key={tier.id} className="relative">
              <article
                className={`${top ? "panel-hi edge-light" : "panel"} group relative flex gap-4 p-4 transition-colors hover:border-[var(--line-hi)] sm:p-5 sm:pl-16`}
              >
                {/* Rail node. */}
                <span
                  aria-hidden="true"
                  className="absolute left-[11px] top-1/2 hidden h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full border sm:flex"
                  style={{
                    borderColor: top ? "var(--accent-soft)" : "var(--line-hi)",
                    background: "var(--ink-000)",
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: top ? "var(--accent-soft)" : "var(--accent)",
                      opacity: top ? 1 : 0.35 + (tier.rank / TIERS.length) * 0.55,
                    }}
                  />
                </span>

                {/* Rank numeral, doubles as the mobile rail marker. */}
                <span
                  className="tabular grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-[rgba(46,139,255,0.07)] text-[13px] font-semibold text-[var(--accent-hi)] sm:hidden"
                  aria-hidden="true"
                >
                  {tier.rank}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="text-base font-semibold text-[var(--text-hi)] sm:text-lg">
                      {tier.name}
                    </h3>
                    <p className="metric text-sm text-[var(--accent-hi)] sm:text-base">
                      from {money(tier.entry)}
                    </p>
                    {top && <span className="chip chip-accent">Full programme</span>}
                  </div>

                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-mid)]">
                    {tier.blurb}
                  </p>

                  {/* Reach bar: entry threshold against the top of the ladder. */}
                  <div
                    aria-hidden="true"
                    className="mt-3.5 h-1 w-full overflow-hidden rounded-full bg-[rgba(5,7,15,0.7)]"
                  >
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${reach}%`,
                        background:
                          "linear-gradient(90deg, var(--accent-deep), var(--accent), var(--accent-soft))",
                      }}
                    />
                  </div>

                  <ul className="mt-3.5 flex flex-wrap gap-x-4 gap-y-1.5">
                    {tier.benefits.map((b) => (
                      <li
                        key={b}
                        className="flex items-center gap-1.5 text-xs text-[var(--text-low)]"
                      >
                        <Check
                          className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]"
                          strokeWidth={2.2}
                          aria-hidden="true"
                        />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="hidden shrink-0 flex-col items-end justify-center gap-1.5 border-l border-[var(--line)] pl-5 md:flex">
                  <p className="eyebrow">Settlement</p>
                  <p className="metric tabular text-lg">{tier.settlementHours}h</p>
                  <p className="text-[11px] text-[var(--text-low)]">
                    {money(termReward(tier.entry))} at term
                  </p>
                </div>
              </article>
            </StaggerItem>
          );
        })}
      </Stagger>
    </div>
  );
}
