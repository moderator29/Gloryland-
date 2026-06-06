import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { Home, Layers, Wallet } from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/packages", label: "Packages", icon: Layers },
  { to: "/portal", label: "Portal", icon: Wallet },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-2xl items-center justify-around px-6 py-2">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className="flex flex-1 flex-col items-center gap-1 py-2 text-xs"
            >
              <Icon
                className={`h-5 w-5 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
                strokeWidth={active ? 2.4 : 1.8}
              />
              <span className={active ? "font-semibold text-primary" : "text-muted-foreground"}>{label}</span>
            </Link>
          );
        })}
      </div>
      <p className="pb-2 text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
        Lockdown Enabled
      </p>
    </nav>
  );
}
