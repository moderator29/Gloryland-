import { LogOut, BadgeCheck, Settings as SettingsIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { SoundToggle } from "@/components/SoundToggle";
import { TierBadge } from "@/components/TierBadge";
import { StreakCounter } from "@/components/StreakCounter";
import { BrandMark } from "@/components/BrandLogo";
import { useUser } from "@/context/UserContext";
import { useArmedAction } from "@/hooks/useArmedAction";
import { playTap } from "@/lib/sound";
import { tap as hapticTap } from "@/lib/haptic";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/site-config";

interface SiteHeaderProps {
  showUser?: boolean;
}

export function SiteHeader({ showUser = true }: SiteHeaderProps) {
  const { username, logout } = useUser();
  const [logoutArmed, requestLogout] = useArmedAction(logout);

  const initial = (username || "").trim().charAt(0).toUpperCase() || "•";

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-2xl items-center gap-2.5 px-3 py-2.5 sm:px-5 sm:py-3">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-90"
          aria-label={`${BRAND_NAME} ${BRAND_TAGLINE} home`}
        >
          <BrandMark size={34} />
          <span className="flex flex-col leading-none">
            <span className="flex items-center gap-1">
              <span className="font-display whitespace-nowrap text-base leading-none tracking-[0.1em] text-gradient-gold sm:text-lg">
                {BRAND_NAME.toUpperCase()}
              </span>
              <BadgeCheck
                className="h-3.5 w-3.5 fill-[#24406f] text-[#e8c25c] sm:h-4 sm:w-4"
                strokeWidth={2.5}
              />
            </span>
            <span className="mt-[3px] hidden text-[8px] uppercase tracking-[0.32em] text-primary/70 sm:block">
              {BRAND_TAGLINE}
            </span>
          </span>
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
                  className="grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-[#1a1305]"
                  style={{
                    background: "linear-gradient(135deg, #f4e3ac 0%, #e8c25c 40%, #c9a227 100%)",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,0.6), 0 4px 10px -2px rgba(201,162,39,0.45)",
                  }}
                >
                  {initial}
                </span>
                <span className="hidden max-w-[80px] truncate font-medium sm:inline">
                  {username}
                </span>
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
                  requestLogout();
                }}
                className={`group hidden h-8 shrink-0 items-center justify-center gap-1.5 rounded-full transition-all sm:flex ${
                  logoutArmed
                    ? "w-auto bg-red-500/15 px-3 text-xs font-semibold text-red-400 ring-1 ring-red-500/40"
                    : "w-8 text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
                }`}
                title="Log out"
                aria-label={logoutArmed ? "Tap again to log out" : "Log out"}
              >
                <LogOut className="h-4 w-4" />
                {logoutArmed && "Sure?"}
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
