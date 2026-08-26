import { Link } from "react-router-dom";
import { Plus, Vault as VaultIcon, Repeat } from "lucide-react";
import { useLedger } from "@/hooks/useLedger";
import { Value } from "@/components/system/Value";
import { BandHead, RailStat, Status, Empty } from "@/components/system/ui";
import { money, days, fullDate } from "@/components/system/format";
import { DAILY_RATE } from "@/domain/tiers";

export default function Vaults() {
  const snap = useLedger();
  const open = snap.positions.filter((p) => !p.closed);
  const closed = snap.positions.filter((p) => p.closed);

  return (
    <div className="space-y-6">
      {/* ── Lede: deployed capital carries the page, the rest sits in the rail ── */}
      <section className="lede">
        <div className="min-w-0">
          <p className="eyebrow">Vaults</p>
          <h1 className="display mt-1.5 text-2xl sm:text-3xl">Positions</h1>

          <p className="tag-micro mt-8">Deployed</p>
          <p className="figure-lead mt-3">{money(snap.deployed)}</p>

          <Link to="/app/vaults/new" className="btn btn-primary mt-6 min-h-[44px]">
            <Plus className="h-4 w-4" /> New vault
          </Link>
        </div>

        <div className="lede-rail">
          <RailStat label="Accruing" tone="accent">
            {open.filter((p) => p.started).length}
          </RailStat>
          <RailStat label="Earned" tone="gain">
            <Value value={snap.rewardsAccrued} decimals={2} />
          </RailStat>
          <RailStat label="Daily rate" tone="gain">
            {money(snap.dailyRate, 2)}
          </RailStat>
        </div>
      </section>

      {open.length === 0 && closed.length === 0 ? (
        <section className="band">
          <div className="panel">
            <Empty
              icon={VaultIcon}
              art="horizon"
              title="No vaults yet"
              body={`A vault accrues ${(DAILY_RATE * 100).toFixed(0)}% of its principal every day it is left in place. There is no end date.`}
              action={{ label: "Open your first vault", to: "/app/vaults/new" }}
            />
          </div>
        </section>
      ) : (
        <>
          {open.length > 0 && (
            <section className="band">
              <BandHead
                title="Open"
                hint={`${open.length} position${open.length === 1 ? "" : "s"}`}
              />
              {/* The newest position is the feature cell; the rest are tiles. */}
              <div className="bento">
                {open.map((p, i) => {
                  const feature = i === 0;
                  return (
                    <Link
                      key={p.id}
                      to={`/app/vaults/${p.id}`}
                      className={`bento-cell panel p-5 transition-colors hover:border-[var(--line-hi)] ${
                        feature ? "lg:col-span-8 lg:row-span-2 xl:p-6" : "lg:col-span-4"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-[var(--text-hi)]">
                            {p.tier.name}
                          </p>
                          <p className="mt-0.5 text-xs text-[var(--text-low)]">
                            Opened {fullDate(p.openedAt)}
                          </p>
                        </div>
                        <Status kind={p.started ? "accruing" : "pending"} />
                      </div>

                      {/* The relay glyph used to carry its whole explanation in
                          a title attribute, so the assistive reading of this
                          card was more honest than the visible one. Anything
                          that qualifies a figure has to be on the screen: this
                          card shows a principal and what it has earned, and an
                          armed relay means both figures are about to move. */}
                      {snap.relaysArmed.some((r) => r.positionId === p.id) && (
                        <p className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-[var(--accent-hi)]">
                          <Repeat
                            className="mt-px h-3 w-3 shrink-0"
                            strokeWidth={2.2}
                            aria-hidden="true"
                          />
                          <span>
                            <span className="font-semibold">Relay armed.</span> Once a whole day of
                            reward has accrued, this vault acts on it without asking again.
                          </span>
                        </p>
                      )}

                      <div className="mt-auto pt-6">
                        <div className="ledger">
                          <div className="rail-row">
                            <span className="tag-micro flex-1">Principal</span>
                            <span
                              className={
                                feature
                                  ? "figure-mid shrink-0 text-right"
                                  : "metric shrink-0 text-xl"
                              }
                            >
                              {money(p.principal)}
                            </span>
                          </div>
                          <div className="rail-row rail-row-gain">
                            <span className="tag-micro flex-1">Earned</span>
                            <span
                              className={`shrink-0 text-[var(--gain)] ${
                                feature ? "figure-mid text-right" : "metric text-xl"
                              }`}
                            >
                              <Value value={p.accrued} decimals={2} />
                            </span>
                          </div>
                        </div>

                        {/* No bar. A bar needs an end to fill toward, and a
                            position has none: it accrues until it is closed.
                            The two figures that are true are how long it has
                            run and what it adds a day. */}
                        <div className="mt-4 flex justify-between gap-2 text-[11px] text-[var(--text-low)]">
                          <span>{days(p.daysElapsed)} days accruing</span>
                          <span className="tabular text-[var(--gain)]">
                            {money(p.dailyReward, 2)}/day
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {closed.length > 0 && (
            <section className="band">
              <BandHead title="Closed" hint={`${closed.length} settled`} />
              <div className="ledger">
                {closed.map((p) => (
                  <div key={p.id} className="rail-row rail-row-mute">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--text)]">
                        {p.tier.name}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--text-low)]">
                        {money(p.principal)} · closed{" "}
                        {p.closedAt === null ? "" : fullDate(p.closedAt)}
                      </p>
                    </div>
                    <p className="metric shrink-0 text-sm text-[var(--gain)]">
                      +{money(p.accrued, 2)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
