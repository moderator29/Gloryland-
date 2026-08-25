import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Bitcoin, ChevronRight, ChevronLeft, Copy, Check, X, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ASSETS, type CryptoAsset } from "@/lib/crypto-assets";
import { DepositTracker } from "@/components/DepositTracker";
import { Receipt } from "@/components/Receipt";
import { goldBurst } from "@/lib/confetti";
import { playTing, playTap, playTierChord } from "@/lib/sound";
import { success as hapticSuccess, tap as hapticTap } from "@/lib/haptic";

const STEPS = ["Tier", "Asset", "Address", "Confirm", "Receipt"] as const;
const SUBS_KEY = "hal_subscribed_plans";

type Props = {
  open: boolean;
  onClose: () => void;
  defaultPlan?: string;
  defaultAmount?: number;
};

export function DepositWizard({ open, onClose, defaultPlan, defaultAmount }: Props) {
  const [step, setStep] = useState(0);
  const [plan, setPlan] = useState(defaultPlan ?? "Gold Plan");
  const [amount, setAmount] = useState(defaultAmount ?? 5000);
  const [assetKey, setAssetKey] = useState<CryptoAsset["key"]>("BTC");
  const asset = ASSETS.find((a) => a.key === assetKey)!;
  const [copied, setCopied] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep(0);
      setTracking(false);
      setDone(false);
    } else {
      if (defaultPlan) setPlan(defaultPlan);
      if (defaultAmount) setAmount(defaultAmount);
    }
  }, [open, defaultPlan, defaultAmount]);

  const next = () => {
    hapticTap();
    playTap();
    if (step === 2) {
      setStep(3);
      setTracking(true);
      return;
    }
    if (step < STEPS.length - 1) setStep(step + 1);
  };
  const prev = () => {
    hapticTap();
    if (step > 0) setStep(step - 1);
  };

  const onConfirmed = () => {
    hapticSuccess();
    playTing();
    playTierChord(plan);
    goldBurst({ x: 0.5, y: 0.45 });
    try {
      const list: string[] = JSON.parse(localStorage.getItem(SUBS_KEY) || "[]");
      if (!list.includes(plan)) {
        list.push(plan);
        localStorage.setItem(SUBS_KEY, JSON.stringify(list));
      }
    } catch {
      /* ignore */
    }
    toast.success(`${plan} activated.`, { duration: 2200 });
    setDone(true);
    window.setTimeout(() => setStep(4), 800);
  };

  const copyAddress = async () => {
    await navigator.clipboard.writeText(asset.address);
    setCopied(true);
    hapticTap();
    playTap();
    toast.success("Address copied.", { duration: 1400 });
    window.setTimeout(() => setCopied(false), 1500);
  };

  const cryptoAmount = (amount / asset.rateUsd).toFixed(asset.decimals);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-end bg-black/75 backdrop-blur-xl md:items-center md:justify-center"
          onClick={onClose}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 600 }}
            animate={{ y: 0 }}
            exit={{ y: 600 }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
            className="glass-luxury aurora-border relative max-h-[90vh] w-full max-w-md overflow-auto rounded-t-3xl p-5 pb-10 md:rounded-3xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="chip">
                <Sparkles className="h-3 w-3 text-primary" />
                Step {step + 1} of {STEPS.length}
              </span>
              <button
                onClick={onClose}
                className="grid h-9 w-9 place-items-center rounded-full border border-border/60 text-muted-foreground hover:text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-5 flex items-center gap-1">
              {STEPS.map((s, i) => (
                <span
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i <= step ? "bg-primary" : "bg-white/[0.08]"
                  }`}
                />
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
              >
                {step === 0 && (
                  <div>
                    <h3 className="font-display text-2xl">Pick your tier</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Daily reward scales with your tier.
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {[
                        "Starter Plan",
                        "Bronze Plan",
                        "Silver Plan",
                        "Gold Plan",
                        "Legendary Plan",
                        "Immortal Plan",
                        "Platinum Plan",
                      ].map((p) => (
                        <button
                          key={p}
                          onClick={() => {
                            setPlan(p);
                            playTierChord(p);
                            hapticTap();
                          }}
                          className={`rounded-2xl border px-3 py-2.5 text-left text-sm transition-all ${
                            plan === p
                              ? "border-primary/60 bg-primary/10 text-primary"
                              : "border-border/60 bg-black/30 text-muted-foreground"
                          }`}
                        >
                          {p.replace(" Plan", "")}
                        </button>
                      ))}
                    </div>

                    <label className="mt-4 block">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Amount (USD)
                      </span>
                      <div className="mt-1 flex items-center gap-3 rounded-2xl border border-border/60 bg-black/40 px-4 py-3">
                        <span className="text-muted-foreground">$</span>
                        <input
                          value={amount}
                          onChange={(e) => setAmount(Number(e.target.value) || 0)}
                          inputMode="decimal"
                          className="flex-1 bg-transparent text-base outline-none"
                        />
                      </div>
                    </label>
                  </div>
                )}

                {step === 1 && (
                  <div>
                    <h3 className="font-display text-2xl">Choose an asset</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Send any supported crypto.</p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {ASSETS.map((a) => (
                        <button
                          key={a.key}
                          onClick={() => {
                            setAssetKey(a.key);
                            hapticTap();
                          }}
                          className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                            assetKey === a.key
                              ? "border-primary/60 bg-primary/10"
                              : "border-border/60 bg-black/30"
                          }`}
                        >
                          <span
                            className="grid h-9 w-9 place-items-center rounded-full"
                            style={{ background: a.color }}
                          >
                            <Bitcoin className="h-4 w-4 text-black/80" />
                          </span>
                          <div>
                            <p className="text-sm font-medium">{a.key}</p>
                            <p className="text-[10px] text-muted-foreground">{a.network}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div>
                    <h3 className="font-display text-2xl">Send {asset.key}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      To this address on {asset.network}.
                    </p>
                    <div className="mt-4 rounded-2xl border border-border/60 bg-black/40 p-4">
                      <div className="mx-auto w-fit rounded-xl bg-white p-3">
                        <QRCodeSVG value={asset.address} size={170} level="H" />
                      </div>
                      <p className="mt-3 break-all text-center font-mono text-[11px] text-muted-foreground">
                        {asset.address}
                      </p>
                      <button
                        onClick={copyAddress}
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-primary/40 bg-primary/10 py-2 text-xs text-primary"
                      >
                        {copied ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        {copied ? "Copied" : "Copy Address"}
                      </button>
                    </div>
                    <p className="mt-3 text-center text-xs text-muted-foreground">
                      Send approximately{" "}
                      <span className="font-mono text-primary">
                        {cryptoAmount} {asset.key}
                      </span>{" "}
                      (${amount.toLocaleString()})
                    </p>
                  </div>
                )}

                {step === 3 && (
                  <div>
                    <h3 className="font-display text-2xl">Confirming</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Watching the network. Stay on this page.
                    </p>
                    <DepositTracker active={tracking} onComplete={onConfirmed} />
                    {done && (
                      <p className="mt-3 text-center text-sm text-success">
                        Activated. Generating your receipt.
                      </p>
                    )}
                  </div>
                )}

                {step === 4 && (
                  <Receipt
                    plan={plan}
                    amount={amount}
                    asset={asset.key}
                    network={asset.network}
                    txDate={new Date()}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {step < 3 && (
              <div className="mt-6 flex items-center gap-2">
                <button
                  onClick={prev}
                  disabled={step === 0}
                  className="grid h-11 w-11 place-items-center rounded-full border border-border/60 bg-black/40 text-muted-foreground hover:text-primary disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={next}
                  className="btn-foil flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm"
                >
                  {step === 2 ? (
                    <>
                      I have sent it <Send className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Continue <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            )}

            {step === 4 && (
              <button
                onClick={onClose}
                className="btn-foil mt-5 flex w-full items-center justify-center gap-2 px-4 py-3 text-sm"
              >
                Done
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
