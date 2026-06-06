import { LogOut, BadgeCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { SoundToggle } from "@/components/SoundToggle";
import { TierBadge } from "@/components/TierBadge";
import { StreakCounter } from "@/components/StreakCounter";
import { useUser } from "@/context/UserContext";
import { playTap } from "@/lib/sound";
import { tap as hapticTap } from "@/lib/haptic";

interface SiteHeaderProps {
  showUser?: boolean;
}

export function SiteHeader({ showUser = true }: SiteHeaderProps) {
  const { username, logout } = useUser();

  const initial = (username || "").trim().charAt(0).toUpperCase() || "•";

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border/40 bg-black/60 px-5 py-3 backdrop-blur-xl">
      <Link to="/" className="flex items-center gap-1.5 transition-opacity hover:opacity-90">
        <span className="font-display text-xl tracking-tight text-gradient-gold">
          Emilia Clarke
        </span>
        <BadgeCheck className="h-4 w-4 fill-[#3b82f6] text-white" strokeWidth={2.5} />
      </Link>

      <div className="flex items-center gap-2">
        <StreakCounter />
        <TierBadge />
        <SoundToggle />
        {showUser && username && (
          <>
            <div className="pill-luxury text-xs text-white/90">
              <span
                aria-hidden
                className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-black"
                style={{
                  background:
                    "linear-gradient(135deg, #FFD700 0%, #FFF7C2 30%, #E5B947 70%, #B8842B 100%)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.6), 0 4px 10px -2px rgba(255,215,0,0.45)",
                }}
              >
                {initial}
              </span>
              <span className="max-w-[88px] truncate font-medium">{username}</span>
            </div>

            <button
              onClick={() => {
                playTap();
                hapticTap();
                logout();
              }}
              className="group flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-red-500/10 hover:text-red-400"
              title="Log out"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </header>
  );
}
