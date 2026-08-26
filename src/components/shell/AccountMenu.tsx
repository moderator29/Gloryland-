import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Settings, ShieldCheck, ChevronDown } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { useLedger } from "@/hooks/useLedger";
import { useArmedAction } from "@/hooks/useArmedAction";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/** Identity, current standing, and the account actions, behind one control. */
export function AccountMenu() {
  const { username, member, initials: memberInitials, logout } = useUser();
  const snap = useLedger();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [armed, requestLogout] = useArmedAction(logout);

  const initial = memberInitials || (username || "").trim().charAt(0).toUpperCase() || "R";

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrap} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[rgba(255,255,255,0.02)] py-1.5 pl-1.5 pr-2 transition-colors hover:border-[var(--line-hi)]"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
      >
        <span
          className="grid h-7 w-7 place-items-center rounded-lg text-xs font-bold text-[#04101f]"
          style={{ background: "linear-gradient(160deg, var(--accent-soft), var(--accent))" }}
        >
          {initial}
        </span>
        <span className="hidden text-xs font-medium text-[var(--text)] sm:block">
          {username || "Member"}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-[var(--text-low)]" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            className="raised absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl p-2"
            initial={reduce ? false : { opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: reduce ? 0 : 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-2 rounded-xl border border-[var(--line)] bg-[rgba(5,7,15,0.5)] p-3">
              <p className="text-sm font-semibold text-[var(--text-hi)]">{username || "Member"}</p>
              {member && (
                <p className="machine mt-0.5 text-[var(--text-low)]">@{member.username}</p>
              )}
              <p className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--accent-hi)]">
                <ShieldCheck className="h-3 w-3" />
                {snap.tier ? `${snap.tier.name} tier` : "No tier yet"}
              </p>
            </div>

            <Link
              to="/app/settings"
              role="menuitem"
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-[var(--text)] transition-colors hover:bg-[rgba(120,160,220,0.07)]"
            >
              <Settings className="h-4 w-4" /> Settings
            </Link>
            <button
              role="menuitem"
              onClick={requestLogout}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors ${
                armed
                  ? "bg-[rgba(248,113,113,0.14)] font-semibold text-[var(--loss)]"
                  : "text-[var(--text)] hover:bg-[rgba(120,160,220,0.07)]"
              }`}
            >
              <LogOut className="h-4 w-4" /> {armed ? "Tap again to confirm" : "Sign out"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
