import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Check, Zap, Users, ArrowRight, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { RouteShell } from "@/components/RouteShell";
import { Stagger, StaggerItem } from "@/components/Stagger";
import { TiltCard } from "@/components/TiltCard";
import { TierEmber } from "@/components/TierEmber";
import { Countdown } from "@/components/Countdown";
import { MagneticButton } from "@/components/MagneticButton";
import { ReserveStickyPill } from "@/components/ReserveStickyPill";
import { ComparisonDrawer } from "@/components/ComparisonDrawer";
import { TierQuiz } from "@/components/TierQuiz";
import { PACKAGES } from "@/lib/site-config";
import { useLocale, formatLocal } from "@/hooks/useLocale";
import { playTap, playTierChord } from "@/lib/sound";
import { tap as hapticTap } from "@/lib/haptic";

const SUBS_KEY = "hal_subscribed_plans";

export default function Packages() {
  const [subscribed, setSubscribed] = useState<string[]>([]);
  const loc = useLocale();

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

  const firstOpen = PACKAGES.find((p) => p.taken < p.spots);

  return (
    <RouteShell>
      <div className="min-h-screen pb-28">
        <SiteHeader showUser={false} />
        <main className="mx-auto max-w-2xl px-5 py-6">
          <header className="mb-6">
            <div className="gold-ribbon-hr mb-4 !w-24" />
            <span className="chip">Investment Dossier</span>
            <h1 className="mt-3 font-display text-4xl">
              Choose Your <em className="not-italic text-gradient-gold">Tier</em>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Daily payouts. Pull anytime. Limited seats per tier.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <TierQuiz />
              <ComparisonDrawer />
            </div>
            <div className="gold-ribbon-hr mt-4 !w-24" />
          </header>

          <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {PACKAGES.map((p) => {
              const isSubscribed = subscribed.includes(p.name);
              const isFull = p.taken >= p.spots;

              return (
                <StaggerItem key={p.name}>
                  <TiltCard>
                    <article
                      className={`glass-luxury marble-vein asym-radius relative p-5 transition-transform ${isSubscribed ? "ring-1 ring-success/50" : ""} ${isFull ? "opacity-80" : ""}`}
                    >
                      {!isFull && <TierEmber tier={p.name} />}
                      <div className="relative">
                        <div className="flex items-start justify-between">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">
                            {p.name}
                          </p>
                          {isSubscribed ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-success">
                              <BadgeCheck className="h-3 w-3" /> Subscribed
                            </span>
                          ) : isFull ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-red-400">
                              Fully Subscribed
                            </span>
                          ) : (
                            <Countdown seed={p.name} />
                          )}
                        </div>

                        <p className="font-numeric mt-2 text-4xl">
                          <span className="align-top text-base text-muted-foreground">$</span>
                          {p.price.toLocaleString()}
                        </p>
                        <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground/70">
                          Local: {formatLocal(p.price, loc)}
                        </p>

                        <div
                          className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${isFull ? "bg-gray-800 text-gray-400" : "bg-success/10 text-success"}`}
                        >
                          <Zap className="h-3 w-3 fill-current" />${p.daily.toLocaleString()}/day
                          reward
                        </div>

                        <ul className="mt-4 space-y-1.5 text-sm">
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary" /> Daily earnings
                          </li>
                          <li className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-primary" /> Withdraw anytime
                          </li>
                        </ul>

                        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                          <Users
                            className={`h-3.5 w-3.5 ${isFull ? "text-red-400" : "text-primary"}`}
                          />
                          {isFull ? (
                            <span className="text-red-400">Fully Subscribed</span>
                          ) : (
                            <>
                              {p.taken} of {p.spots} spots. Almost Full.
                            </>
                          )}
                        </div>

                        <SpotsBar pct={(p.taken / p.spots) * 100} isFull={isFull} />

                        {isFull && !isSubscribed ? (
                          <button
                            disabled
                            className="mt-5 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 py-3 text-sm text-white/40"
                          >
                            Fully Subscribed
                          </button>
                        ) : (
                          <MagneticButton
                            as="link"
                            to={`/portal?amount=${p.price}&plan=${encodeURIComponent(p.name)}`}
                            className={`mt-5 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm transition-all ${
                              isSubscribed
                                ? "border border-success/40 bg-success/10 text-success"
                                : "btn-foil"
                            }`}
                          >
                            <span
                              onClick={() => {
                                playTap();
                                playTierChord(p.name);
                                hapticTap();
                                toast.success(
                                  isSubscribed
                                    ? `Adding capital to ${p.name}`
                                    : `Holding a seat in ${p.name}`,
                                  { duration: 1600 },
                                );
                              }}
                              className="inline-flex w-full items-center justify-center gap-2"
                            >
                              {isSubscribed ? (
                                <>
                                  <BadgeCheck className="h-4 w-4" /> Active. Add Capital
                                </>
                              ) : (
                                <>
                                  Take Position <ArrowRight className="h-4 w-4" />
                                </>
                              )}
                            </span>
                          </MagneticButton>
                        )}
                      </div>
                    </article>
                  </TiltCard>
                </StaggerItem>
              );
            })}
          </Stagger>
        </main>

        {firstOpen && (
          <ReserveStickyPill
            label={`Reserve ${firstOpen.name.replace(" Plan", "")}`}
            onClick={() => {
              window.location.href = `/portal?amount=${firstOpen.price}&plan=${encodeURIComponent(firstOpen.name)}`;
            }}
          />
        )}
      </div>
    </RouteShell>
  );
}

function SpotsBar({ pct, isFull }: { pct: number; isFull: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  return (
    <div
      ref={ref}
      className="embossed relative mt-2 h-1.5 overflow-hidden rounded-full bg-black/40"
    >
      <motion.div
        className="h-full rounded-full"
        initial={{ width: 0 }}
        animate={{ width: inView ? `${pct}%` : 0 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
        style={{
          background: isFull ? "#ef4444" : "linear-gradient(to right, #B3902F, #F4E3AC, #A07C22)",
        }}
      />
      {!isFull && (
        <motion.span
          className="absolute top-1/2 -translate-y-1/2"
          initial={{ left: 0 }}
          animate={{ left: inView ? `${pct}%` : 0 }}
          transition={{
            duration: 1.1,
            ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
          }}
        >
          <span className="block h-2 w-2 -translate-x-1/2 rounded-full bg-[#F4E3AC] shadow-[0_0_10px_2px_rgba(244,227,172,0.7)]" />
        </motion.span>
      )}
    </div>
  );
}
