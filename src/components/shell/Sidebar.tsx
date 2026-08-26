import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Wordmark, Mark } from "@/components/brand/Mark";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { NAV } from "./nav";

/**
 * Floating capsule rail.
 *
 * The sidebar is treated as an object sitting above the page rather than a
 * wall attached to its edge: it is inset from every side, fully rounded, and
 * carries its own glass surface and shadow. The active item is a single
 * capsule that slides between rows via a shared layout id, so selection reads
 * as one continuous movement instead of two separate fades.
 */
export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const reduce = useReducedMotion();

  return (
    <aside
      className="fixed inset-y-4 left-4 z-40 hidden lg:flex"
      style={{
        width: collapsed ? 72 : 232,
        transition: reduce ? "none" : "width .26s cubic-bezier(.22,1,.36,1)",
      }}
    >
      <div className="raised flex w-full flex-col rounded-[26px] p-2.5">
        <div className={`flex h-14 shrink-0 items-center ${collapsed ? "justify-center" : "px-3"}`}>
          {collapsed ? <Mark size={26} /> : <Wordmark size={24} />}
        </div>

        <nav className="no-bar fade-y flex-1 overflow-y-auto pb-2" aria-label="Main">
          {NAV.map((group) => (
            <div key={group.heading} className="mb-3">
              {!collapsed && <p className="eyebrow mb-1.5 px-3">{group.heading}</p>}
              <ul className="space-y-0.5">
                {group.items.map(({ to, label, icon: Icon, end }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={end}
                      title={collapsed ? label : undefined}
                      className={({ isActive }) =>
                        `min-h-[36px] group relative flex items-center gap-3 rounded-full py-2.5 text-sm transition-colors ${
                          collapsed ? "justify-center px-0" : "px-3"
                        } ${
                          isActive
                            ? "text-[var(--text-hi)]"
                            : "text-[var(--text-mid)] hover:text-[var(--text-hi)]"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <motion.span
                              layoutId="rail-capsule"
                              className="absolute inset-0 rounded-full"
                              style={{
                                background:
                                  "linear-gradient(100deg, rgba(46,139,255,0.22), rgba(46,139,255,0.10))",
                                border: "1px solid rgba(92,171,255,0.42)",
                                boxShadow:
                                  "0 0 22px -6px rgba(46,139,255,0.6), inset 0 1px 0 rgba(255,255,255,0.08)",
                              }}
                              transition={
                                reduce
                                  ? { duration: 0 }
                                  : { type: "spring", stiffness: 440, damping: 36 }
                              }
                            />
                          )}
                          {/* idle hover wash, kept beneath the capsule */}
                          <span className="absolute inset-0 rounded-full bg-[rgba(120,160,220,0)] transition-colors group-hover:bg-[rgba(120,160,220,0.06)]" />
                          <Icon
                            className={`relative h-[18px] w-[18px] shrink-0 transition-transform ${
                              isActive ? "text-[var(--accent-hi)]" : ""
                            } group-hover:scale-[1.06]`}
                            strokeWidth={isActive ? 2.15 : 1.8}
                          />
                          {!collapsed && <span className="relative font-medium">{label}</span>}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <button
          onClick={onToggle}
          className={`flex h-10 shrink-0 items-center gap-2 rounded-full text-[var(--text-low)] transition-colors hover:bg-[rgba(120,160,220,0.07)] hover:text-[var(--text-hi)] ${
            collapsed ? "justify-center" : "px-3"
          }`}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
          {!collapsed && <span className="text-xs">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
