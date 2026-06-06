import { useRef } from "react";
import { Download, BadgeCheck } from "lucide-react";
import { toast } from "sonner";

type Props = {
  plan?: string;
  amount: number;
  asset: string;
  network: string;
  txDate: Date;
};

export function Receipt({ plan, amount, asset, network, txDate }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const save = async () => {
    const node = ref.current;
    if (!node) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(node, {
        backgroundColor: "#0a0a0a",
        scale: 2,
        useCORS: true,
      });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `emilia-clarke-receipt-${Date.now()}.png`;
      a.click();
      toast.success("Receipt saved.", { duration: 1600 });
    } catch {
      toast.error("Could not generate receipt.");
    }
  };

  return (
    <div className="space-y-3">
      <div ref={ref} className="glass-luxury aurora-border relative overflow-hidden p-6">
        <div className="flex items-center justify-between">
          <span className="font-display text-xl text-gradient-gold">Emilia Clarke</span>
          <BadgeCheck className="h-5 w-5 text-primary" />
        </div>
        <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Deposit Receipt
        </p>

        <div className="mt-5 space-y-3">
          {plan && <Row label="Tier" value={plan} />}
          <Row label="Amount" value={`$${amount.toLocaleString()}`} accent />
          <Row label="Asset" value={asset} />
          <Row label="Network" value={network} />
          <Row label="Date" value={txDate.toLocaleString()} />
          <Row label="Status" value="Confirmed" success />
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-border/40 pt-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            emiliaclarke.portal
          </p>
          <p className="font-mono text-[10px] text-muted-foreground">
            #{txDate.getTime().toString(36).toUpperCase()}
          </p>
        </div>
      </div>

      <button
        onClick={save}
        className="btn-foil flex w-full items-center justify-center gap-2 px-4 py-3 text-sm"
      >
        <Download className="h-4 w-4" /> Save Receipt
      </button>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
  success,
}: {
  label: string;
  value: string;
  accent?: boolean;
  success?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border/40 pb-2 last:border-b-0">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span
        className={`font-display ${accent ? "text-2xl text-gradient-gold" : "text-sm"} ${
          success ? "text-success" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
