import {
  ArrowRight,
  ArrowUp,
  Upload,
  ShieldCheck,
  AudioLines,
  ArrowDownToLine,
  Gem,
  Crown,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { SiteHeader } from "@/components/SiteHeader";
import { RouteShell } from "@/components/RouteShell";
import { Stagger, StaggerItem } from "@/components/Stagger";
import { CountUp } from "@/components/CountUp";
import { MagneticButton } from "@/components/MagneticButton";
import { Ticker } from "@/components/Ticker";
import { Sparkline } from "@/components/Sparkline";
import { BrandLockup } from "@/components/BrandLogo";
import { RevenueStreams } from "@/components/RevenueStreams";
import { ScrollParallax } from "@/components/ScrollParallax";
import { LiveWithdrawals } from "@/components/LiveWithdrawals";
import { ReferralCard } from "@/components/ReferralCard";
import { BtcChartCard } from "@/components/BtcChartCard";
import { HouseQuote } from "@/components/HouseQuote";
import { RevenueTimeline } from "@/components/RevenueTimeline";
import { PressWall } from "@/components/PressWall";
import { StatusCard } from "@/components/StatusCard";
import { SpotlightCard } from "@/components/SpotlightCard";
import { FirstDepositGift } from "@/components/FirstDepositGift";
import { Odometer } from "@/components/Odometer";
import { PresencePill } from "@/components/PresencePill";
import { TimeAwareGreeting } from "@/components/TimeAwareGreeting";
import { TopUpNudge } from "@/components/TopUpNudge";
import { ReorderableStack } from "@/components/ReorderableStack";
import { useLocale, formatLocal } from "@/hooks/useLocale";
import { useBalancePulse } from "@/hooks/useBalancePulse";

/** Small labelled figure used in the portfolio card. */
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="track-navy min-w-0 rounded-xl border border-[#24406f]/45 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-numeric mt-1 truncate text-lg">${value.toLocaleString()}</p>
    </div>
  );
}

/** Section heading with a hairline rule, used to separate the page's bands. */
function SectionLabel({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-1">
      <p className="whitespace-nowrap text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
        {children}
      </p>
      <span className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
      {aside}
    </div>
  );
}

export default function Home() {
  const loc = useLocale();
  const { value: balance, pulse } = useBalancePulse({ initial: 0, maxStep: 0 });
  const daily = 0;
  const rewards = 0;

  return (
    <RouteShell>
      <div className="min-h-screen pb-28">
        <SiteHeader />

        <main className="mx-auto max-w-2xl space-y-7 px-5 py-6">
          <Stagger className="space-y-7">
            {/* Crest */}
            <StaggerItem>
              <SpotlightCard>
                <section className="glass-luxury marble-vein aurora-border px-6 py-8 text-center">
                  <ScrollParallax range={24}>
                    <BrandLockup size={124} />
                  </ScrollParallax>

                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                    <span className="pill-luxury text-[11px] text-primary/90">
                      <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.9} />
                      Private Placement
                    </span>
                    <span className="chip-navy uppercase tracking-widest">
                      <AudioLines className="h-3 w-3 text-primary" strokeWidth={1.9} />
                      Music Royalties
                    </span>
                  </div>

                  <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
                    A managed portfolio built on catalogue income. Members hold a share of the
                    revenue and take a payout every day.
                  </p>
                </section>
              </SpotlightCard>
            </StaggerItem>

            {/* Portfolio value, promoted above the fold */}
            <StaggerItem>
              <section className="glass-luxury p-6">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <TimeAwareGreeting />
                  <PresencePill />
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
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
                      <ArrowUp className="h-3 w-3" /> +
                      <Odometer value={daily} prefix="$" />
                      &nbsp;today
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground/70">
                      Local: <span className="font-numeric">{formatLocal(balance, loc)}</span>
                    </p>
                  </div>
                  {balance > 0 && (
                    <div className="w-32 shrink-0">
                      <Sparkline />
                    </div>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <Stat label="Today" value={daily} />
                  <Stat label="Referral" value={0} />
                  <Stat label="VIP" value={0} />
                </div>

                <div className="my-5 h-px bg-border" />

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Today's Rewards</span>
                  <span className="text-success">
                    <CountUp value={rewards} prefix="$" />
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

            {/* Quick actions */}
            <StaggerItem>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { to: "/portal", icon: ArrowDownToLine, label: "Deposit" },
                  { to: "/packages", icon: Gem, label: "Tiers" },
                  { to: "/portfolio", icon: Crown, label: "Vault" },
                ].map(({ to, icon: Icon, label }) => (
                  <Link
                    key={to}
                    to={to}
                    className="group flex flex-col items-center gap-2 rounded-2xl border border-primary/25 bg-black/40 py-4 backdrop-blur-xl transition-all hover:border-primary/55 hover:bg-black/55"
                  >
                    <span className="plate-navy grid h-10 w-10 place-items-center rounded-xl text-primary transition-transform group-hover:scale-105">
                      <Icon className="h-5 w-5" strokeWidth={1.8} />
                    </span>
                    <span className="text-xs font-semibold tracking-wide text-white/90">
                      {label}
                    </span>
                  </Link>
                ))}
              </div>
            </StaggerItem>

            {/* Where the money comes from */}
            <StaggerItem>
              <section className="space-y-3">
                <SectionLabel>Revenue Streams</SectionLabel>
                <p className="px-1 text-sm leading-relaxed text-muted-foreground">
                  Nine independent income lines feed the portfolio, so no single release or season
                  carries the return.
                </p>
                <RevenueStreams />
              </section>
            </StaggerItem>

            <StaggerItem>
              <Ticker />
            </StaggerItem>

            <StaggerItem>
              <FirstDepositGift />
            </StaggerItem>

            <StaggerItem>
              <TopUpNudge />
            </StaggerItem>

            {/* Pitch */}
            <StaggerItem>
              <section className="space-y-5">
                <h2 className="font-display text-5xl leading-[1.05]">
                  Smart Capital,
                  <br />
                  <em className="not-italic text-gradient-gold">Daily Returns</em>
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Earn your share of the catalogue's revenue. No registration required. Just deposit
                  and start earning daily.
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
              <PressWall />
            </StaggerItem>

            <StaggerItem>
              <section className="space-y-3">
                <SectionLabel
                  aside={
                    <span className="chip">
                      <span className="h-1.5 w-1.5 rounded-full bg-success pulse-gold" />
                      Live
                    </span>
                  }
                >
                  Live Market
                </SectionLabel>
                <BtcChartCard />
              </section>
            </StaggerItem>
          </Stagger>

          <ReorderableStack
            storageKey="hal_home_order_v1"
            items={[
              { key: "live", node: <LiveWithdrawals /> },
              { key: "quote", node: <HouseQuote /> },
              { key: "timeline", node: <RevenueTimeline /> },
              { key: "referral", node: <ReferralCard /> },
              { key: "status", node: <StatusCard /> },
            ]}
          />
        </main>
      </div>
    </RouteShell>
  );
}
