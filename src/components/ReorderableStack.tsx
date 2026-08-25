import { useEffect, useState, type ReactNode } from "react";
import { Reorder } from "framer-motion";
import { GripVertical } from "lucide-react";

type Item = {
  key: string;
  node: ReactNode;
};

type Props = {
  storageKey: string;
  items: Item[];
};

function readOrder(key: string, fallback: string[]): string[] {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed)) return fallback;
    const filtered = parsed.filter((k) => fallback.includes(k));
    fallback.forEach((k) => {
      if (!filtered.includes(k)) filtered.push(k);
    });
    return filtered;
  } catch {
    return fallback;
  }
}

export function ReorderableStack({ storageKey, items }: Props) {
  const defaultOrder = items.map((i) => i.key);
  const [order, setOrder] = useState<string[]>(() => readOrder(storageKey, defaultOrder));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(order));
    } catch {
      /* ignore */
    }
  }, [order, storageKey]);

  const byKey = new Map(items.map((i) => [i.key, i.node]));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Your stack</p>
        <button
          onClick={() => setEditing((v) => !v)}
          className="text-[10px] uppercase tracking-wider text-primary hover:underline"
        >
          {editing ? "Done" : "Reorder"}
        </button>
      </div>

      <Reorder.Group axis="y" values={order} onReorder={setOrder} className="space-y-6">
        {order.map((key) => (
          <Reorder.Item
            key={key}
            value={key}
            dragListener={editing}
            className="relative"
            whileDrag={{ scale: 1.02, boxShadow: "0 24px 48px -12px rgba(232,194,92,0.35)" }}
          >
            {editing && (
              <span className="pointer-events-none absolute -left-1 top-1/2 z-10 -translate-x-full -translate-y-1/2 rounded-full border border-primary/40 bg-black/60 p-1 text-primary backdrop-blur-md">
                <GripVertical className="h-4 w-4" />
              </span>
            )}
            {byKey.get(key)}
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
}
