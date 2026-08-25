import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Wordmark, Mark } from "@/components/brand/Mark";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { NAV } from "./nav";

/**
 * Desktop navigation rail. Collapses to icons so a member working in a
 * detail view can reclaim the width without losing their bearings; the
 * collapsed state is remembered across sessions.
 */
export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const reduce = useReducedMotion();

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 hidden shrink-0 flex-col border-r border-[var(--line)] bg-[var(--ink-050)] lg:flex"
      style={{
        width: collapsed ? 76 : 244,
        transition: reduce ? "none" : "width .22s cubic-bezier(.22,1,.36,1)",
      }}
    >
      <div className={`flex h-16 items-center ${collapsed ? "justify-center" : "px-5"}`}>
        {collapsed ? <Mark size={28} /> : <Wordmark size={26} />}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4 no-bar" aria-label="Main">
        {NAV.map((group) => (
          <div key={group.heading} className="mb-5">
            {!collapsed && <p className="eyebrow mb-2 px-3">{group.heading}</p>}
            <ul className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    title={collapsed ? label : undefined}
                    className={({ isActive }) =>
                      `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                        collapsed ? "justify-center" : ""
                      } ${
                        isActive
                          ? "text-[var(--text-hi)]"
                          : "text-[var(--text-mid)] hover:bg-[rgba(120,160,220,0.06)] hover:text-[var(--text-hi)]"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <motion.span
                            layoutId="nav-active"
                            className="absolute inset-0 rounded-xl border border-[rgba(46,139,255,0.32)] bg-[rgba(46,139,255,0.12)]"
                            transition={
                              reduce
                                ? { duration: 0 }
                                : { type: "spring", stiffness: 420, damping: 34 }
                            }
                          />
                        )}
                        <Icon
                          className={`relative h-[18px] w-[18px] shrink-0 ${isActive ? "text-[var(--accent-hi)]" : ""}`}
                          strokeWidth={isActive ? 2.1 : 1.8}
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
        className="btn btn-ghost m-3 justify-start"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        {!collapsed && <span className="text-xs">Collapse</span>}
      </button>
    </aside>
  );
}
