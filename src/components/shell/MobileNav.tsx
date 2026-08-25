import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/brand/Mark";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { NAV, MOBILE_TABS } from "./nav";

/**
 * Mobile navigation is two pieces: a bottom tab bar for the four surfaces a
 * member uses constantly, and a sheet holding the full map for everything
 * else. Designed for thumbs, not as a shrunken sidebar.
 */
export function MobileTabs() {
  const reduce = useReducedMotion();
  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 lg:hidden"
      style={{ paddingBottom: "max(0.85rem, env(safe-area-inset-bottom))" }}
      aria-label="Primary"
    >
      <div className="raised pointer-events-auto flex items-center gap-1 rounded-full p-1.5">
        {MOBILE_TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `relative flex min-h-[46px] items-center justify-center gap-2 rounded-full px-3.5 transition-colors ${
                isActive ? "text-[#04101f]" : "text-[var(--text-mid)]"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="tab-capsule"
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: "linear-gradient(180deg, var(--accent-hi), var(--accent))",
                      boxShadow: "0 6px 18px -6px rgba(46,139,255,0.75)",
                    }}
                    transition={
                      reduce ? { duration: 0 } : { type: "spring", stiffness: 440, damping: 36 }
                    }
                  />
                )}
                <Icon
                  className="relative h-[18px] w-[18px] shrink-0"
                  strokeWidth={isActive ? 2.3 : 1.8}
                />
                <AnimatePresence initial={false}>
                  {isActive && (
                    <motion.span
                      key="lbl"
                      initial={reduce ? false : { width: 0, opacity: 0 }}
                      animate={{ width: "auto", opacity: 1 }}
                      exit={reduce ? undefined : { width: 0, opacity: 0 }}
                      transition={{ duration: reduce ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="relative overflow-hidden whitespace-nowrap text-[13px] font-semibold"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
                <span className="sr-only">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export function MobileMenuButton() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const reduce = useReducedMotion();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn btn-ghost !px-2 lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[80] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.18 }}
          >
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              className="raised absolute inset-y-0 left-0 w-[80%] max-w-xs overflow-y-auto p-5"
              initial={reduce ? false : { x: "-100%" }}
              animate={{ x: 0 }}
              exit={reduce ? undefined : { x: "-100%" }}
              transition={
                reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 38 }
              }
            >
              <div className="mb-6 flex items-center justify-between">
                <Wordmark size={24} />
                <button
                  onClick={() => setOpen(false)}
                  className="btn btn-ghost !px-2"
                  aria-label="Close navigation"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {NAV.map((group) => (
                <div key={group.heading} className="mb-5">
                  <p className="eyebrow mb-2">{group.heading}</p>
                  <ul className="space-y-0.5">
                    {group.items.map(({ to, label, icon: Icon, end }) => (
                      <li key={to}>
                        <NavLink
                          to={to}
                          end={end}
                          className={({ isActive }) =>
                            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                              isActive
                                ? "border border-[rgba(46,139,255,0.32)] bg-[rgba(46,139,255,0.12)] text-[var(--text-hi)]"
                                : "text-[var(--text-mid)]"
                            }`
                          }
                        >
                          <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                          {label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
