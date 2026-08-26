import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { playTing } from "@/lib/sound";
import { Gift, Send, Wallet } from "lucide-react";
import { useLedger } from "@/hooks/useLedger";
import { claimRewards, recordWithdrawal } from "@/domain/ledger";
import { Value } from "@/components/system/Value";
import { Progress, Empty } from "@/components/system/ui";
import { money, fullDate, relative } from "@/components/system/format";
import { Explain } from "@/features/explain";

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
    playTing();
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
      {/* ── Lede: claimable figure left, lifetime totals in the rail ── */}
      <section className="lede">
        <div className="min-w-0">
          <p className="eyebrow">Earnings</p>
          <h1 className="display mt-1.5 text-2xl sm:text-3xl">Rewards</h1>

          <p className="tag-micro mt-8">Ready to claim</p>
          <p className="figure-lead mt-3 text-[var(--gain)]">
            <Value value={claimable} decimals={2} />
          </p>
          <Explain id="accrued" className="mt-2" />
          <p className="mt-3 text-xs text-[var(--text-low)]">
            across {snap.activePositions.length} open vault
            {snap.activePositions.length === 1 ? "" : "s"}
          </p>

          <button
            onClick={claimAll}
            disabled={claimable < 0.01}
            className="btn btn-primary mt-6 min-h-[44px]"
          >
            <Gift className="h-4 w-4" /> Claim all
          </button>
        </div>

        <div className="lede-rail">
          <RailStat label="Lifetime earned" tone="gain">
            {money(snap.rewardsAccrued, 2)}
          </RailStat>
          <RailStat label="Claimed">{money(snap.rewardsClaimed, 2)}</RailStat>
          <RailStat label="Available cash" tone="accent">
            {money(snap.available, 2)}
          </RailStat>
          <RailStat label="Withdrawn">{money(snap.withdrawn, 2)}</RailStat>
        </div>
      </section>

      {/* ── Bento: tall accrual ledger, with the withdraw desk beside it ── */}
      <section className="band">
        <div className="bento">
          {/* Tall primary: per-vault accrual */}
          <div className="bento-cell panel p-5 lg:col-span-7 lg:row-span-2 xl:p-6">
            <BandHead title="Accruing now" hint="Rewards build continuously through each term" />
            {snap.activePositions.length ? (
              <div className="ledger">
                {snap.activePositions.map((p) => (
                  <Link key={p.id} to={`/app/vaults/${p.id}`} className="rail-row rail-row-gain">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="truncate text-sm font-medium text-[var(--text-hi)]">
                          {p.tier.name}
                        </p>
                        <p className="metric shrink-0 text-lg text-[var(--gain)]">
                          <Value value={p.claimable} decimals={2} />
                        </p>
                      </div>
                      <p className="mt-0.5 text-xs text-[var(--text-low)]">
                        {money(p.principal)} · {money(p.dailyReward, 2)}/day
                      </p>
                      <div className="mt-2.5">
                        <Progress value={p.progress} height={4} label={`${p.tier.name} term`} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty
                icon={Gift}
                title="Nothing accruing"
                body="Rewards begin the moment capital enters a vault and build every day of the term."
                action={{ label: "Open a vault", to: "/app/vaults/new" }}
              />
            )}
          </div>

          {/* Tile: withdraw */}
          <div className="bento-cell panel p-5 lg:col-span-5">
            <BandHead title="Withdraw" hint={`${money(snap.available, 2)} available`} />
            <div className="space-y-3">
              <div>
                <label htmlFor="w-amt" className="tag-micro">
                  Amount
                </label>
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-[var(--line-hi)] bg-[rgba(5,7,15,0.6)] px-3.5 py-3 focus-within:border-[var(--accent)]">
                  <span className="text-[var(--text-low)]">$</span>
                  <input
                    id="w-amt"
                    inputMode="decimal"
                    value={amt}
                    onChange={(e) => setAmt(e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder="0.00"
                    className="tabular w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-[var(--text-low)]"
                  />
                  <button
                    onClick={() => setAmt(String(snap.available.toFixed(2)))}
                    className="min-h-[36px] btn btn-ghost shrink-0 !py-1 !text-[11px]"
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
                <label htmlFor="w-addr" className="tag-micro">
                  Destination address
                </label>
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-[var(--line-hi)] bg-[rgba(5,7,15,0.6)] px-3.5 py-3 focus-within:border-[var(--accent)]">
                  <Wallet className="h-4 w-4 shrink-0 text-[var(--text-low)]" />
                  <input
                    id="w-addr"
                    value={addr}
                    onChange={(e) => setAddr(e.target.value)}
                    placeholder="Wallet address"
                    className="w-full min-w-0 bg-transparent font-mono text-xs outline-none placeholder:text-[var(--text-low)]"
                  />
                </div>
              </div>

              <button
                onClick={submitWithdraw}
                disabled={!canWithdraw}
                className="btn btn-primary min-h-[44px] w-full"
              >
                <Send className="h-4 w-4" />
                {withdrawValue > 0 ? `Withdraw ${money(withdrawValue, 2)}` : "Withdraw"}
              </button>
            </div>
          </div>

          {/* Tile: claim history */}
          {claims.length > 0 && (
            <div className="bento-cell panel p-5 lg:col-span-5">
              <BandHead title="Claim history" />
              <div className="ledger">
                {claims.slice(0, 8).map((c) => (
                  <div key={c.id} className="rail-row rail-row-mute">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[var(--text)]">Rewards claimed</p>
                      <p className="mt-0.5 text-[11px] text-[var(--text-low)]">
                        {fullDate(c.at)} · {relative(c.at)}
                      </p>
                    </div>
                    <p className="metric shrink-0 text-sm text-[var(--gain)]">
                      +{money("amount" in c ? c.amount : 0, 2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
