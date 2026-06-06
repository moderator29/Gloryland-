import { Link } from "react-router-dom";
import { BadgeCheck, Crown, Video, Film, Monitor, TrendingUp, ArrowRight, ArrowUp, Upload } from "lucide-react";
import portrait from "@/assets/image.png";
import { SiteHeader } from "@/components/SiteHeader";

const streams = [
  { icon: Video, label: "NETFLIX DEAL", value: "$18.4M" },
  { icon: Film, label: "FILM ROYALTIES", value: "$12.1M" },
  { icon: Monitor, label: "STUDIO CONTRACT", value: "$9.9M" },
  { icon: TrendingUp, label: "BRAND DEALS", value: "$6.6M" },
];

export default function Home() {
  return (
    <div className="min-h-screen pb-28">
      <SiteHeader  />

      <main className="mx-auto max-w-2xl space-y-6 px-5 py-6">
        {/* Founder card */}
        <section className="card-luxury p-6 text-center">
          <div className="mx-auto h-28 w-28 overflow-hidden rounded-full ring-2 ring-primary/60 ring-offset-4 ring-offset-background">
            <img src={portrait} alt="Emilia Clarke portrait" width={512} height={512} className="h-full w-full object-cover" />
          </div>
          <h1 className="mt-4 font-display text-3xl text-gradient-gold">Emilia Clarke</h1>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            <Crown className="h-3.5 w-3.5 text-primary" />
            Founder & Board Member
          </div>

          <div className="mt-6 space-y-2.5">
            {streams.map((s) => (
              <div key={s.label} className="flex items-center justify-between rounded-2xl border border-border/70 bg-gray-950 px-4 py-3">
                <div className="flex items-center gap-3">
                  <s.icon className="h-4 w-4 text-primary" strokeWidth={1.8} />
                  <span className="text-xs tracking-[0.18em] text-muted-foreground">{s.label}</span>
                </div>
                <span className="font-display text-base text-primary">{s.value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Hero */}
        <section className="space-y-5">
          <span className="chip">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            No Account Needed. Start Instantly.
          </span>
          <h2 className="font-display text-5xl leading-[1.05]">
            Smart Capital,
            <br />
            <em className="not-italic text-gradient-gold">Daily Returns</em>
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Earn your share of Emilia Clarke's entertainment revenue. No registration required. Just deposit and start earning daily.
          </p>
          <Link to="/packages" className="btn-gold inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm">
            Explore Packages <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        {/* Portfolio */}
        <section className="card-luxury p-6">
          <p className="text-xs tracking-wider text-muted-foreground">Your Portfolio Value</p>
          <p className="mt-2 font-display text-4xl text-gradient-gold">$30,459</p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-success">
            <ArrowUp className="h-3 w-3" /> +$2500.0 today
          </p>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              { l: "Today", v: "$2500.00" },
              { l: "Referral", v: "$0" },
              { l: "VIP", v: "$0" },
            ].map((s) => (
              <div key={s.l} className="rounded-xl border border-border/60 bg-surface-elevated/60 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.l}</p>
                <p className="mt-1 font-display text-lg">{s.v}</p>
              </div>
            ))}
          </div>

          <div className="my-5 h-px bg-border" />

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Today's Rewards</span>
            <span className="text-success">$2,500</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Net Balance</span>
            <span className="text-success">$30,459</span>
          </div>

          <Link to="/portal" className="btn-gold mt-5 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm">
            <Upload className="h-4 w-4" /> Withdraw Funds
          </Link>
        </section>
      </main>
    </div>
  );
}
