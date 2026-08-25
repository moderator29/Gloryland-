import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Gift, Send, Wallet } from "lucide-react";
import { useLedger } from "@/hooks/useLedger";
import { claimRewards, recordWithdrawal } from "@/domain/ledger";
import { Value } from "@/components/system/Value";
import { Metric, Progress, Empty, SectionHeader } from "@/components/system/ui";
import { money, fullDate, relative } from "@/components/system/format";

export default function Rewards() {
  const snap = useLedger();
  const [addr, setAddr] = useState("");
  const [amt, setAmt] = useState("");

  const claimable = snap.activePositions.reduce((s, p) => s + p.claimable, 0);
  const claims = snap.events.filter((e) => e.kind === "claim");

  const claimAll = () => {
    const eligible = snap.activePositions.filter((p) => p.claimable >= 0.01);
    if (!eligible.length) return;
    eligible.forEach((p) => claimRewards(p.id, p.claimable));
    toast.success(
      `${money(claimable, 2)} claimed across ${eligible.length} vault${eligible.length === 1 ? "" : "s"}`,
    );
  };

  const withdrawValue = Number(amt) || 0;
  const canWithdraw =
    withdrawValue > 0 && withdrawValue <= snap.available && addr.trim().length >= 12;

  const submitWithdraw = () => {
    if (!canWithdraw) return;
    recordWithdrawal(withdrawValue, addr.trim());
    toast.success(`Withdrawal of ${money(withdrawValue, 2)} recorded`);
    setAmt("");
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Earnings</p>
        <h1 className="display mt-1 text-2xl sm:text-3xl">Rewards</h1>
      </div>

      <section className="panel-hi edge-light p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Ready to claim</p>
            <p className="metric mt-2 text-4xl text-[var(--gain)]">
              <Value value={claimable} decimals={2} />
            </p>
            <p className="mt-1.5 text-xs text-[var(--text-low)]">
              across {snap.activePositions.length} open vault
              {snap.activePositions.length === 1 ? "" : "s"}
            </p>
          </div>
          <button onClick={claimAll} disabled={claimable < 0.01} className="btn btn-primary">
            <Gift className="h-4 w-4" /> Claim all
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Metric label="Lifetime earned" tone="gain">
            {money(snap.rewardsAccrued, 2)}
          </Metric>
          <Metric label="Claimed">{money(snap.rewardsClaimed, 2)}</Metric>
          <Metric label="Available cash" tone="accent">
            {money(snap.available, 2)}
          </Metric>
          <Metric label="Withdrawn">{money(snap.withdrawn, 2)}</Metric>
        </div>
      </section>

      {/* Per-vault accrual */}
      <section>
        <SectionHeader title="Accruing now" hint="Rewards build continuously through each term" />
        {snap.activePositions.length ? (
          <div className="panel divide-y divide-[var(--line)]">
            {snap.activePositions.map((p) => (
              <Link
                key={p.id}
                to={`/app/vaults/${p.id}`}
                className="block p-4 transition-colors hover:bg-[rgba(46,139,255,0.04)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-hi)]">{p.tier.name}</p>
                    <p className="mt-0.5 text-xs text-[var(--text-low)]">
                      {money(p.principal)} · {money(p.dailyReward, 2)}/day
                    </p>
                  </div>
                  <p className="metric shrink-0 text-sm text-[var(--gain)]">
                    <Value value={p.claimable} decimals={2} />
                  </p>
                </div>
                <div className="mt-2.5">
                  <Progress value={p.progress} height={4} label={`${p.tier.name} term`} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="panel">
            <Empty
              icon={Gift}
              title="Nothing accruing"
              body="Rewards begin the moment capital enters a vault and build every day of the term."
              action={{ label: "Open a vault", to: "/app/vaults/new" }}
            />
          </div>
        )}
      </section>

      {/* Withdraw */}
      <section className="panel p-5">
        <SectionHeader title="Withdraw" hint={`${money(snap.available, 2)} available`} />
        <div className="space-y-3">
          <div>
            <label htmlFor="w-amt" className="eyebrow">
              Amount
            </label>
            <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-[var(--line-hi)] bg-[rgba(5,7,15,0.6)] px-3.5 py-3 focus-within:border-[var(--accent)]">
              <span className="text-[var(--text-low)]">$</span>
              <input
                id="w-amt"
                inputMode="decimal"
                value={amt}
                onChange={(e) => setAmt(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="0.00"
                className="tabular w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-low)]"
              />
              <button
                onClick={() => setAmt(String(snap.available.toFixed(2)))}
                className="btn btn-ghost !py-1 !text-[11px]"
                disabled={snap.available <= 0}
              >
                MAX
              </button>
            </div>
            {withdrawValue > snap.available && (
              <p className="mt-1.5 text-[11px] text-[var(--loss)]">
                Exceeds available balance of {money(snap.available, 2)}.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="w-addr" className="eyebrow">
              Destination address
            </label>
            <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-[var(--line-hi)] bg-[rgba(5,7,15,0.6)] px-3.5 py-3 focus-within:border-[var(--accent)]">
              <Wallet className="h-4 w-4 shrink-0 text-[var(--text-low)]" />
              <input
                id="w-addr"
                value={addr}
                onChange={(e) => setAddr(e.target.value)}
                placeholder="Wallet address"
                className="w-full bg-transparent font-mono text-xs outline-none placeholder:text-[var(--text-low)]"
              />
            </div>
          </div>

          <button
            onClick={submitWithdraw}
            disabled={!canWithdraw}
            className="btn btn-primary w-full"
          >
            <Send className="h-4 w-4" />
            {withdrawValue > 0 ? `Withdraw ${money(withdrawValue, 2)}` : "Withdraw"}
          </button>
        </div>
      </section>

      {/* Claim history */}
      {claims.length > 0 && (
        <section>
          <SectionHeader title="Claim history" />
          <div className="panel divide-y divide-[var(--line)]">
            {claims.slice(0, 8).map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 p-3.5">
                <div>
                  <p className="text-sm text-[var(--text)]">Rewards claimed</p>
                  <p className="mt-0.5 text-[11px] text-[var(--text-low)]">
                    {fullDate(c.at)} · {relative(c.at)}
                  </p>
                </div>
                <p className="metric text-sm text-[var(--gain)]">
                  +{money("amount" in c ? c.amount : 0, 2)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
