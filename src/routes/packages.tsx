import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Check, Zap, Users, ArrowRight, BadgeCheck, Lock } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { BottomNav } from "@/components/BottomNav";
import { PACKAGES } from "@/lib/site-config";

const SUBS_KEY = "ec_subscribed_plans";

export default function Packages() {
  const [subscribed, setSubscribed] = useState<string[]>([]);

  useEffect(() => {
    const read = () => {
      try {
        setSubscribed(JSON.parse(localStorage.getItem(SUBS_KEY) || "[]"));
      } catch {
        setSubscribed([]);
      }
    };
    read();
    window.addEventListener("focus", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("focus", read);
      window.removeEventListener("storage", read);
    };
  }, []);

  return (
    <div className="min-h-screen pb-28">
      <SiteHeader showUser={false} />
      <main className="mx-auto max-w-2xl px-5 py-6">
        <header className="mb-6">
          <span className="chip">Investment Packages</span>
          <h1 className="mt-3 font-display text-4xl">
            Choose Your <em className="not-italic text-gradient-gold">Tier</em>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Daily passive earnings. Withdraw anytime. Limited to 20 spots per package.
          </p>
        </header>

        <div className="space-y-4">
          {PACKAGES.map((p) => {
            const pct = (p.taken / p.spots) * 100;
            const isSubscribed = subscribed.includes(p.name);
            const isFull = p.taken >= p.spots; // Check if package is full

            return (
              <article key={p.name} className={`card-luxury p-5 ${isSubscribed ? "ring-1 ring-success/50" : ""} ${isFull ? "opacity-80" : ""}`}>
                <div className="flex items-start justify-between">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{p.name}</p>
                  {isSubscribed ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-success">
                      <BadgeCheck className="h-3 w-3" /> Subscribed
                    </span>
                  ) : isFull ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-red-400">
                      Fully Subscribed
                    </span>
                  ) : null}
                </div>
                
                <p className="mt-2 font-display text-4xl">
                  <span className="align-top text-base text-muted-foreground">$</span>
                  {p.price.toLocaleString()}
                </p>

                <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${isFull ? "bg-gray-800 text-gray-400" : "bg-success/10 text-success"}`}>
                  <Zap className="h-3 w-3 fill-current" />
                  ${p.daily.toLocaleString()}/day reward
                </div>

                <ul className="mt-4 space-y-1.5 text-sm">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Daily earnings</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Withdraw anytime</li>
                </ul>

                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className={`h-3.5 w-3.5 ${isFull ? "text-red-400" : "text-primary"}`} />
                  {isFull ? (
                    <span className="text-red-400">Fully Subscribed</span>
                  ) : (
                    <>{p.taken} of {p.spots} spots — Almost Full</>
                  )}
                </div>
                
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ 
                      width: `${pct}%`, 
                      background: isFull ? "#ef4444" : "linear-gradient(to right, #BF953F, #FCF6BA, #B38728)" 
                    }}
                  />
                </div>

                {isFull && !isSubscribed ? (
                  // Disabled Button for Full Packages
                  <button
                    disabled
                    className="mt-5 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-full bg-white/5 py-3 text-sm text-white/40 border border-white/10"
                  >
                    Fully Subscribed
                  </button>
                ) : (
                  // Active Link for available or already subscribed packages
                  <Link
                    to={`/portal?amount=${p.price}&plan=${p.name}`}
                    className={`mt-5 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm transition-all active:scale-95 ${
                      isSubscribed
                        ? "border border-success/40 bg-success/10 text-success"
                        : "btn-gold"
                    }`}
                  >
                    {isSubscribed ? <><BadgeCheck className="h-4 w-4" /> Subscribed — Top Up</> : <>Invest Now <ArrowRight className="h-4 w-4" /></>}
                  </Link>
                )}
              </article>
            );
          })}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}