import { Link } from "react-router-dom";
import { Plus, Vault as VaultIcon } from "lucide-react";
import { useLedger } from "@/hooks/useLedger";
import { Value } from "@/components/system/Value";
import { Metric, Progress, Status, Empty, SectionHeader } from "@/components/system/ui";
import { money, days, fullDate } from "@/components/system/format";
import { CYCLE_RETURN } from "@/domain/tiers";

export default function Vaults() {
  const snap = useLedger();
  const open = snap.positions.filter((p) => !p.closed);
  const closed = snap.positions.filter((p) => p.closed);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Vaults</p>
          <h1 className="display mt-1 text-2xl sm:text-3xl">Positions</h1>
        </div>
        <Link to="/app/vaults/new" className="btn btn-primary">
          <Plus className="h-4 w-4" /> New vault
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Metric label="Deployed">{money(snap.deployed)}</Metric>
        <Metric label="Accruing" tone="accent">
          {open.filter((p) => !p.matured).length}
        </Metric>
        <Metric label="Earned" tone="gain">
          <Value value={snap.rewardsAccrued} decimals={2} />
        </Metric>
        <Metric label="Daily rate" tone="gain">
          {money(snap.dailyRate, 2)}
        </Metric>
      </div>

      {open.length === 0 && closed.length === 0 ? (
        <div className="panel">
          <Empty
            icon={VaultIcon}
            title="No vaults yet"
            body={`A vault holds capital for a 30-day term and returns ${(CYCLE_RETURN * 100).toFixed(0)}%, accruing every day.`}
            action={{ label: "Open your first vault", to: "/app/vaults/new" }}
          />
        </div>
      ) : (
        <>
          {open.length > 0 && (
            <section>
              <SectionHeader
                title="Open"
                hint={`${open.length} position${open.length === 1 ? "" : "s"}`}
              />
              <div className="grid gap-3 lg:grid-cols-2">
                {open.map((p) => (
                  <Link
                    key={p.id}
                    to={`/app/vaults/${p.id}`}
                    className="panel group p-5 transition-colors hover:border-[var(--line-hi)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-[var(--text-hi)]">
                          {p.tier.name}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--text-low)]">
                          Opened {fullDate(p.openedAt)}
                        </p>
                      </div>
                      <Status kind={p.matured ? "matured" : "accruing"} />
                    </div>

                    <div className="mt-4 flex items-end justify-between">
                      <div>
                        <p className="eyebrow">Principal</p>
                        <p className="metric mt-1 text-xl">{money(p.principal)}</p>
                      </div>
                      <div className="text-right">
                        <p className="eyebrow">Earned</p>
                        <p className="metric mt-1 text-xl text-[var(--gain)]">
                          <Value value={p.accrued} decimals={2} />
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="mb-1.5 flex justify-between text-[11px] text-[var(--text-low)]">
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
                  </Link>
                ))}
              </div>
            </section>
          )}

          {closed.length > 0 && (
            <section>
              <SectionHeader title="Closed" hint={`${closed.length} settled`} />
              <div className="panel divide-y divide-[var(--line)]">
                {closed.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 p-4">
                    <div>
                      <p className="text-sm font-medium text-[var(--text)]">{p.tier.name}</p>
                      <p className="mt-0.5 text-xs text-[var(--text-low)]">
                        {money(p.principal)} · closed {fullDate(p.maturesAt)}
                      </p>
                    </div>
                    <p className="metric text-sm text-[var(--gain)]">+{money(p.accrued, 2)}</p>
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
