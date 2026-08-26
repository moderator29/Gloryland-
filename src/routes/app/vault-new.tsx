import { useMemo, useRef, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Copy, Download, Info, Send, Wallet } from "lucide-react";
import { toast } from "sonner";
import { playTierChord } from "@/lib/sound";
import {
  openPosition,
  fillCourseLeg,
  fundingShortfall,
  BALANCE_ASSET,
  BALANCE_NETWORK,
} from "@/domain/ledger";
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
import { useLedger } from "@/hooks/useLedger";
import { Receipt, ConfirmationTracker, reference, type ReceiptData } from "@/features/deposit";
import { Progress } from "@/components/system/ui";
import { money } from "@/components/system/format";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type Step = "amount" | "fund" | "done";

export default function VaultNew() {
  const nav = useNavigate();
  const reduce = useReducedMotion();
  const [params] = useSearchParams();
  const snap = useLedger();
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
  // Two links arrive asking for capital that is already in the account: the
  // Redeploy prompt, and a roll from an older build that handed the amount to
  // this form. Both only preselect the funding source now: it is a choice on
  // the form, so it can be changed here and no longer depends on a member
  // reaching this screen through the right link.
  const presetBalance = params.get("source") === "balance" || params.get("from") !== null;
  // A leg is only marked filled by the placement that fills it, written in the
  // same commit, so the schedule can never claim a leg that has no position.
  const courseId = params.get("course");
  const courseLeg = Number(params.get("leg")) || 0;

  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState(preset ? String(preset) : "");
  const [assetId, setAssetId] = useState<AssetId>("btc");
  const [fromBalance, setFromBalance] = useState(presetBalance);
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

  // Available cash is a funding source like any other, and the only one this
  // build can actually verify: the ledger knows to the cent what the balance
  // holds. A placement that reaches past it is refused here and at the write.
  const available = snap.available;
  const shortfall = fromBalance ? fundingShortfall(value, available) : 0;
  const balanceCovers = shortfall === 0;
  // Whole dollars, rounded down, so pressing it can never ask for a cent the
  // balance does not have.
  const placeableFromBalance = Math.floor(available);
  // Two separate questions. The amount is valid or it is not, and that governs
  // the step; whether the balance covers it governs only the write. Folding
  // them together would strand a member who arrived on a balance funded link
  // with too large an amount: the step that lets them pick an asset instead is
  // the one the block would have closed.
  const amountValid = value >= minimum && tier !== null;
  const valid = amountValid && balanceCovers;

  const copyAddress = async () => {
    if (!meta.address) return;
    try {
      await navigator.clipboard.writeText(meta.address);
      setCopied(true);
      toast.success(`${meta.symbol} address copied`);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy. Select the address and copy it manually.");
    }
  };

  const useBalance = () => {
    setFromBalance(true);
    if (placeableFromBalance >= minimum) setAmount(String(placeableFromBalance));
  };

  const commit = () => {
    if (!valid || !tier || !confirmed) return;
    const placed = openPosition({
      amount: value,
      tierId: tier.id,
      // A balance funded placement records no asset and no chain, because
      // nothing arrived on one.
      asset: fromBalance ? BALANCE_ASSET : meta.symbol,
      network: fromBalance ? BALANCE_NETWORK : meta.network,
      fromAvailable: fromBalance,
    });
    // The ledger refuses a balance funded placement larger than the balance.
    // The form has already checked, so this is the second line: it catches the
    // case where the cash moved between the render and the click.
    if (!placed.ok) {
      toast.error("That is more than your balance holds", {
        description: `Available is ${money(placed.available, 2)}, which is ${money(
          placed.shortfall,
          2,
        )} short of this placement.`,
      });
      return;
    }
    const evt = placed.event;
    setReceipt({
      reference: reference(evt.id),
      amount: value,
      assetId,
      tierId: tier.id,
      at: evt.at,
      units,
    });
    if (courseId && courseLeg > 0) fillCourseLeg(courseId, courseLeg, evt.id);
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
        <p className="eyebrow">New position</p>
        <h1 className="display mt-1 text-2xl sm:text-3xl">Open a vault</h1>
        {fromBalance && (
          <p className="chip chip-accent mt-3 !whitespace-normal !py-2 leading-relaxed">
            Funded from the {money(available, 2)} already in your account. Capital that was already
            counted does not raise your contribution a second time.
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
                {value > 0 && (value < minimum || tier === null)
                  ? `Minimum entry is ${money(minimum)} (${TIERS[0].name}).`
                  : `Minimum ${money(minimum)}. Larger placements unlock higher tiers.`}
              </p>
            </section>

            {/* Cash the account already holds, named on the step where the
                amount is decided rather than left to be discovered later. It is
                the one funding source whose size the product actually knows. */}
            {available > 0 && (
              <section className="panel flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="eyebrow">Available cash</p>
                  <p className="metric mt-1 text-lg">{money(available, 2)}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-low)]">
                    {placeableFromBalance >= minimum
                      ? "Sitting in your balance and not accruing. It can fund this placement."
                      : `Under the ${money(minimum)} minimum, so it cannot open a term on its own.`}
                  </p>
                </div>
                {placeableFromBalance >= minimum && (
                  <button onClick={useBalance} className="btn btn-secondary shrink-0">
                    <Wallet className="h-4 w-4" /> Use {money(placeableFromBalance)}
                  </button>
                )}
              </section>
            )}

            {value >= minimum && tier && (
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

            {fromBalance && !balanceCovers && (
              <p className="inset p-3.5 text-xs leading-relaxed text-[var(--warn)]">
                Your balance holds {money(available, 2)}, which is {money(shortfall, 2)} short of
                this placement. Lower the amount, or choose an asset to fund it with on the next
                step.
              </p>
            )}

            <button
              onClick={() => setStep("fund")}
              disabled={!amountValid}
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
              <p className="eyebrow">Funding source</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {/* The balance sits in the same grid as the assets, because it
                    is the same decision: where this capital comes from. It was
                    a query parameter before, which meant every deliberate
                    redeployment through the form was recorded as new money. */}
                <button
                  onClick={() => setFromBalance(true)}
                  aria-pressed={fromBalance}
                  disabled={fundingShortfall(value, available) > 0}
                  className={`flex min-h-[56px] items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                    fromBalance
                      ? "border-[rgba(46,139,255,0.5)] bg-[rgba(46,139,255,0.12)]"
                      : "border-[var(--line)] hover:border-[var(--line-hi)]"
                  }`}
                >
                  <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full border border-[var(--line-hi)] bg-[rgba(46,139,255,0.12)]">
                    <Wallet className="h-3.5 w-3.5 text-[var(--accent-hi)]" strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-[var(--text-hi)]">
                      Balance
                    </span>
                    <span className="block truncate text-[10px] text-[var(--text-low)]">
                      {money(available, 2)} available
                    </span>
                  </span>
                </button>

                {ASSETS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      setAssetId(a.id);
                      setFromBalance(false);
                    }}
                    aria-pressed={!fromBalance && assetId === a.id}
                    className={`flex min-h-[56px] items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      !fromBalance && assetId === a.id
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

              {fromBalance ? (
                /* No rate, no address, no transfer. The capital is already
                   here, so the only arithmetic worth showing is what leaves
                   the balance and what stays in it. */
                <div className="inset mt-4 p-3.5">
                  <dl className="space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-[var(--text-low)]">Available now</dt>
                      <dd className="metric tabular text-[var(--text-hi)]">
                        {money(available, 2)}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-[var(--text-low)]">This placement</dt>
                      <dd className="metric tabular text-[var(--text-hi)]">−{money(value, 2)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] pt-2">
                      <dt className="text-[var(--text-low)]">Balance after</dt>
                      <dd className="metric tabular text-[var(--text-hi)]">
                        {money(Math.max(0, available - value), 2)}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-3 text-[11px] leading-relaxed text-[var(--text-low)]">
                    Nothing is transferred and no address is needed. This capital has already been
                    counted once, so the placement does not raise your contribution or buy tier
                    standing a second time.
                  </p>
                </div>
              ) : (
                <>
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
                        {coin
                          ? `1 ${meta.symbol} = ${money(coin.price, meta.priceDecimals)}`
                          : "--"}
                      </p>
                    </div>
                  </div>

                  {/* Absent unless a real address is configured. There is no custody
                      behind this build, so a string here would be a destination
                      nobody owns, and the step below still records the placement
                      against the member's own ledger. */}
                  {meta.address ? (
                    <>
                      <p className="eyebrow mt-4">{meta.network} address</p>
                      <p className="machine inset mt-2 p-3 text-[11px] leading-relaxed text-[var(--text)]">
                        {meta.address}
                      </p>
                      <button onClick={copyAddress} className="btn btn-secondary mt-2.5 w-full">
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copied ? "Copied" : "Copy address"}
                      </button>
                    </>
                  ) : (
                    <p className="inset mt-4 p-3.5 text-xs leading-relaxed text-[var(--text-low)]">
                      Funding is not open in this build. There is no wallet behind the product yet
                      and no address that could receive a transfer, so none is shown. Continuing
                      still opens the term against your own ledger so you can watch it run.
                    </p>
                  )}
                </>
              )}
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

              {fromBalance && !balanceCovers && (
                <p className="mt-3 text-xs leading-relaxed text-[var(--warn)]">
                  Your balance holds {money(available, 2)}, which is {money(shortfall, 2)} short of
                  this placement.
                </p>
              )}

              <div className="mt-4 flex gap-2">
                <button onClick={() => setStep("amount")} className="btn btn-outline flex-1">
                  Back
                </button>
                <button
                  onClick={commit}
                  disabled={!confirmed || !valid}
                  className="btn btn-primary flex-[2]"
                >
                  <Send className="h-4 w-4" />
                  {fromBalance ? "Place from balance" : "Confirm deposit"}
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
            {/* A balance funded placement has no transfer to confirm and no
                deposit to receipt, so it gets neither. Showing a confirmation
                tracker for capital that never left the account would be an
                animation of something that did not happen. */}
            {fromBalance ? (
              <section className="panel-hi edge-light p-5">
                <p className="eyebrow">Placed</p>
                <p className="metric mt-2 text-3xl">{money(receipt.amount)}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-low)]">
                  Moved from your balance into a {CYCLE_DAYS} day term. Accrual starts now, and the
                  balance now reads {money(snap.available, 2)}.
                </p>
                <p className="machine mt-3 text-[11px] text-[var(--text-low)]">
                  {receipt.reference}
                </p>
              </section>
            ) : (
              <>
                <ConfirmationTracker />

                <div className="min-h-[36px] flex justify-center overflow-x-auto py-1">
                  <Receipt ref={receiptRef} data={receipt} />
                </div>
              </>
            )}

            <div className="flex flex-wrap gap-2">
              {!fromBalance && (
                <button
                  onClick={saveReceipt}
                  disabled={saving}
                  className="btn btn-secondary flex-1"
                >
                  <Download className="h-4 w-4" /> {saving ? "Saving" : "Save receipt"}
                </button>
              )}
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
