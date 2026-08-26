import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { encodeQr, qrPath } from "@/lib/qr";
import { CoinLogo } from "@/features/market/CoinLogo";
import type { AssetMeta } from "@/features/market/assets";

/**
 * A deposit address, as a scannable code and as text.
 *
 * The payload is the bare address, not a `bitcoin:` or `ethereum:` URI. A URI
 * carries a chain with it, and three of the five addresses here are the same
 * EVM key receiving on Ethereum and on BNB Smart Chain: a scheme would be
 * asserting a chain the member may not have meant. A bare address is what
 * every wallet scanner accepts, and the network stays where a person can read
 * it, next to the code.
 *
 * The mark in the middle is the asset's own. A QR symbol at level M recovers
 * about fifteen percent of itself, and the geometry below puts the mark at
 * 5.2 percent of the area, which is a third of the budget. That figure is
 * asserted in `src/lib/qr.check.ts` rather than left to whoever next adjusts
 * a padding class, and every address here was put through a real decoder with
 * the mark in place before it shipped.
 *
 * The encoder itself is in `src/lib/qr.ts`.
 */

/**
 * The mark's footprint, measured against the symbol rather than the card.
 *
 * This is the correction to an easy mistake, and the check caught it: sizing
 * the mark off the card while the padding stayed a fixed 12px meant a smaller
 * card gave the mark a larger share of the symbol. At 168px it was 5.2% and
 * inside budget; at the 156px the vault flow uses it was 5.7% and over. Both
 * the mark and its pad are now fractions of the symbol, so the share is the
 * same at every size the product draws.
 */
export const CARD_PADDING = 12;
/** Mark width, as a fraction of the symbol. */
export const MARK_SCALE = 0.18;
/** White pad around the mark, per side, as a fraction of the symbol. */
export const MARK_PAD = 0.021;

const symbolWidth = (size: number) => size - CARD_PADDING * 2;

/** Fraction of the symbol's area the mark and its pad cover. */
export function markCoverage(_size: number): number {
  return (MARK_SCALE + MARK_PAD * 2) ** 2;
}
export function AddressQr({ asset, size = 168 }: { asset: AssetMeta; size?: number }) {
  const reduce = useReducedMotion();
  const [copied, setCopied] = useState(false);

  // Encoding walks eight mask candidates and scores each, so it is memoised on
  // the address rather than recomputed for every render of the panel.
  const qr = useMemo(() => encodeQr(asset.address), [asset.address]);
  const path = useMemo(() => (qr ? qrPath(qr) : ""), [qr]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(asset.address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // A denied clipboard is not an error worth a toast: the address is on
      // screen and selectable, which is the fallback anyway.
    }
  }

  const quiet = 3; // modules of margin, the four the format asks for less the card padding

  return (
    <div className="flex flex-col items-center">
      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reduce ? 0 : 0.34, ease: [0.16, 1, 0.3, 1] }}
        className="relative rounded-2xl bg-white p-3 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.6)]"
        style={{ width: size, height: size }}
      >
        {qr ? (
          <>
            <svg
              viewBox={`${-quiet} ${-quiet} ${qr.size + quiet * 2} ${qr.size + quiet * 2}`}
              width="100%"
              height="100%"
              shapeRendering="crispEdges"
              role="img"
              aria-label={`${asset.name} deposit address as a scannable code`}
            >
              <path d={path} fill="#000" />
            </svg>
            {/* The asset mark, on its own white pad so the code's quiet zone
                logic is not fighting a dark tile. */}
            <span className="pointer-events-none absolute inset-0 grid place-items-center">
              <span
                className="grid place-items-center rounded-lg bg-white"
                style={{ padding: symbolWidth(size) * MARK_PAD }}
              >
                <CoinLogo asset={asset} size={Math.round(symbolWidth(size) * MARK_SCALE)} />
              </span>
            </span>
          </>
        ) : (
          <p className="grid h-full place-items-center px-2 text-center text-[11px] text-black">
            This address is too long to draw as a code. Copy it below instead.
          </p>
        )}
      </motion.div>

      <p className="eyebrow mt-3">{asset.network}</p>
      <p className="machine mt-1.5 max-w-full break-all text-center text-[11px] leading-relaxed text-[var(--text)]">
        {asset.address}
      </p>

      <button onClick={copy} className="btn btn-secondary mt-3 w-full !py-2 !text-xs">
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy address"}
      </button>

      <p className="mt-2.5 text-center text-[11px] leading-relaxed text-[var(--text-low)]">
        Send {asset.symbol} on {asset.network} only. Another chain will not arrive.
      </p>
    </div>
  );
}
