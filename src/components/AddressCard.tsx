import { useEffect, useRef, useState } from "react";
import { Copy, Check, QrCode, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { BTC_WALLET } from "@/lib/site-config";
import { playTap } from "@/lib/sound";
import { tap as hapticTap } from "@/lib/haptic";

function truncate(addr: string, head = 6, tail = 6) {
  if (addr.length <= head + tail + 1) return addr;
  return `${addr.slice(0, head)}...${addr.slice(-tail)}`;
}

function useDialogA11y(active: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!active) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusables = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      );
    focusables()[0]?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      const current = document.activeElement;
      if (e.shiftKey && (current === first || !dialog.contains(current))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (current === last || !dialog.contains(current))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      trigger?.focus();
    };
  }, [active]);

  return dialogRef;
}

export function AddressCard({
  address = BTC_WALLET,
  label = "BTC Wallet",
  network = "Bitcoin Mainnet",
}: {
  address?: string;
  label?: string;
  network?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const dialogRef = useDialogA11y(qrOpen, () => setQrOpen(false));

  const copy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    playTap();
    hapticTap();
    toast.success("Wallet address copied.", { duration: 1500 });
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <>
      <div className="glass-luxury aurora-border relative overflow-hidden p-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full"
            style={{
              background: "linear-gradient(135deg, #f7931a 0%, #ffb347 100%)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 12px -2px rgba(247,147,26,0.5)",
            }}
          >
            <span className="font-display text-lg font-bold text-white" style={{ lineHeight: 1 }}>
              ₿
            </span>
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-display text-base leading-tight">{label}</p>
              <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                BTC
              </span>
            </div>
            <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
              {truncate(address, 8, 8)}
            </p>
          </div>

          <button
            onClick={() => {
              setQrOpen(true);
              playTap();
              hapticTap();
            }}
            title="Show QR"
            aria-label="Show QR code"
            className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-black/30 text-muted-foreground transition-colors hover:text-primary"
          >
            <QrCode className="h-4 w-4" />
          </button>
          <button
            onClick={copy}
            title="Copy address"
            aria-label="Copy address"
            className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary ring-1 ring-primary/40 transition-transform active:scale-95"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground/80">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success pulse-gold" />
            {network}
          </span>
          <a
            href={`https://mempool.space/address/${address}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:text-primary"
          >
            View on explorer <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      <AnimatePresence>
        {qrOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-5 backdrop-blur-xl"
            onClick={() => setQrOpen(false)}
          >
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label={`${label} QR code`}
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              className="glass-luxury aurora-border w-full max-w-xs p-6 text-center"
            >
              <div className="mx-auto w-fit rounded-2xl bg-white p-4">
                <QRCodeSVG value={address} size={200} level="H" />
              </div>
              <p className="mt-4 break-all font-mono text-[11px] text-muted-foreground">
                {address}
              </p>
              <button
                onClick={copy}
                className="btn-foil mt-4 inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy Address"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
