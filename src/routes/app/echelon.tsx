import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CircleAlert, Layers, Split } from "lucide-react";
import { MINIMUM_PLACEMENT, maxParts } from "@/features/ladder/plan";
import { WITHDRAW_INTERVAL_DAYS, dailyReward } from "@/domain/tiers";
import { Compare, echelon, legChoices, spacingChoices, validate } from "@/features/echelon";
import { Metric } from "@/components/system/ui";
import { days, fullDate, money } from "@/components/system/format";

/**
 * Echelon: what splitting one sum into placements days apart costs.
 *
 * This page used to plan a formation, and the formation had a real argument
 * behind it. One sum placed as several terms that started days apart returned
 * capital on several dates instead of one. Same total reward either way, less
 * riding on any single date.
 *
 * That argument no longer exists, and the page says so rather than being
 * quietly repointed at a new one. There are no maturities: a position accrues
 * from the day it opens until the member closes it, so nothing returns on a
 * date and there are no dates to stagger. Liquidity is a member level window
 * of four days, identical whether one position is open or six, so a split buys
 * no extra access to cash either. What is left is the cost: a leg that waits
 * accrues nothing while it waits, and because both plans accrue at the same
 * rate afterwards, that shortfall is permanent.
 *
 * So the surface is a calculator that argues against itself. A member who
 * wants to know what a stagger costs can find out here, to the cent, and the
 * honest recommendation is on the page in plain words.
 *
 * Nothing here writes to the ledger and nothing here schedules anything. There
 * is no future dated write in this product: a position starts accruing when
 * its `open` event is recorded, and that happens when the member opens it.
 */

const DEFAULT_TOTAL = 3000;
const DEFAULT_PARTS = 3;
const DEFAULT_SPACING = 5;

export default function EchelonRoute() {
  const [totalText, setTotalText] = useState(String(DEFAULT_TOTAL));
  const [parts, setParts] = useState(DEFAULT_PARTS);
  const [spacing, setSpacing] = useState(DEFAULT_SPACING);

  // The anchor is fixed for the life of the page rather than re-read on every
  // render, so the dates below do not creep forward while someone reads them.
  const [from] = useState(() => Date.now());

  const total = Math.max(0, Math.floor(Number(totalText.replace(/[^0-9.]/g, "")) || 0));
  const legOptions = useMemo(() => legChoices(total), [total]);
  const spacingOptions = useMemo(() => spacingChoices(), []);

  // Keep the leg count inside what the total can actually be split into, so a
  // member typing a smaller number never reads a plan that cannot be placed.
  useEffect(() => {
    const limit = maxParts(total);
    if (limit >= 2 && parts > limit) setParts(limit);
  }, [total, parts]);

  const validity = validate(total, parts, spacing);
  const plan = echelon(total, parts, spacing, from, from);

  return (
    <>
      <section className="lede">
        <div className="min-w-0">
          <p className="tag-micro">Echelon</p>
          <h1 className="figure-lead mt-2 sm:mt-3">Splitting a placement</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--text-low)]">
            Echelon used to stagger maturities. Positions no longer mature, so there is nothing to
            stagger and this page has one job left: telling you what a split would cost.
          </p>
        </div>
      </section>

      <section className="panel edge-light mt-4 p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--line-hi)] bg-[rgba(46,139,255,0.1)]">
            <Layers
              className="h-4 w-4 text-[var(--accent-hi)]"
              strokeWidth={1.9}
              aria-hidden="true"
            />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold text-[var(--text-hi)]">
              Why the formation is gone
            </h2>
            <ul className="mt-2 space-y-2 text-xs leading-relaxed text-[var(--text-low)]">
              <li>
                A position accrues from the day it opens and keeps accruing until you close it.
                Nothing matures, so no capital comes back on a date.
              </li>
              <li>
                A withdrawal can be requested once every {WITHDRAW_INTERVAL_DAYS} days. That window
                belongs to the account, not to a position, so six open positions unlock cash exactly
                as often as one does.
              </li>
              <li>
                Capital waiting to be placed accrues nothing. A leg opened five days late has five
                days of accrual it never earns, and both plans accrue identically afterwards, so it
                is never made up.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="panel mt-4 p-5">
        <h2 className="text-[15px] font-semibold text-[var(--text-hi)]">What a split would cost</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="eyebrow block">Total</span>
            <input
              type="text"
              inputMode="numeric"
              value={totalText}
              onChange={(e) => setTotalText(e.target.value)}
              className="metric tabular mt-1.5 w-full rounded-xl border border-[var(--line-hi)] bg-[rgba(5,7,15,0.62)] px-4 py-3 text-lg text-[var(--text-hi)] outline-none transition-colors focus:border-[var(--accent)]"
              aria-label="Total to place"
            />
          </label>

          <div>
            <span className="eyebrow block">Legs</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {legOptions.length === 0 ? (
                <span className="text-xs text-[var(--text-low)]">none available</span>
              ) : (
                legOptions.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setParts(n)}
                    aria-pressed={parts === n}
                    className={`chip min-h-[36px] px-3 ${parts === n ? "chip-accent" : ""}`}
                  >
                    {n}
                  </button>
                ))
              )}
            </div>
          </div>

          <div>
            <span className="eyebrow block">Days apart</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {spacingOptions.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSpacing(n)}
                  aria-pressed={spacing === n}
                  className={`chip min-h-[36px] px-3 ${spacing === n ? "chip-accent" : ""}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {!validity.ok ? (
          <div className="inset mt-4 flex items-start gap-2.5 p-3.5">
            <CircleAlert
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warn)]"
              strokeWidth={1.9}
              aria-hidden="true"
            />
            <div className="min-w-0 text-xs leading-relaxed text-[var(--text)]">
              {validity.reasons.map((reason) => (
                <p key={reason} className="first:mt-0 [&+p]:mt-2">
                  {reason}
                </p>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Metric label="Accrual given up" tone="loss">
                {money(plan.compare.forgone, 2)}
              </Metric>
              <Metric label="Which is days of the whole sum">
                {days(plan.compare.forgoneDays)} days
              </Metric>
              <Metric label="Fully placed after">{days(plan.compare.lagDays)} days</Metric>
            </div>

            <Compare plan={plan} className="mt-6" />

            <div className="mt-6">
              <h3 className="eyebrow">The legs</h3>
              <ol className="ledger mt-2">
                {plan.legs.map((leg) => (
                  <li key={leg.step} className="rail-row">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--line)] bg-[rgba(5,7,15,0.5)]">
                      <Split
                        className="h-3.5 w-3.5 text-[var(--text-low)]"
                        strokeWidth={1.9}
                        aria-hidden="true"
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-[var(--text-hi)]">
                        <span>Leg {leg.step}</span>
                        <span className="tabular text-[var(--text-low)]">{money(leg.amount)}</span>
                        {leg.tier && <span className="chip">{leg.tier.name}</span>}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--text-low)]">
                        {leg.offsetDays === 0
                          ? `Placed today, accruing ${money(leg.daily, 2)} a day from now`
                          : `${fullDate(leg.opensAt)}, ${days(leg.offsetDays)} days late, giving up ${money(leg.forgone, 2)}`}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </>
        )}
      </section>

      <section className="panel mt-4 p-5">
        <h2 className="text-[15px] font-semibold text-[var(--text-hi)]">What to do instead</h2>
        <p className="mt-2 text-xs leading-relaxed text-[var(--text-low)]">
          Place what you intend to place when you intend to place it. {money(MINIMUM_PLACEMENT)} is
          the smallest position Rigel opens, and any amount above it accrues{" "}
          {money(dailyReward(1), 2)} a day per dollar, the same on every rung. If you want capital
          entering on a rhythm because that is how it arrives, a{" "}
          <Link to="/app/course" className="text-[var(--accent-hi)] underline underline-offset-2">
            course
          </Link>{" "}
          records that intention with dates against it. That is a different thing from splitting
          money you already hold, and it costs nothing, because the capital was not there to place
          yet.
        </p>
        <p className="mt-3 text-xs leading-relaxed text-[var(--text-low)]">
          Capital is at risk. Rates are targets, not guarantees.
        </p>
      </section>
    </>
  );
}
