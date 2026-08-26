import { useState } from "react";
import { Info, X } from "lucide-react";

const KEY = "rgl_local_notice_dismissed";

/**
 * States plainly, on the screens where the figures actually appear, that this
 * build derives everything from a ledger held in this browser. The disclosure
 * belongs next to the numbers, not only on the sign-in screen. It disappears
 * on its own the day the ledger is served rather than stored locally.
 */
export function LocalLedgerNotice() {
  const [hidden, setHidden] = useState(() => {
    try {
      return sessionStorage.getItem(KEY) === "1";
    } catch {
      return false;
    }
  });

  if (hidden) return null;

  return (
    <div className="flex items-center gap-2.5 border-b border-[rgba(251,191,36,0.22)] bg-[rgba(251,191,36,0.07)] px-3 py-1.5 sm:px-6 sm:py-2">
      <Info className="h-3.5 w-3.5 shrink-0 text-[var(--warn)]" aria-hidden="true" />
      {/* The disclosure has to hold on a phone without taking three lines of a
          short screen, so the short form carries the fact and the long form
          carries the detail. Both say the same thing. */}
      <p className="flex-1 text-[11px] leading-relaxed text-[var(--text-mid)]">
        <span className="font-semibold text-[var(--warn)]">Preview build.</span> Every figure is
        derived from a ledger in this browser.
        <span className="hidden sm:inline">
          {" "}
          No custody, settlement or account exists behind it yet.
        </span>
      </p>
      <button
        onClick={() => {
          setHidden(true);
          try {
            sessionStorage.setItem(KEY, "1");
          } catch {
            /* ignore */
          }
        }}
        aria-label="Dismiss notice"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--text-low)] transition-colors hover:bg-[rgba(120,160,220,0.08)] hover:text-[var(--text-hi)]"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
