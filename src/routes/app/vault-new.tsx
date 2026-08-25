import { useMemo, useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Info } from "lucide-react";
import { toast } from "sonner";
import { openPosition } from "@/domain/ledger";
import {
  CYCLE_DAYS,
  CYCLE_RETURN,
  TIERS,
  tierForAmount,
  dailyReward,
  termReward,
} from "@/domain/tiers";
import { Progress } from "@/components/system/ui";
import { money } from "@/components/system/format";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const ASSETS = [
  { id: "BTC", label: "Bitcoin", network: "Bitcoin" },
  { id: "ETH", label: "Ethereum", network: "Ethereum" },
  { id: "USDT", label: "Tether", network: "TRC-20" },
] as const;

export default function VaultNew() {
  const nav = useNavigate();
  const reduce = useReducedMotion();
  const [params] = useSearchParams();
  const preset = Number(params.get("amount")) || 0;

  const [amount, setAmount] = useState(preset ? String(preset) : "");
  const [asset, setAsset] = useState<(typeof ASSETS)[number]>(ASSETS[0]);
  const [confirmed, setConfirmed] = useState(false);

  const value = Number(amount) || 0;
  const tier = useMemo(() => tierForAmount(value), [value]);
  const minimum = TIERS[0].entry;
  const valid = value >= minimum && tier !== null;

  const submit = () => {
    if (!valid || !tier) return;
    openPosition({ amount: value, tierId: tier.id, asset: asset.id, network: asset.network });
    toast.success(`${tier.name} vault opened for ${money(value)}`);
    nav("/app/vaults");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link to="/app/vaults" className="btn btn-ghost -ml-2 !py-1.5 !text-xs">
        <ArrowLeft className="h-4 w-4" /> Vaults
      </Link>

      <div>
        <p className="eyebrow">New position</p>
        <h1 className="display mt-1 text-2xl sm:text-3xl">Open a vault</h1>
        <p className="mt-2 text-sm text-[var(--text-low)]">
          Capital is held for a {CYCLE_DAYS}-day term and returns {(CYCLE_RETURN * 100).toFixed(0)}
          %, accruing daily from the moment it is placed.
        </p>
      </div>

      {/* Amount */}
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
            aria-describedby="amount-help"
            className="metric w-full bg-transparent text-2xl outline-none placeholder:text-[var(--text-low)]"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {TIERS.map((t) => (
            <button
              key={t.id}
              onClick={() => setAmount(String(t.entry))}
              className={`chip transition-colors ${
                value === t.entry ? "chip-accent" : "hover:border-[var(--line-hi)]"
              }`}
            >
              {money(t.entry)}
            </button>
          ))}
        </div>

        <p id="amount-help" className="mt-3 text-xs text-[var(--text-low)]">
          {value > 0 && !valid
            ? `Minimum entry is ${money(minimum)} (${TIERS[0].name} tier).`
            : `Minimum ${money(minimum)}. Larger placements unlock higher tiers.`}
        </p>
      </section>

      {/* Asset */}
      <section className="panel p-5">
        <p className="eyebrow">Funding asset</p>
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          {ASSETS.map((a) => (
            <button
              key={a.id}
              onClick={() => setAsset(a)}
              aria-pressed={asset.id === a.id}
              className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                asset.id === a.id
                  ? "border-[rgba(46,139,255,0.45)] bg-[rgba(46,139,255,0.12)]"
                  : "border-[var(--line)] hover:border-[var(--line-hi)]"
              }`}
            >
              <p className="text-sm font-semibold text-[var(--text-hi)]">{a.id}</p>
              <p className="mt-0.5 text-[11px] text-[var(--text-low)]">{a.network}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Projection */}
      {valid && tier && (
        <motion.section
          className="panel-hi edge-light p-5"
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.3 }}
        >
          <div className="flex items-center justify-between">
            <p className="eyebrow">Projection</p>
            <span className="chip chip-accent">{tier.name}</span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div>
              <p className="text-[11px] text-[var(--text-low)]">Per day</p>
              <p className="metric mt-1 text-lg text-[var(--gain)]">
                {money(dailyReward(value), 2)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[var(--text-low)]">Term reward</p>
              <p className="metric mt-1 text-lg text-[var(--gain)]">{money(termReward(value))}</p>
            </div>
            <div>
              <p className="text-[11px] text-[var(--text-low)]">At maturity</p>
              <p className="metric mt-1 text-lg">{money(value + termReward(value))}</p>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-1.5 flex justify-between text-[11px] text-[var(--text-low)]">
              <span>Day 0</span>
              <span>Day {CYCLE_DAYS}</span>
            </div>
            <Progress value={0} height={5} label="Term not started" />
          </div>

          <ul className="mt-5 space-y-2">
            {tier.benefits.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-[var(--text)]">
                <Check
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent-hi)]"
                  strokeWidth={3}
                />
                {b}
              </li>
            ))}
          </ul>
        </motion.section>
      )}

      {/* Confirm */}
      <section className="panel p-5">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
          />
          <span className="text-xs leading-relaxed text-[var(--text-mid)]">
            I understand capital is committed for the {CYCLE_DAYS}-day term, that projections are
            illustrative rather than guaranteed, and that digital asset investments carry risk
            including loss of principal.
          </span>
        </label>

        <button
          onClick={submit}
          disabled={!valid || !confirmed}
          className="btn btn-primary mt-4 w-full"
        >
          {valid ? `Open ${tier?.name} vault for ${money(value)}` : "Enter an amount"}
        </button>

        <p className="mt-3 flex items-start gap-1.5 text-[11px] text-[var(--text-low)]">
          <Info className="mt-px h-3 w-3 shrink-0" />
          This build records positions locally in your browser. Connecting custody and settlement
          requires the production backend.
        </p>
      </section>
    </div>
  );
}
