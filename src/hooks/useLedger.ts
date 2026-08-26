import { useEffect, useMemo, useState } from "react";
import { derive, loadEvents, subscribe, type Snapshot } from "@/domain/ledger";

/**
 * Live view of the ledger.
 *
 * Re-derives on two triggers: a write to the ledger, and a slow tick so
 * continuously accruing figures visibly move while the page is open. The tick
 * is deliberately unhurried, rewards accrue at 1% of principal per day, so a
 * faster clock would only burn battery to animate noise. It stops while the
 * tab is hidden, because nothing is being read then.
 *
 * It does NOT stop for reduced motion, and used to. That preference is about
 * animation, not about data: honouring it here froze every figure in the
 * product at the value it held when the page loaded, so a member who prefers
 * reduced motion was quietly shown a stale portfolio. What reduced motion
 * changes is how a figure arrives, which is `Value`'s job, not whether the
 * number is current.
 */
export function useLedger(tickMs = 4000): Snapshot {
  const [events, setEvents] = useState(loadEvents);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => subscribe(() => setEvents(loadEvents())), []);

  useEffect(() => {
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
  }, [tickMs]);

  return useMemo(() => derive(events, now), [events, now]);
}
