import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function Countdown({ seed }: { seed: string }) {
  const target = useTargetFromSeed(seed);
  const [left, setLeft] = useState(() => Math.max(0, target - Date.now()));

  useEffect(() => {
    const id = window.setInterval(() => {
      setLeft(Math.max(0, target - Date.now()));
    }, 1000);
    return () => window.clearInterval(id);
  }, [target]);

  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-black/40 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-primary">
      <Timer className="h-3 w-3" />
      {pad(h)}:{pad(m)}:{pad(s)}
    </span>
  );
}

function useTargetFromSeed(seed: string) {
  const [target] = useState(() => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    const hours = 4 + (h % 18);
    const mins = h % 60;
    return Date.now() + hours * 3_600_000 + mins * 60_000;
  });
  return target;
}
