import { useEffect, useState } from "react";
import { Activity, Layers3 } from "lucide-react";

export function StatusCard() {
  const [block, setBlock] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchIt = async () => {
      try {
        const res = await fetch("https://mempool.space/api/blocks/tip/height");
        if (!res.ok) return;
        const text = await res.text();
        const n = parseInt(text, 10);
        if (!cancelled && !Number.isNaN(n)) setBlock(n);
      } catch {
        /* ignore */
      }
    };
    fetchIt();
    const id = window.setInterval(fetchIt, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="glass-luxury flex items-center gap-4 p-4">
      <div className="flex flex-1 items-center gap-2 text-sm">
        <span className="relative grid h-2 w-2 place-items-center">
          <span className="absolute inset-0 rounded-full bg-success pulse-gold" />
          <span className="relative h-2 w-2 rounded-full bg-success" />
        </span>
        <span className="text-muted-foreground">All systems operational</span>
      </div>
      <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">
        <Layers3 className="h-3.5 w-3.5 text-primary" />
        Block
        <span className="font-numeric text-white">{block ? block.toLocaleString() : "—"}</span>
      </div>
      <Activity className="h-4 w-4 text-success" />
    </div>
  );
}
