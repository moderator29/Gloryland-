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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-[rgba(8,11,22,0.92)] backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-1.5">
        {MOBILE_TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium transition-colors ${
                isActive ? "text-[var(--accent-hi)]" : "text-[var(--text-low)]"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="tab-active"
                    className="absolute inset-x-3 top-0 h-[2px] rounded-full bg-[var(--accent)]"
                    transition={
                      reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }
                    }
                  />
                )}
                <Icon className="h-[19px] w-[19px]" strokeWidth={isActive ? 2.2 : 1.8} />
                {label}
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
