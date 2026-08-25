import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Gem, Wallet2, Crown } from "lucide-react";
import { playTap } from "@/lib/sound";
import { tap as hapticTap } from "@/lib/haptic";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/packages", label: "Tiers", icon: Gem },
  { to: "/portal", label: "Portal", icon: Wallet2 },
  { to: "/portfolio", label: "Vault", icon: Crown },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Primary"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(0.55rem,env(safe-area-inset-bottom))]"
    >
      <div className="nav-capsule pointer-events-auto flex items-center gap-1.5 p-2">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? "page" : undefined}
              onClick={() => {
                playTap();
                hapticTap();
              }}
              className="relative flex items-center justify-center gap-2.5 rounded-full px-5 py-3 transition-colors"
            >
              {active && (
                <motion.span
                  layoutId="nav-capsule"
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: "linear-gradient(180deg, #f6e8b8 0%, #e8c25c 45%, #c9a227 100%)",
                    boxShadow:
                      "0 8px 22px -6px rgba(201,162,39,0.75), inset 0 1px 0 rgba(255,255,255,0.6)",
                  }}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}

              <Icon
                className={`relative h-6 w-6 shrink-0 transition-colors ${
                  active ? "text-[#1a1305]" : "text-muted-foreground"
                }`}
                strokeWidth={active ? 2.3 : 1.8}
              />

              <AnimatePresence initial={false}>
                {active && (
                  <motion.span
                    key="label"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "auto", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    className="relative overflow-hidden whitespace-nowrap text-sm font-semibold text-[#1a1305]"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>

              <span className="sr-only">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
