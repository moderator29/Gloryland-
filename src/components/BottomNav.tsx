import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Gem, Wallet2, Crown } from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: Sparkles },
  { to: "/packages", label: "Tiers", icon: Gem },
  { to: "/portal", label: "Portal", icon: Wallet2 },
  { to: "/portfolio", label: "Vault", icon: Crown },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/80 backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      <div className="mx-auto flex max-w-2xl items-center justify-around px-6 pt-2">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className="relative flex flex-1 flex-col items-center gap-1 py-2 text-xs"
            >
              <div className="relative grid h-10 w-10 place-items-center">
                {active && (
                  <motion.span
                    layoutId="nav-puck"
                    className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#BF953F]/25 via-[#FCF6BA]/10 to-[#B38728]/25 ring-1 ring-primary/50 shadow-[0_0_20px_-2px_rgba(212,175,55,0.45)]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <motion.span
                  animate={{ scale: active ? 1.08 : 1, y: active ? -1 : 0 }}
                  transition={{ type: "spring", stiffness: 320, damping: 22 }}
                  className="relative"
                >
                  <Icon
                    className={`h-5 w-5 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
                    strokeWidth={active ? 2.2 : 1.7}
                  />
                </motion.span>
              </div>
              <span
                className={`transition-colors ${active ? "font-semibold text-primary" : "text-muted-foreground"}`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>

      <p className="pb-2 pt-1 text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
        Private Portal
      </p>
    </nav>
  );
}
