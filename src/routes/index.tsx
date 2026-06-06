import { Crown, Video, Film, Monitor, TrendingUp, ArrowRight, ArrowUp, Upload } from "lucide-react";
import { motion } from "framer-motion";
import portrait from "@/assets/image.png";
import { SiteHeader } from "@/components/SiteHeader";
import { RouteShell } from "@/components/RouteShell";
import { Stagger, StaggerItem } from "@/components/Stagger";
import { CountUp } from "@/components/CountUp";
import { MagneticButton } from "@/components/MagneticButton";
import { Ticker } from "@/components/Ticker";
import { Sparkline } from "@/components/Sparkline";
import { PortraitGlow } from "@/components/PortraitGlow";
import { ScrollParallax } from "@/components/ScrollParallax";
import { LiveWithdrawals } from "@/components/LiveWithdrawals";
import { ReferralCard } from "@/components/ReferralCard";
import { BtcChartCard } from "@/components/BtcChartCard";
import { useLocale, formatLocal } from "@/hooks/useLocale";
import { useBalancePulse } from "@/hooks/useBalancePulse";
import { useUser } from "@/context/UserContext";

const streams = [
  { icon: Video, label: "NETFLIX DEAL", value: "$18.4M" },
  { icon: Film, label: "FILM ROYALTIES", value: "$12.1M" },
  { icon: Monitor, label: "STUDIO CONTRACT", value: "$9.9M" },
  { icon: TrendingUp, label: "BRAND DEALS", value: "$6.6M" },
];

export default function Home() {
  const loc = useLocale();
  const { value: balance, pulse } = useBalancePulse({ initial: 30459 });
  const { username } = useUser();
  const firstName = (username || "Investor").split(" ")[0];

  return (
    <RouteShell>
      <div className="min-h-screen pb-28">
        <SiteHeader />

        <main className="mx-auto max-w-2xl space-y-6 px-5 py-6">
          <Stagger className="space-y-6">
            <StaggerItem>
              <section className="glass-luxury aurora-border p-6 text-center">
                <ScrollParallax range={28}>
                  <PortraitGlow>
                    <img
                      src={portrait}
                      alt="Emilia Clarke portrait"
                      width={512}
                      height={512}
                      loading="eager"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  </PortraitGlow>
                </ScrollParallax>
                <h1 className="mt-4 font-display text-3xl text-gradient-gold">Emilia Clarke</h1>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                  <Crown className="h-3.5 w-3.5 text-primary" />
                  Founder & Board Member
                </div>

                <div className="mt-6 space-y-2.5">
                  {streams.map((s) => (
                    <div
                      key={s.label}
                      className="flex items-center justify-between rounded-2xl border border-border/70 bg-black/40 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <s.icon className="h-4 w-4 text-primary" strokeWidth={1.8} />
                        <span className="text-xs tracking-[0.18em] text-muted-foreground">
                          {s.label}
                        </span>
                      </div>
                      <span className="font-numeric text-base text-primary">{s.value}</span>
                    </div>
                  ))}
                </div>
              </section>
            </StaggerItem>

            <StaggerItem>
              <Ticker />
            </StaggerItem>

            <StaggerItem>
              <section className="space-y-5">
                <span className="chip">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Welcome back, {firstName}.
                </span>
                <h2 className="font-display text-5xl leading-[1.05]">
                  Smart Capital,
                  <br />
                  <em className="not-italic text-gradient-gold">Daily Returns</em>
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Earn your share of Emilia Clarke's entertainment revenue. No registration
                  required. Just deposit and start earning daily.
                </p>
                <MagneticButton
                  as="link"
                  to="/packages"
                  className="btn-foil inline-flex items-center gap-2 px-6 py-3 text-sm"
                >
                  Explore Packages <ArrowRight className="h-4 w-4" />
                </MagneticButton>
              </section>
            </StaggerItem>

            <StaggerItem>
              <section className="glass-luxury p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs tracking-wider text-muted-foreground">
                      Your Portfolio Value
                    </p>
                    <motion.p
                      className="font-numeric mt-2 text-4xl text-gradient-gold"
                      animate={pulse ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                      transition={{ duration: 0.6 }}
                    >
                      <CountUp value={balance} prefix="$" decimals={0} duration={0.9} />
                    </motion.p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-success">
                      <ArrowUp className="h-3 w-3" /> +<CountUp value={2500} prefix="$" />
                      .0 today
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground/70">
                      Local: <span className="font-numeric">{formatLocal(balance, loc)}</span>
                    </p>
                  </div>
                  <div className="w-32">
                    <Sparkline />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  {[
                    { l: "Today", v: 2500 },
                    { l: "Referral", v: 0 },
                    { l: "VIP", v: 0 },
                  ].map((s) => (
                    <div
                      key={s.l}
                      className="embossed rounded-xl border border-border/60 bg-black/30 p-3"
                    >
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {s.l}
                      </p>
                      <p className="mt-1 text-lg">
                        <CountUp value={s.v} prefix="$" decimals={2} />
                      </p>
                    </div>
                  ))}
                </div>

                <div className="my-5 h-px bg-border" />

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Today's Rewards</span>
                  <span className="text-success">
                    <CountUp value={2500} prefix="$" />
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Net Balance</span>
                  <span className="text-success">
                    <CountUp value={balance} prefix="$" />
                  </span>
                </div>

                <MagneticButton
                  as="link"
                  to="/portal"
                  className="btn-foil mt-5 flex w-full items-center justify-center gap-2 px-4 py-3 text-sm"
                >
                  <Upload className="h-4 w-4" /> Withdraw Funds
                </MagneticButton>
              </section>
            </StaggerItem>

            <StaggerItem>
              <div className="flex items-center justify-between px-1">
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  Live Market
                </p>
                <span className="chip">
                  <span className="h-1.5 w-1.5 rounded-full bg-success pulse-gold" />
                  Live
                </span>
              </div>
              <div className="mt-2">
                <BtcChartCard />
              </div>
            </StaggerItem>

            <StaggerItem>
              <LiveWithdrawals />
            </StaggerItem>

            <StaggerItem>
              <ReferralCard />
            </StaggerItem>
          </Stagger>
        </main>
      </div>
    </RouteShell>
  );
}
