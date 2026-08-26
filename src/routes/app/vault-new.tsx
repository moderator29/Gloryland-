import { useMemo, useRef, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Copy, Download, Info, Send } from "lucide-react";
import { toast } from "sonner";
import { playTierChord } from "@/lib/sound";
import { openPosition } from "@/domain/ledger";
import {
  CYCLE_DAYS,
  CYCLE_RETURN,
  TIERS,
  tierForAmount,
  dailyReward,
  termReward,
} from "@/domain/tiers";
import { ASSETS, assetById, type AssetId } from "@/features/market/assets";
import { CoinLogo } from "@/features/market/CoinLogo";
import { useMarket } from "@/hooks/useMarket";
import { Receipt, ConfirmationTracker, reference, type ReceiptData } from "@/features/deposit";
import { Progress } from "@/components/system/ui";
import { money } from "@/components/system/format";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type Step = "amount" | "fund" | "done";

export default function VaultNew() {
  const nav = useNavigate();
  const reduce = useReducedMotion();
  const [params] = useSearchParams();
  // A link carrying an amount wins. Failing that, the band picked during sign
  // up prefills the form once, then clears itself so it never surprises the
  // member on a later visit.
  const preset =
    Number(params.get("amount")) ||
    (() => {
      try {
        const stored = Number(sessionStorage.getItem("rgl_start_amount")) || 0;
        if (stored) sessionStorage.removeItem("rgl_start_amount");
        return stored;
      } catch {
        return 0;
      }
    })();
  const rolledFrom = params.get("from");
  // A roll settles an existing term and re-places the same capital, so it is
  // funded from the balance rather than from money arriving from outside. The
  // ledger has to know the difference, otherwise the same capital is counted
  // twice and tier standing climbs on money that was only deposited once.
  const fromBalance = rolledFrom !== null;

  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState(preset ? String(preset) : "");
  const [assetId, setAssetId] = useState<AssetId>("btc");
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [saving, setSaving] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const { coins } = useMarket();
  const value = Number(amount) || 0;
  const tier = useMemo(() => tierForAmount(value), [value]);
  const meta = assetById(assetId)!;
  const coin = coins.find((c) => c.id === assetId);
  const units = coin && coin.price > 0 ? value / coin.price : undefined;
  const minimum = TIERS[0].entry;
  const valid = value >= minimum && tier !== null;

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(meta.address);
      setCopied(true);
      toast.success(`${meta.symbol} address copied`);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy. Select the address and copy it manually.");
    }
  };

  const commit = () => {
    if (!valid || !tier || !confirmed) return;
    const evt = openPosition({
      amount: value,
      tierId: tier.id,
      asset: meta.symbol,
      network: meta.network,
      fromAvailable: fromBalance,
    });
    setReceipt({
      reference: reference(evt.id),
      amount: value,
      assetId,
      tierId: tier.id,
      at: evt.at,
      units,
    });
    playTierChord(tier.id);
    setStep("done");
  };

  const saveReceipt = async () => {
    if (!receiptRef.current) return;
    setSaving(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: null,
        scale: 3,
        logging: false,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `rigel-receipt-${receipt?.reference ?? "deposit"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Receipt saved");
    } catch {
      toast.error("Could not save the receipt. Try a screenshot instead.");
    } finally {
      setSaving(false);
    }
  };

  const fade = reduce
    ? {}
    : {
        initial: { opacity: 0, x: 16 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -16 },
        transition: { duration: 0.26, ease: [0.22, 1, 0.36, 1] as const },
      };

  const STEPS: Step[] = ["amount", "fund", "done"];
  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link to="/app/vaults" className="min-h-[36px] btn btn-ghost -ml-2 !py-1.5 !text-xs">
        <ArrowLeft className="h-4 w-4" /> Vaults
      </Link>

      <div>
        <p className="eyebrow">{rolledFrom ? "Rolling over" : "New position"}</p>
        <h1 className="display mt-1 text-2xl sm:text-3xl">
          {rolledFrom ? "Carry into a new term" : "Open a vault"}
        </h1>
        {rolledFrom && (
          <p className="chip chip-accent mt-3 !whitespace-normal !py-2 leading-relaxed">
            Principal and rewards from your matured vault are carried across. The new term starts
            when you confirm.
          </p>
        )}
      </div>

      {/* Step rail */}
      <div className="flex gap-1.5" aria-hidden>
        {STEPS.map((s, i) => (
          <div key={s} className="h-1 flex-1 overflow-hidden rounded-full bg-[rgba(5,7,15,0.7)]">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, var(--accent), var(--accent-soft))" }}
              initial={false}
              animate={{ width: i <= stepIndex ? "100%" : "0%" }}
              transition={{ duration: reduce ? 0 : 0.4 }}
            />
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Step 1: amount ── */}
        {step === "amount" && (
          <motion.div key="amount" {...fade} className="space-y-4">
            <section className="panel p-5">
              <label htmlFor="amount" className="eyebrow">
                Amount
              </label>
              <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-[var(--line-hi)] bg-[rgba(5,7,15,0.6)] px-4 py-3.5 focus-within:border-[var(--accent)]">
                <span className="text-lg text-[var(--text-low)]">$</span>
                <input
                  id="amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="0"
                  className="metric w-full bg-transparent text-2xl outline-none placeholder:text-[var(--text-low)]"
                />
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {TIERS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setAmount(String(t.entry))}
                    className={`min-h-[40px] rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${
                      value === t.entry
                        ? "border-[rgba(46,139,255,0.5)] bg-[rgba(46,139,255,0.14)] text-[var(--accent-hi)]"
                        : "border-[var(--line)] text-[var(--text-mid)] hover:border-[var(--line-hi)]"
                    }`}
                  >
                    {money(t.entry)}
                  </button>
                ))}
              </div>

              <p className="mt-3 text-xs text-[var(--text-low)]">
                {value > 0 && !valid
                  ? `Minimum entry is ${money(minimum)} (${TIERS[0].name}).`
                  : `Minimum ${money(minimum)}. Larger placements unlock higher tiers.`}
              </p>
            </section>

            {valid && tier && (
              <motion.section
                className="panel-hi edge-light p-5"
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center justify-between">
                  <p className="eyebrow">Projection</p>
                  <span className="chip chip-accent">{tier.name}</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[11px] text-[var(--text-low)]">Per day</p>
                    <p className="metric mt-1 text-base text-[var(--gain)] sm:text-lg">
                      {money(dailyReward(value), 2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[var(--text-low)]">Term reward</p>
                    <p className="metric mt-1 text-base text-[var(--gain)] sm:text-lg">
                      {money(termReward(value))}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[var(--text-low)]">At maturity</p>
                    <p className="metric mt-1 text-base sm:text-lg">
                      {money(value + termReward(value))}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <Progress value={0} height={5} label="Term not started" />
                  <div className="mt-1.5 flex justify-between text-[11px] text-[var(--text-low)]">
                    <span>Day 0</span>
                    <span>
                      Day {CYCLE_DAYS}, {(CYCLE_RETURN * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </motion.section>
            )}

            <button
              onClick={() => setStep("fund")}
              disabled={!valid}
              className="btn btn-primary w-full"
            >
              Continue
            </button>
          </motion.div>
        )}

        {/* ── Step 2: fund ── */}
        {step === "fund" && tier && (
          <motion.div key="fund" {...fade} className="space-y-4">
            <section className="panel p-5">
              <p className="eyebrow">Funding asset</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ASSETS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAssetId(a.id)}
                    aria-pressed={assetId === a.id}
                    className={`flex min-h-[56px] items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      assetId === a.id
                        ? "border-[rgba(46,139,255,0.5)] bg-[rgba(46,139,255,0.12)]"
                        : "border-[var(--line)] hover:border-[var(--line-hi)]"
                    }`}
                  >
                    <CoinLogo asset={a} size={26} />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-[var(--text-hi)]">
                        {a.symbol}
                      </span>
                      <span className="block truncate text-[10px] text-[var(--text-low)]">
                        {a.short}
                      </span>
                    </span>
                  </button>
                ))}
              </div>

              {/* live exchange rate */}
              <div className="inset mt-4 flex items-center justify-between gap-3 p-3.5">
                <div className="min-w-0">
                  <p className="eyebrow">You send</p>
                  <p className="metric mt-1 text-lg">
                    {units !== undefined
                      ? `${units.toFixed(6)} ${meta.symbol}`
                      : `${meta.symbol} rate unavailable`}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="eyebrow">Rate</p>
                  <p className="tabular mt-1 text-xs text-[var(--text-mid)]">
                    {coin ? `1 ${meta.symbol} = ${money(coin.price, meta.priceDecimals)}` : "--"}
                  </p>
                </div>
              </div>

              <p className="eyebrow mt-4">{meta.network} address</p>
              <p className="inset mt-2 break-all p-3 font-mono text-[11px] leading-relaxed text-[var(--text)]">
                {meta.address}
              </p>
              <button onClick={copyAddress} className="btn btn-secondary mt-2.5 w-full">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy address"}
              </button>
            </section>

            <section className="panel p-5">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
                />
                <span className="text-xs leading-relaxed text-[var(--text-mid)]">
                  I understand capital is committed for the {CYCLE_DAYS} day term, that projections
                  are illustrative rather than guaranteed, and that digital asset investments carry
                  risk including loss of principal.
                </span>
              </label>

              <div className="mt-4 flex gap-2">
                <button onClick={() => setStep("amount")} className="btn btn-outline flex-1">
                  Back
                </button>
                <button onClick={commit} disabled={!confirmed} className="btn btn-primary flex-[2]">
                  <Send className="h-4 w-4" /> Confirm deposit
                </button>
              </div>

              <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-[var(--text-low)]">
                <Info className="mt-px h-3 w-3 shrink-0" />
                This preview records the position in your browser. Custody and settlement require
                the production backend.
              </p>
            </section>
          </motion.div>
        )}

        {/* ── Step 3: confirmations + receipt ── */}
        {step === "done" && receipt && (
          <motion.div key="done" {...fade} className="space-y-4">
            <ConfirmationTracker />

            <div className="min-h-[36px] flex justify-center overflow-x-auto py-1">
              <Receipt ref={receiptRef} data={receipt} />
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={saveReceipt} disabled={saving} className="btn btn-secondary flex-1">
                <Download className="h-4 w-4" /> {saving ? "Saving" : "Save receipt"}
              </button>
              <button onClick={() => nav("/app/vaults")} className="btn btn-primary flex-1">
                View vaults
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
