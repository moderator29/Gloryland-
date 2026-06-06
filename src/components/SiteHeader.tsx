import { LogOut, ChevronDown, BadgeCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { SoundToggle } from "@/components/SoundToggle";

interface SiteHeaderProps {
  showUser?: boolean;
}

export function SiteHeader({ showUser = true }: SiteHeaderProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-border/40 bg-black/60 px-5 py-3 backdrop-blur-xl">
      <Link to="/" className="flex items-center gap-1.5 transition-opacity hover:opacity-90">
        <span className="font-display text-xl tracking-tight text-gradient-gold">
          Emilia Clarke
        </span>
        <BadgeCheck className="h-4 w-4 fill-[#3b82f6] text-white" strokeWidth={2.5} />
      </Link>

      <div className="flex items-center gap-2">
        <SoundToggle />
        {showUser && (
          <>
            <div className="flex cursor-pointer items-center gap-2 rounded-full border border-border/60 bg-black/30 py-1 pl-1 pr-3 transition-colors hover:bg-black/40">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-tr from-[#BF953F] to-[#FCF6BA] text-[10px] font-bold text-black">
                A
              </div>
              <span className="text-xs font-medium text-white/90">Rafael s</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </div>

            <button
              onClick={handleLogout}
              className="group flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-red-500/10 hover:text-red-400"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </header>
  );
}
