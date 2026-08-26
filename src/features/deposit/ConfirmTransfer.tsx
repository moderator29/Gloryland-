import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ArrowUpRight, Check, Clock, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import type { AssetMeta } from "@/features/market/assets";
import {
  CONFIRMATIONS,
  creditFor,
  explorerUrl,
  judge,
  validTxid,
  type Transfer,
  type Verdict,
} from "@/domain/deposits";
import { loadEvents, recordDeposit } from "@/domain/ledger";
import { useMarket } from "@/hooks/useMarket";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { money } from "@/components/system/format";

/**
 * Tell the platform about a transfer, and have the chain confirm it.
 *
 * This is the member's half of the watcher. Five addresses are shared by
 * everyone, so watching them says money arrived and nothing about whose it is;
 * the transaction hash is what attributes it, and `api/chain/verify` is what
 * checks the hash against the chain rather than taking it on trust.
 *
 * Nothing here decides anything. Every rule lives in `src/domain/deposits.ts`
 * and the write refuses a duplicate hash in `recordDeposit`, so a member who
 * finds a way to press this twice still cannot be credited twice.
 */
export function ConfirmTransfer({ asset }: { asset: AssetMeta }) {
  const reduce = useReducedMotion();
  const { coins } = useMarket();
  const [txid, setTxid] = useState("");
  const [checking, setChecking] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [credited, setCredited] = useState<number | null>(null);

  const price = coins.find((c) => c.id === asset.id)?.price ?? 0;
  const shaped = validTxid(asset.id, txid);

  async function check() {
    if (!shaped || checking) return;
    setChecking(true);
    setVerdict(null);
    try {
      const r = await fetch(
        `/api/chain/verify?asset=${asset.id}&txid=${encodeURIComponent(txid.trim())}`,
      );
      const body = (await r.json()) as
        | { found: true; to: string; amount: number; confirmations: number; at: number | null }
        | { found: false; reason: string };

      if (!body.found) {
        setVerdict({ state: "failed", reason: body.reason });
        return;
      }
      const transfer: Transfer = {
        asset: asset.id,
        txid: txid.trim(),
        to: body.to,
        amount: body.amount,
        confirmations: body.confirmations,
        at: body.at,
      };
      setVerdict(judge(transfer, asset.address, loadEvents()));
    } catch {
      setVerdict({ state: "failed", reason: "Could not reach the verifier. Try again." });
    } finally {
      setChecking(false);
    }
  }

  function credit(transfer: Transfer) {
    if (price <= 0) {
      toast.error(`No ${asset.symbol} price right now, so this cannot be converted yet.`);
      return;
    }
    const amount = creditFor(transfer.amount, price);
    const written = recordDeposit({
      asset: asset.symbol,
      network: asset.network,
      txid: transfer.txid,
      units: transfer.amount,
      unitPrice: price,
      amount,
      // Stamped when the money moved, not when the hash was pasted.
      at: transfer.at ?? undefined,
    });
    if (!written.ok) {
      toast.error(written.reason);
      return;
    }
    setCredited(amount);
    setVerdict(null);
    setTxid("");
    toast.success(`${money(amount, 2)} credited to your balance`);
  }

  return (
    <div className="inset mt-3 p-4">
      <p className="eyebrow flex items-center gap-1.5">
        <Search className="h-3 w-3" /> Already sent it?
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-low)]">
        Paste the transaction hash from your wallet. It is checked against {asset.network} before
        anything is credited.
      </p>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--line-hi)] bg-[rgba(5,7,15,0.6)] px-3 py-2.5 focus-within:border-[var(--accent)]">
        <input
          value={txid}
          onChange={(e) => {
            setTxid(e.target.value.trim());
            setVerdict(null);
            setCredited(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && void check()}
          placeholder={asset.id === "btc" || asset.id === "sol" ? "abc123..." : "0xabc123..."}
          spellCheck={false}
          autoCapitalize="none"
          aria-label={`${asset.network} transaction hash`}
          className="machine w-full min-w-0 bg-transparent text-[11px] text-[var(--text-hi)] outline-none placeholder:text-[var(--text-low)]"
        />
      </div>

      <button
        onClick={() => void check()}
        disabled={!shaped || checking}
        className="btn btn-secondary mt-2.5 w-full !py-2 !text-xs"
      >
        {checking ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Search className="h-3.5 w-3.5" />
        )}
        {checking ? `Reading ${asset.network}` : "Check the chain"}
      </button>

      {txid.length > 8 && !shaped && (
        <p className="mt-2 text-[11px] text-[var(--warn)]">
          That does not look like a {asset.network} transaction hash.
        </p>
      )}

      <AnimatePresence mode="wait">
        {credited !== null && (
          <Result key="credited" tone="gain" icon={Check} reduce={reduce}>
            {money(credited, 2)} credited. It is in your available balance and on your ledger.
          </Result>
        )}

        {verdict?.state === "verified" && (
          <motion.div
            key="verified"
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0 }}
            className="mt-3"
          >
            <div className="rounded-xl border border-[rgba(52,211,153,0.35)] bg-[rgba(52,211,153,0.08)] p-3">
              <p className="flex items-center gap-2 text-xs font-semibold text-[var(--gain)]">
                <Check className="h-3.5 w-3.5" /> Confirmed on {asset.network}
              </p>
              <dl className="mt-2.5 space-y-1.5 text-[11px]">
                <Row label="Received">
                  {verdict.transfer.amount} {asset.symbol}
                </Row>
                <Row label={`At ${money(price, asset.priceDecimals)}`}>
                  {money(creditFor(verdict.transfer.amount, price), 2)}
                </Row>
                <Row label="Confirmations">{verdict.transfer.confirmations}</Row>
              </dl>
              <button
                onClick={() => credit(verdict.transfer)}
                disabled={price <= 0}
                className="btn btn-primary mt-3 w-full !py-2 !text-xs"
              >
                Credit {money(creditFor(verdict.transfer.amount, price), 2)} to my balance
              </button>
            </div>
          </motion.div>
        )}

        {verdict?.state === "pending" && (
          <Result key="pending" tone="warn" icon={Clock} reduce={reduce}>
            Found on {asset.network} with {verdict.transfer.confirmations} of{" "}
            {CONFIRMATIONS[asset.id]} confirmations. {verdict.needs} more and it can be credited.
            Nothing is lost while you wait.
          </Result>
        )}

        {verdict?.state === "claimed" && (
          <Result key="claimed" tone="warn" icon={AlertTriangle} reduce={reduce}>
            That transfer has already been credited to this account. It cannot be credited twice.
          </Result>
        )}

        {verdict?.state === "elsewhere" && (
          <Result key="elsewhere" tone="loss" icon={AlertTriangle} reduce={reduce}>
            That transaction is real, but it paid a different address. Check you sent to the{" "}
            {asset.network} address above and on that network.
          </Result>
        )}

        {verdict?.state === "missing" && (
          <Result key="missing" tone="loss" icon={AlertTriangle} reduce={reduce}>
            Nothing with that hash on {asset.network}.
          </Result>
        )}

        {verdict?.state === "failed" && (
          <Result key="failed" tone="loss" icon={AlertTriangle} reduce={reduce}>
            {verdict.reason}
          </Result>
        )}
      </AnimatePresence>

      {txid.length > 8 && shaped && (
        <a
          href={explorerUrl(asset.id, txid)}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-2.5 inline-flex items-center gap-1 text-[11px] text-[var(--text-low)] underline underline-offset-2 hover:text-[var(--accent-hi)]"
        >
          Open it on the block explorer <ArrowUpRight className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[var(--text-low)]">{label}</dt>
      <dd className="tabular font-semibold text-[var(--text-hi)]">{children}</dd>
    </div>
  );
}

function Result({
  tone,
  icon: Icon,
  reduce,
  children,
}: {
  tone: "gain" | "warn" | "loss";
  icon: typeof Check;
  reduce: boolean;
  children: React.ReactNode;
}) {
  const colour = `var(--${tone})`;
  return (
    <motion.p
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0 }}
      className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed"
      style={{ color: colour }}
    >
      <Icon className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={2} />
      <span>{children}</span>
    </motion.p>
  );
}
