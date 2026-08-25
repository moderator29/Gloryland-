import { useState, type FormEvent, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { Wordmark } from "@/components/brand/Mark";
import { Ambience } from "./Ambience";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { CYCLE_DAYS, CYCLE_RETURN } from "@/domain/tiers";

/**
 * Entry to the authenticated area.
 *
 * This build identifies a member by a name held in their browser — there is no
 * account system behind it yet, and the copy says so rather than implying a
 * security guarantee the product cannot make.
 */
export function Gate({ children }: { children: ReactNode }) {
  const { username, setUsername } = useUser();
  const [name, setName] = useState("");
  const reduce = useReducedMotion();

  if (username) return <>{children}</>;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) setUsername(trimmed);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--ink-000)] px-5 py-10">
      <Ambience />
      <motion.div
        className="panel-hi edge-light relative z-10 w-full max-w-md p-8"
        initial={reduce ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <Wordmark size={30} stacked tagline />

        <h1 className="mt-7 text-center text-lg font-semibold text-[var(--text-hi)]">
          Enter the portal
        </h1>
        <p className="mt-2 text-center text-sm leading-relaxed text-[var(--text-low)]">
          Vault capital for a {CYCLE_DAYS}-day term at {(CYCLE_RETURN * 100).toFixed(0)}%, accruing
          daily.
        </p>

        <form onSubmit={submit} className="mt-7">
          <label htmlFor="member" className="eyebrow">
            Your name
          </label>
          <input
            id="member"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="How should we address you?"
            autoComplete="name"
            className="mt-1.5 w-full rounded-xl border border-[var(--line-hi)] bg-[rgba(5,7,15,0.6)] px-4 py-3.5 text-sm outline-none transition-colors focus:border-[var(--accent)] placeholder:text-[var(--text-low)]"
          />
          <button type="submit" disabled={!name.trim()} className="btn btn-primary mt-4 w-full">
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-[var(--text-low)]">
          No account is created. This build keeps your session and ledger in this browser only.
        </p>
      </motion.div>
    </div>
  );
}
