import { useEffect, useState } from "react";

type Options = {
  initial: number;
  intervalMs?: number;
  minStep?: number;
  maxStep?: number;
};

export function useBalancePulse({
  initial,
  intervalMs = 15000,
  minStep = 3,
  maxStep = 18,
}: Options) {
  const [value, setValue] = useState(initial);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      const delta = Math.random() * (maxStep - minStep) + minStep;
      setValue((v) => Math.round((v + delta) * 100) / 100);
      setPulse(true);
      window.setTimeout(() => setPulse(false), 900);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, minStep, maxStep]);

  return { value, pulse };
}
