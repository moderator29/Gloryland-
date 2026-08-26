import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Compass, LifeBuoy, Search, X } from "lucide-react";
import { DAILY_RATE, TIERS, WITHDRAW_INTERVAL_DAYS } from "@/domain/tiers";
import { money } from "@/components/system/format";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Wayfinder: contextual help.
 *
 * A sheet is acceptable here because help is secondary. It never holds
 * anything a member needs to act on, so trapping it behind an overlay costs
 * nothing, and the questions are short enough that reading them beside the
 * screen they are about is the point.
 *
 * Every answer is assembled from the domain constants rather than written out
 * by hand, so the help text cannot quietly disagree with the product.
 */

const DAILY_PCT = (DAILY_RATE * 100).toFixed(0);

type Entry = { id: string; q: string; a: string[] };

const ENTRIES: Entry[] = [
  {
    id: "vault",
    q: "How does a vault work?",
    a: [
      `A vault holds capital and accrues ${DAILY_PCT}% of the original principal every day it stays there. There is no term and no maturity: it accrues for as long as you leave it.`,
      "Accrual is continuous rather than a single payment at the end, and it stops the moment the term matures.",
    ],
  },
  {
    id: "maturity",
    q: "What happens when a term matures?",
    a: [
      `Nothing stops it. A position accrues at the same rate on its hundredth day as on its first, and a withdrawal can be requested every ${WITHDRAW_INTERVAL_DAYS} days.`,
      "Settling the position returns the principal to your available cash, alongside any rewards you have already claimed.",
    ],
  },
  {
    id: "claiming",
    q: "How does claiming work?",
    a: [
      "Rewards accrue against the position continuously. Anything accrued and not yet claimed shows as claimable.",
      "Claiming moves those rewards out of the position and into available cash. You can claim at any point in the term, and claiming does not shorten it or change what the position earns.",
    ],
  },
  {
    id: "settlement",
    q: "What does a settlement target mean?",
    a: [
      "It is the window the desk works to when you request a withdrawal, measured from the moment the request is filed.",
      TIERS.map((t) => `${t.name}: ${t.settlementHours}h`).join(" · "),
      "It is a target the desk holds itself to, not a guarantee.",
    ],
  },
  {
    id: "tiers",
    q: "How are tiers reached?",
    a: [
      "Your tier follows your lifetime contribution, so it is reached by placing capital rather than by buying a plan. It never falls back once reached.",
      TIERS.map((t) => `${t.name} from ${money(t.entry)}`).join(" · "),
    ],
  },
  {
    id: "rate",
    q: "Does a higher tier earn a better rate?",
    a: [
      `No. Every tier earns the same ${DAILY_PCT}% a day, from ${TIERS[0].name} to ${TIERS[TIERS.length - 1].name}.`,
      "What changes as you climb is access, limits and how fast the desk targets settling a withdrawal.",
    ],
  },
  {
    id: "minimum",
    q: "What is the smallest vault I can open?",
    a: [
      `${money(TIERS[0].entry)}, the entry point of the ${TIERS[0].name} tier. The term and the rate are identical at every size.`,
    ],
  },
  {
    id: "preview",
    q: "What can the platform do today?",
    a: [
      "It does run the full model. Every figure on screen is derived from your own recorded events plus the clock, so the arithmetic you see is the arithmetic the product uses.",
      "It does not move money, hold custody of anything, or talk to a server. Your ledger is stored in this browser, which means clearing site data clears it, and it will not follow you to another device.",
    ],
  },
  {
    id: "where",
    q: "Where do I find things?",
    a: [
      "Desk is where you act. Vaults holds your positions, Rewards holds claiming, Activity holds the complete record of events.",
      "Anything that is a detail of one surface lives inside it rather than beside it in the navigation.",
    ],
  },
];

const norm = (s: string) => s.toLowerCase();

export type WayfinderProps = {
  className?: string;
};

export function Wayfinder({ className = "" }: WayfinderProps) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return ENTRIES;
    return ENTRIES.filter((e) => norm(`${e.q} ${e.a.join(" ")}`).includes(q));
  }, [query]);

  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    search.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        return;
      }
      // Keep Tab inside the sheet: help should never drop the member behind it.
      if (e.key !== "Tab" || !panel.current) return;
      const focusable = panel.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const lastEl = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus goes back where it came from, so closing help does not lose the page.
  // Guarded on having actually been open, or the first render would pull focus
  // to the trigger on every page load.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      return;
    }
    if (!wasOpen.current) return;
    wasOpen.current = false;
    trigger.current?.focus({ preventScroll: true });
  }, [open]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open help"
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-[rgba(5,7,15,0.5)] text-[var(--text-mid)] transition-colors hover:border-[var(--line-hi)] hover:text-[var(--accent-hi)] ${className}`}
      >
        <Compass className="h-[18px] w-[18px]" strokeWidth={1.8} />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <>
              <motion.div
                className="fixed inset-0 z-50 bg-[rgba(5,7,15,0.72)]"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduce ? undefined : { opacity: 0 }}
                transition={{ duration: reduce ? 0 : 0.18 }}
                onClick={close}
                aria-hidden="true"
              />

              <motion.div
                ref={panel}
                role="dialog"
                aria-modal="true"
                aria-label="Help"
                className="raised fixed inset-x-0 bottom-0 z-50 flex max-h-[86vh] flex-col rounded-t-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[26rem] sm:rounded-l-2xl sm:rounded-tr-none"
                initial={reduce ? false : { opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: 24 }}
                transition={{ duration: reduce ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] p-4">
                  <div className="min-w-0">
                    <p className="eyebrow">Wayfinder</p>
                    <h2 className="mt-1 text-[15px] font-semibold text-[var(--text-hi)]">
                      How this works
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Close help"
                    className="btn btn-ghost shrink-0 px-2 py-2"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="border-b border-[var(--line)] p-4">
                  <label htmlFor="rgl-wayfinder-search" className="sr-only">
                    Search help
                  </label>
                  <div className="inset flex items-center gap-2.5 px-3 py-2.5">
                    <Search
                      className="h-4 w-4 shrink-0 text-[var(--text-low)]"
                      aria-hidden="true"
                    />
                    <input
                      ref={search}
                      id="rgl-wayfinder-search"
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search questions"
                      className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-hi)] outline-none placeholder:text-[var(--text-low)]"
                    />
                  </div>
                </div>

                <div className="no-bar min-h-0 flex-1 overflow-y-auto p-4">
                  {results.length === 0 ? (
                    <p className="px-1 py-6 text-center text-sm text-[var(--text-low)]">
                      Nothing here matches that. Support can take the question directly.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {results.map((e) => (
                        <li key={e.id} className="panel p-3.5">
                          <h3 className="text-sm font-semibold text-[var(--text-hi)]">{e.q}</h3>
                          {e.a.map((line, i) => (
                            <p
                              key={i}
                              className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-mid)]"
                            >
                              {line}
                            </p>
                          ))}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="border-t border-[var(--line)] p-4">
                  <Link to="/app/support" onClick={close} className="btn btn-secondary w-full">
                    <LifeBuoy className="h-4 w-4" /> Ask Support
                  </Link>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
