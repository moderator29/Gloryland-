import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/**
 * States plainly that the browser has no connection.
 *
 * Everything financial in this build is derived from a ledger in this browser,
 * so an offline member keeps a working, honest account: standing, accrual and
 * every position carry on exactly as before. What silently stops is the market
 * feed, and prices that quietly freeze look identical to prices that have not
 * moved. This says which it is, and says the rest is unaffected, so the notice
 * reassures where it should rather than raising an alarm it cannot justify.
 *
 * `navigator.onLine` only proves the machine has no network interface up: it
 * cannot know whether the route out actually reaches anything. That makes a
 * false negative impossible and a false positive possible, which is the right
 * way round for a banner that claims something is broken.
 */
export function OfflineNotice() {
  const [offline, setOffline] = useState(
    () => typeof navigator !== "undefined" && navigator.onLine === false,
  );

  useEffect(() => {
    const online = () => setOffline(false);
    const gone = () => setOffline(true);
    window.addEventListener("online", online);
    window.addEventListener("offline", gone);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", gone);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="flex items-center gap-2.5 border-b border-[rgba(248,113,113,0.24)] bg-[rgba(248,113,113,0.08)] px-3 py-1.5 sm:px-6 sm:py-2"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0 text-[var(--loss)]" aria-hidden="true" />
      <p className="flex-1 text-[11px] leading-relaxed text-[var(--text-mid)]">
        <span className="font-semibold text-[var(--loss)]">Offline.</span> Market prices are frozen
        at their last reading.
        <span className="hidden sm:inline">
          {" "}
          Your own figures are derived in this browser and are unaffected.
        </span>
      </p>
    </div>
  );
}
