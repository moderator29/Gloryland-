import { useEffect, useState } from "react";
import { ArrowDownToLine, ArrowUpRight, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { SiteHeader } from "@/components/SiteHeader";
import { RouteShell } from "@/components/RouteShell";
import { Stagger, StaggerItem } from "@/components/Stagger";
import { CountUp } from "@/components/CountUp";
import { Sparkline } from "@/components/Sparkline";
import { TierBadge } from "@/components/TierBadge";
import { StreakCounter } from "@/components/StreakCounter";
import { Receipt } from "@/components/Receipt";
import { ReceiptReactions } from "@/components/ReceiptReactions";
import { PayoutCalendar } from "@/components/PayoutCalendar";
import { useUser } from "@/context/UserContext";
import { listDeposits, listWithdraws, type Deposit, type Withdraw } from "@/lib/history";
import { useBalancePulse } from "@/hooks/useBalancePulse";

function fmtDate(t: number) {
  return new Date(t).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function Portfolio() {
  const { username } = useUser();
  const firstName = (username || "Investor").split(" ")[0];

  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdraws, setWithdraws] = useState<Withdraw[]>([]);
  const [receiptIdx, setReceiptIdx] = useState(0);
  const { value: balance } = useBalancePulse({ initial: 40459 });

  useEffect(() => {
    const read = () => {
      setDeposits(listDeposits());
      setWithdraws(listWithdraws());
    };
    read();
    window.addEventListener("focus", read);
    return () => {
      window.removeEventListener("focus", read);
    };
  }, []);

  const totalIn = deposits.reduce((s, d) => s + d.amount, 0);
  const totalOut = withdraws.reduce((s, w) => s + w.amount, 0);
  const current = deposits[receiptIdx];

  return (
    <RouteShell>
      <div className="min-h-screen pb-28">
        <SiteHeader />

        <main className="mx-auto max-w-2xl space-y-6 px-5 py-6">
          <Stagger className="space-y-6">
            <StaggerItem>
              <header className="flex items-end justify-between gap-3">
                <div>
                  <p className="chip">
                    <Crown className="h-3 w-3 text-primary" />
                    Portfolio
                  </p>
                  <h1 className="mt-2 font-display text-4xl leading-tight">
                    {firstName}'s <em className="not-italic text-gradient-gold">Vault</em>
                  </h1>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <TierBadge />
                  <StreakCounter />
                </div>
              </header>
            </StaggerItem>

            <StaggerItem>
              <section className="glass-luxury p-6">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Total Position
                </p>
                <div className="mt-1 flex items-end justify-between">
                  <p className="font-numeric text-5xl text-gradient-gold">
                    <CountUp value={balance} prefix="$" decimals={0} />
                  </p>
                  <div className="w-32">
                    <Sparkline height={56} />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-success/30 bg-success/5 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-success/70">
                      Total deposited
                    </p>
                    <p className="mt-1 font-numeric text-xl text-success">
                      <CountUp value={totalIn} prefix="$" />
                    </p>
                  </div>
                  <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-primary/70">
                      Total withdrawn
                    </p>
                    <p className="font-numeric mt-1 text-xl text-primary">
                      <CountUp value={totalOut} prefix="$" />
                    </p>
                  </div>
                </div>
              </section>
            </StaggerItem>

            <StaggerItem>
              <section className="glass-luxury p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    <ArrowDownToLine className="mr-1 inline h-4 w-4 text-success" />
                    Deposits ({deposits.length})
                  </p>
                </div>
                {deposits.length === 0 ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    No deposits yet. Once you confirm one in the Portal, it lands here.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {deposits.slice(0, 6).map((d) => (
                      <li
                        key={d.id}
                        className="flex items-center justify-between rounded-2xl border border-border/60 bg-black/30 px-3 py-2.5 text-sm"
                      >
                        <div>
                          <p>{d.plan ?? "Open Deposit"}</p>
                          <p className="font-numeric text-[10px] uppercase tracking-wider text-muted-foreground">
                            {fmtDate(d.date)} · {d.asset}
                          </p>
                        </div>
                        <p className="font-numeric text-base text-success">
                          +${d.amount.toLocaleString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </StaggerItem>

            {deposits.length > 0 && (
              <StaggerItem>
                <section className="glass-luxury p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Receipts</p>
                    <p className="font-numeric text-[10px] uppercase tracking-wider text-muted-foreground">
                      {receiptIdx + 1} / {deposits.length}
                    </p>
                  </div>
                  <motion.div
                    key={current?.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    onDragEnd={(_, info) => {
                      if (info.offset.x < -50 && receiptIdx < deposits.length - 1)
                        setReceiptIdx((i) => i + 1);
                      else if (info.offset.x > 50 && receiptIdx > 0) setReceiptIdx((i) => i - 1);
                    }}
                    className="mt-3"
                  >
                    {current && (
                      <>
                        <Receipt
                          plan={current.plan}
                          amount={current.amount}
                          asset={current.asset}
                          network={current.network}
                          txDate={new Date(current.date)}
                        />
                        <ReceiptReactions receiptId={current.id} />
                      </>
                    )}
                  </motion.div>
                  {deposits.length > 1 && (
                    <p className="mt-3 text-center text-[10px] uppercase tracking-wider text-muted-foreground/70">
                      Swipe to flip through
                    </p>
                  )}
                </section>
              </StaggerItem>
            )}

            <StaggerItem>
              <PayoutCalendar />
            </StaggerItem>

            <StaggerItem>
              <section className="glass-luxury p-5">
                <p className="text-sm font-medium">
                  <ArrowUpRight className="mr-1 inline h-4 w-4 text-primary" />
                  Withdrawals ({withdraws.length})
                </p>
                {withdraws.length === 0 ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Nothing pulled out yet. When you withdraw, it shows up here with status.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {withdraws.slice(0, 6).map((w) => (
                      <li
                        key={w.id}
                        className="flex items-center justify-between rounded-2xl border border-border/60 bg-black/30 px-3 py-2.5 text-sm"
                      >
                        <div>
                          <p className="font-mono text-xs">
                            {w.address.slice(0, 8)}…{w.address.slice(-6)}
                          </p>
                          <p className="font-numeric text-[10px] uppercase tracking-wider text-muted-foreground">
                            {fmtDate(w.date)} · {w.status}
                          </p>
                        </div>
                        <p className="font-numeric text-base text-primary">
                          ${w.amount.toLocaleString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </StaggerItem>
          </Stagger>
        </main>
      </div>
    </RouteShell>
  );
}
