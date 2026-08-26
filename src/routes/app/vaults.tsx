import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Plus, Vault as VaultIcon, Repeat } from "lucide-react";
import { useLedger } from "@/hooks/useLedger";
import { Value } from "@/components/system/Value";
import { Progress, Status, Empty } from "@/components/system/ui";
import { money, days, fullDate } from "@/components/system/format";
import { CYCLE_RETURN } from "@/domain/tiers";

/** Left-aligned section head: accent tick, label, hairline out to the edge. */
function BandHead({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="mb-4">
      <div className="band-head">
        <h2 className="band-title">{title}</h2>
        <span className="hairline" aria-hidden="true" />
        {action}
      </div>
      {hint && <p className="mt-2 pl-[0.9375rem] text-xs text-[var(--text-low)]">{hint}</p>}
    </div>
  );
}

/** One supporting figure in the narrow rail beside the lead figure. */
function RailStat({
  label,
  children,
  tone = "default",
}: {
  label: string;
  children: ReactNode;
  tone?: "default" | "gain" | "accent";
}) {
  const toneClass =
    tone === "gain"
      ? "text-[var(--gain)]"
      : tone === "accent"
        ? "text-[var(--accent-hi)]"
        : "text-[var(--text-hi)]";
  return (
    <div className="rail-stat">
      <span className="tag-micro">{label}</span>
      <span className={`metric text-lg ${toneClass}`}>{children}</span>
    </div>
  );
}

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
            {open.filter((p) => !p.matured).length}
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
              title="No vaults yet"
              body={`A vault holds capital for a 30-day term and returns ${(CYCLE_RETURN * 100).toFixed(0)}%, accruing every day.`}
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
                        <Status kind={p.matured ? "matured" : "accruing"} />
                        {snap.relaysArmed.some((r) => r.positionId === p.id) && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--accent-hi)]"
                            title="A relay is armed on this vault"
                          >
                            <Repeat className="h-3 w-3" strokeWidth={2.2} aria-hidden="true" />
                            Relay
                          </span>
                        )}
                      </div>

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

                        <div className="mt-4">
                          <div className="mb-1.5 flex justify-between gap-2 text-[11px] text-[var(--text-low)]">
                            <span>{Math.round(p.progress * 100)}% of term</span>
                            <span>{p.matured ? "Matured" : `${days(p.daysRemaining)}d left`}</span>
                          </div>
                          <Progress
                            value={p.progress}
                            tone={p.matured ? "gain" : "accent"}
                            height={5}
                            label={`${p.tier.name} term progress`}
                          />
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
                        {money(p.principal)} · closed {fullDate(p.maturesAt)}
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
