import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Copy,
  Check,
  Plus,
  Send,
  Wallet,
  ArrowUpRight,
  QrCode,
  Wand2,
  Layers,
  Scale,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useLedger } from "@/hooks/useLedger";
import { recordWithdrawal } from "@/domain/ledger";
import { MarketPanel, ASSETS, CoinLogo } from "@/features/market";
import { useMarket } from "@/hooks/useMarket";
import { Value } from "@/components/system/Value";
import { Metric, SectionHeader, NavRow } from "@/components/system/ui";
import { money } from "@/components/system/format";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * The Desk is where a member acts: fund an account, move value out, and read
 * the market. Home is for seeing, the Desk is for doing.
 */
export default function Desk() {
  const snap = useLedger();
  const reduce = useReducedMotion();
  const [funding, setFunding] = useState(ASSETS[0]);
  const { coins } = useMarket();
  const [copied, setCopied] = useState(false);
  const [amt, setAmt] = useState("");
  const [addr, setAddr] = useState("");

  const copyAddress = async () => {
    if (!funding.address) return;
    try {
      await navigator.clipboard.writeText(funding.address);
      setCopied(true);
      toast.success(`${funding.symbol} address copied`);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy. Select the address and copy it manually.");
    }
  };

  const value = Number(amt) || 0;
  const canWithdraw = value > 0 && value <= snap.available && addr.trim().length >= 12;

  const submit = () => {
    if (!canWithdraw) return;
    recordWithdrawal(value, addr.trim());
    toast.success(`Withdrawal of ${money(value, 2)} recorded`);
    setAmt("");
    setAddr("");
  };

  const rise = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.4, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <div className="space-y-6">
      <motion.div {...rise(0)} className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Command</p>
          <h1 className="display mt-1 text-2xl sm:text-3xl">Desk</h1>
        </div>
        <Link to="/app/vaults/new" className="btn btn-secondary !py-2 !text-[13px]">
          <Wand2 className="h-4 w-4" /> Guided deposit
        </Link>
      </motion.div>

      {/* Balances */}
      <motion.section {...rise(1)} className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Metric label="Available" tone="accent">
          <Value value={snap.available} decimals={2} />
        </Metric>
        <Metric label="Deployed">{money(snap.deployed)}</Metric>
        <Metric label="Accruing" tone="gain">
          <Value value={snap.rewardsPending} decimals={2} />
        </Metric>
        <Metric label="Per day" tone="gain">
          {money(snap.dailyRate, 2)}
        </Metric>
      </motion.section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Fund */}
        <motion.section {...rise(2)} className="panel p-5">
          <SectionHeader title="Fund account" hint="Send to the address below, then open a vault" />

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ASSETS.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setFunding(f);
                  setCopied(false);
                }}
                aria-pressed={funding.id === f.id}
                className={`flex min-h-[54px] items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  funding.id === f.id
                    ? "border-[rgba(46,139,255,0.45)] bg-[rgba(46,139,255,0.12)]"
                    : "border-[var(--line)] hover:border-[var(--line-hi)]"
                }`}
              >
                <CoinLogo asset={f} size={24} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[var(--text-hi)]">
                    {f.symbol}
                  </span>
                  <span className="block truncate text-[10px] text-[var(--text-low)]">
                    {f.short}
                  </span>
                </span>
              </button>
            ))}
          </div>

          {(() => {
            const c = coins.find((x) => x.id === funding.id);
            return c ? (
              <p className="tabular mt-3 text-xs text-[var(--text-mid)]">
                1 {funding.symbol} = {money(c.price, funding.priceDecimals)}
                <span
                  className={
                    c.change24h >= 0 ? "ml-2 text-[var(--gain)]" : "ml-2 text-[var(--loss)]"
                  }
                >
                  {c.change24h >= 0 ? "+" : ""}
                  {c.change24h.toFixed(2)}%
                </span>
              </p>
            ) : null;
          })()}

          {/* No address is shown unless one is actually configured. There is no
              custody behind this build, so a copyable string here would be a
              destination that nobody owns. */}
          {funding.address ? (
            <div className="inset mt-3 p-3.5">
              <p className="eyebrow flex items-center gap-1.5">
                <QrCode className="h-3 w-3" /> {funding.network} address
              </p>
              <p className="machine mt-2 text-[11px] leading-relaxed text-[var(--text)]">
                {funding.address}
              </p>
              <button
                onClick={copyAddress}
                className="btn btn-secondary mt-3 w-full !py-2 !text-xs"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy address"}
              </button>
            </div>
          ) : (
            <div className="inset mt-3 flex items-start gap-2.5 p-3.5">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warn)]"
                strokeWidth={1.9}
                aria-hidden="true"
              />
              <p className="text-xs leading-relaxed text-[var(--text-low)]">
                Funding is not open in this build. There is no wallet behind the product yet and no
                address that could receive a transfer, so none is shown. You can still open a vault
                and watch a term run against your own ledger.
              </p>
            </div>
          )}

          <Link to="/app/vaults/new" className="btn btn-primary mt-3 w-full">
            <Plus className="h-4 w-4" /> Open a vault
          </Link>
        </motion.section>

        {/* Withdraw */}
        <motion.section {...rise(3)} className="panel p-5">
          <SectionHeader title="Withdraw" hint={`${money(snap.available, 2)} available`} />

          <label htmlFor="d-amt" className="eyebrow">
            Amount
          </label>
          <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-[var(--line-hi)] bg-[rgba(5,7,15,0.6)] px-3.5 py-3 focus-within:border-[var(--accent)]">
            <span className="text-[var(--text-low)]">$</span>
            <input
              id="d-amt"
              inputMode="decimal"
              value={amt}
              onChange={(e) => setAmt(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="0.00"
              className="tabular w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-low)]"
            />
            <button
              onClick={() => setAmt(snap.available.toFixed(2))}
              disabled={snap.available <= 0}
              className="min-h-[36px] btn btn-ghost !py-1 !text-[11px]"
            >
              MAX
            </button>
          </div>
          {value > snap.available && (
            <p className="mt-1.5 text-[11px] text-[var(--loss)]">
              That is more than your available balance of {money(snap.available, 2)}.
            </p>
          )}

          <label htmlFor="d-addr" className="eyebrow mt-3 block">
            Destination
          </label>
          <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-[var(--line-hi)] bg-[rgba(5,7,15,0.6)] px-3.5 py-3 focus-within:border-[var(--accent)]">
            <Wallet className="h-4 w-4 shrink-0 text-[var(--text-low)]" />
            <input
              id="d-addr"
              value={addr}
              onChange={(e) => setAddr(e.target.value)}
              placeholder="Wallet address"
              className="w-full bg-transparent font-mono text-xs outline-none placeholder:text-[var(--text-low)]"
            />
          </div>

          <button onClick={submit} disabled={!canWithdraw} className="btn btn-primary mt-4 w-full">
            <Send className="h-4 w-4" />
            {value > 0 ? `Withdraw ${money(value, 2)}` : "Withdraw"}
          </button>

          <p className="mt-3 text-[11px] leading-relaxed text-[var(--text-low)]">
            Settlement target for your tier is{" "}
            {snap.tier ? `${snap.tier.settlementHours} hours` : "72 hours"}.
          </p>
        </motion.section>
      </div>

      {/* Market */}
      <motion.div {...rise(4)}>
        <MarketPanel />
      </motion.div>

      {/* Onward */}
      <motion.section {...rise(5)} className="panel p-5">
        <SectionHeader title="Go deeper" />
        <div className="space-y-1">
          <NavRow
            icon={ArrowUpRight}
            title="Positions"
            hint="Every vault and its term"
            to="/app/vaults"
          />
          <NavRow
            icon={ArrowUpRight}
            title="Rewards"
            hint="Claim and track earnings"
            to="/app/rewards"
          />
          <NavRow
            icon={ArrowUpRight}
            title="Analytics"
            hint="Performance over time"
            to="/app/analytics"
          />
        </div>
      </motion.section>
    </div>
  );
}
