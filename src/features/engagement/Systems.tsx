import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Systems: platform status, limited to what the browser can actually observe.
 *
 * There are no uptime percentages here and no service the page has not spoken
 * to. Three honest readings: whether the market feed answered this session
 * (the caller passes what its fetch returned), whether the local ledger store
 * could be read, and which build is running. Anything else would be a claim
 * the client cannot support.
 */

export type SystemsProps = {
  /** Did the market feed respond this session? Undefined while it is in flight. */
  marketOk?: boolean;
  /**
   * Did the ledger read succeed? Omit to let the component probe local storage
   * itself, which is where the ledger lives in this build.
   */
  ledgerOk?: boolean;
  className?: string;
};

type Tone = "ok" | "attention" | "unknown";

type Line = {
  name: string;
  detail: string;
  tone: Tone;
};

/** A read against the ledger's store, reporting only whether it was permitted. */
function probeLedgerStore(): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.getItem("rgl_ledger_v1");
    return true;
  } catch {
    return false;
  }
}

const DOT: Record<Tone, string> = {
  ok: "bg-[var(--gain)]",
  attention: "bg-[var(--warn)]",
  unknown: "bg-[var(--text-low)]",
};

const TEXT: Record<Tone, string> = {
  ok: "text-[var(--gain)]",
  attention: "text-[var(--warn)]",
  unknown: "text-[var(--text-low)]",
};

export function Systems({ marketOk, ledgerOk, className = "" }: SystemsProps) {
  const reduce = useReducedMotion();
  const [probed, setProbed] = useState<boolean | null>(null);

  useEffect(() => {
    if (ledgerOk === undefined) setProbed(probeLedgerStore());
  }, [ledgerOk]);

  const ledgerState = ledgerOk ?? probed;
  const preview = import.meta.env.DEV || import.meta.env.MODE !== "production";

  const lines: Line[] = [
    {
      name: "Market feed",
      detail:
        marketOk === undefined
          ? "Waiting on a response"
          : marketOk
            ? "Responded this session"
            : "No response, prices may be stale",
      tone: marketOk === undefined ? "unknown" : marketOk ? "ok" : "attention",
    },
    {
      name: "Ledger",
      detail:
        ledgerState === null
          ? "Checking local store"
          : ledgerState
            ? "Read from local store"
            : "Local store unavailable in this browser",
      tone: ledgerState === null ? "unknown" : ledgerState ? "ok" : "attention",
    },
    {
      name: "Build",
      detail: preview ? "Preview build, figures are local to this browser" : "Production build",
      tone: preview ? "attention" : "ok",
    },
  ];

  return (
    <section className={`panel p-4 ${className}`} aria-labelledby="systems-title">
      <div className="mb-1 flex items-center gap-2">
        <Activity
          className="h-4 w-4 text-[var(--accent-hi)]"
          strokeWidth={1.8}
          aria-hidden="true"
        />
        <h3 id="systems-title" className="text-sm font-semibold text-[var(--text-hi)]">
          Systems
        </h3>
      </div>

      <ul className="ledger mt-2">
        {lines.map((line, i) => (
          <motion.li
            key={line.name}
            className="rail-row"
            initial={reduce ? false : { opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={
              reduce ? { duration: 0 } : { duration: 0.3, delay: i * 0.06, ease: "easeOut" }
            }
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${DOT[line.tone]} ${
                reduce || line.tone === "unknown" ? "" : "pulse-dot"
              }`}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-[var(--text-hi)]">{line.name}</span>
              <span className={`mt-0.5 block text-xs ${TEXT[line.tone]}`}>{line.detail}</span>
            </span>
          </motion.li>
        ))}
      </ul>

      <p className="mt-3 text-[11px] leading-relaxed text-[var(--text-low)]">
        Read from this browser session only. No uptime figure is claimed.
      </p>
    </section>
  );
}
