import { LogOut, BadgeCheck, Settings as SettingsIcon } from "lucide-react";
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
    <header className="sticky top-0 z-50 flex items-center gap-2 border-b border-border/40 bg-black/85 px-3 py-2.5 backdrop-blur-xl sm:px-5 sm:py-3">
      <Link to="/" className="flex shrink-0 items-center gap-1 transition-opacity hover:opacity-90">
        <span className="font-display whitespace-nowrap text-base leading-none tracking-tight text-gradient-gold sm:text-lg">
          Emilia Clarke
        </span>
        <BadgeCheck
          className="h-3.5 w-3.5 fill-[#3b82f6] text-white sm:h-4 sm:w-4"
          strokeWidth={2.5}
        />
      </Link>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <span className="hidden sm:inline-flex">
          <StreakCounter />
        </span>
        <span className="hidden sm:inline-flex">
          <TierBadge />
        </span>
        <SoundToggle />
        {showUser && username && (
          <>
            <div className="pill-luxury !px-1.5 !py-0.5 text-xs text-white/90 sm:!px-3 sm:!py-1.5">
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
              <span className="hidden max-w-[80px] truncate font-medium sm:inline">{username}</span>
            </div>

            <Link
              to="/settings"
              title="Settings"
              aria-label="Settings"
              onClick={() => {
                playTap();
                hapticTap();
              }}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-all hover:bg-white/[0.05] hover:text-primary"
            >
              <SettingsIcon className="h-4 w-4" />
            </Link>
            <button
              onClick={() => {
                playTap();
                hapticTap();
                logout();
              }}
              className="group hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-red-500/10 hover:text-red-400 sm:flex"
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
