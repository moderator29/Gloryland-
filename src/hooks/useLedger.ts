import { useEffect, useMemo, useState } from "react";
import { derive, loadEvents, subscribe, type Snapshot } from "@/domain/ledger";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Live view of the ledger.
 *
 * Re-derives on two triggers: a write to the ledger, and a slow tick so
 * continuously accruing figures visibly move while the page is open. The tick
 * is deliberately unhurried — rewards accrue at 1% of principal per day, so a
 * faster clock would only burn battery to animate noise. It stops entirely
 * when the tab is hidden or the user prefers reduced motion.
 */
export function useLedger(tickMs = 4000): Snapshot {
  const reduce = useReducedMotion();
  const [events, setEvents] = useState(loadEvents);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => subscribe(() => setEvents(loadEvents())), []);

  useEffect(() => {
    if (reduce) return;
    let id = 0;
    const start = () => {
      stop();
      id = window.setInterval(() => setNow(Date.now()), tickMs);
    };
    const stop = () => {
      if (id) window.clearInterval(id);
      id = 0;
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else {
        setNow(Date.now());
        start();
      }
    };
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [tickMs, reduce]);

  return useMemo(() => derive(events, now), [events, now]);
}
