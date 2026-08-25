import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  ChartLine,
  Check,
  Clock,
  KeyRound,
  Layers,
  Lock,
  Network,
  ScrollText,
  ShieldCheck,
  SquareStack,
  Vault,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Mark } from "@/components/brand/Mark";
import { CYCLE_DAYS, CYCLE_RETURN, DAILY_RATE, TIERS } from "@/domain/tiers";
import { money, pct } from "@/components/system/format";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { HeroBackdrop } from "@/components/landing/HeroBackdrop";
import { Reveal, Stagger, StaggerItem } from "@/components/landing/Reveal";
import { Section, SectionIntro } from "@/components/landing/Section";
import { TermTimeline } from "@/components/landing/TermTimeline";
import { TierLadder } from "@/components/landing/TierLadder";
import { Faq } from "@/components/landing/Faq";

/**
 * RIGEL — public marketing page.
 *
 * The whole argument of the page is that there is exactly one rate and one
 * term, and that everything else the platform offers is access rather than
 * yield. Every figure on this page is read from `domain/tiers`, so the
 * marketing surface and the product can never disagree.
 */

const FIRST = TIERS[0];
const LAST = TIERS[TIERS.length - 1];

/* ── Section 3: trust strip ──────────────────────────────────────────── */

const TRUST = [
  { value: `${CYCLE_DAYS}`, unit: "days", label: "Fixed term, start to maturity" },
  { value: pct(DAILY_RATE, 2).replace("+", ""), unit: "", label: "Of principal accrued per day" },
  { value: `${TIERS.length}`, unit: "tiers", label: "One published rate across all of them" },
  { value: money(FIRST.entry), unit: "", label: `Entry threshold at ${FIRST.name}` },
];

/* ── Section 4: what the platform is ─────────────────────────────────── */

const PRODUCT: { icon: LucideIcon; kicker: string; title: string; body: string }[] = [
  {
    icon: Vault,
    kicker: "Vaults",
    title: "Positions, not a pool",
    body: `Capital enters as a discrete position with its own principal, start date and maturity date. Each one accrues on its own record, so you can always tell which tranche is doing what and when it comes back.`,
  },
  {
    icon: Layers,
    kicker: "Tiers",
    title: "Access, not a better rate",
    body: `${TIERS.length} rungs from ${FIRST.name} to ${LAST.name}. Climbing unlocks analytics depth, queue priority and shorter settlement targets. The term rate is identical at every rung — deliberately.`,
  },
  {
    icon: ChartLine,
    kicker: "Intelligence",
    title: "Instrumentation for the desk",
    body: `Maturity calendars, projection curves and portfolio breakdowns computed from your own positions — so the question "what matures, and when" is answered before you commit the next tranche.`,
  },
];

/* ── Section 5: the term, in words ───────────────────────────────────── */

const TERM_STEPS = [
  {
    marker: "Day 0",
    title: "The vault opens",
    body: "You set the amount. The position is written with its principal and both timestamps — opened and maturing — before a single cent accrues.",
  },
  {
    marker: `Days 1–${CYCLE_DAYS - 1}`,
    title: "Accrual, daily and linear",
    body: `${pct(DAILY_RATE, 2)} of principal is credited to the position every day. No compounding inside the term, no performance fee, no rate that moves while you are not looking.`,
  },
  {
    marker: `Day ${CYCLE_DAYS}`,
    title: "The term closes",
    body: `The position matures at ${pct(CYCLE_RETURN, 0)} of principal. Withdraw it, or open a new term with the whole balance. Nothing rolls without your instruction.`,
  },
];

/* ── Section 7: how it works ─────────────────────────────────────────── */

const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: KeyRound,
    title: "Open an account",
    body: "Create your member profile and bind the device you will use to authorise anything that moves value.",
  },
  {
    icon: Wallet,
    title: "Fund a vault",
    body: "Transfer to the address issued for that position. Confirmations post to your ledger as they land on chain.",
  },
  {
    icon: Clock,
    title: "Watch it accrue",
    body: `The portal shows the day count, the accrued figure and the maturity date for every open position, updated daily.`,
  },
  {
    icon: ArrowUpRight,
    title: "Settle at maturity",
    body: `Request withdrawal to an allow-listed address, or roll the balance into a new ${CYCLE_DAYS}-day term.`,
  },
];

/* ── Section 8: security principles ──────────────────────────────────── */

const PRINCIPLES: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ScrollText,
    title: "Append-only ledgering",
    body: "Deposits, daily accrual, requests and settlements are written as entries, never edits. Any balance on screen can be reconstructed from the history that produced it.",
  },
  {
    icon: Lock,
    title: "Withdrawal allow-listing",
    body: "Value leaves only to destinations you have registered in advance, and a newly added destination sits behind a hold window before it can be used.",
  },
  {
    icon: ShieldCheck,
    title: "Device-bound authorisation",
    body: "Sensitive actions are tied to devices you have approved. An unrecognised device has to be enrolled through an existing one before it can act.",
  },
  {
    icon: SquareStack,
    title: "Separation of duties",
    body: "Internal roles carry the narrowest permissions that let them work, and no single role can both create a payout and approve it.",
  },
  {
    icon: Network,
    title: "Segregated environments",
    body: "The systems that hold key material are isolated from the systems that serve the application, with no shared credentials across that boundary.",
  },
  {
    icon: Check,
    title: "Explicit over implicit",
    body: "Nothing renews, reallocates or reinvests on your behalf. Every movement of capital starts with an instruction you gave.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[var(--ink-000)] text-[var(--text)]">
      <a
        href="#main"
        className="btn btn-primary sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60]"
      >
        Skip to content
      </a>

      <LandingNav />

      <main id="main">
        {/* ── 2. Hero ─────────────────────────────────────────────────── */}
        <section className="relative isolate overflow-hidden" aria-labelledby="hero-title">
          <HeroBackdrop />

          <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24 lg:pb-36 lg:pt-32">
            <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
              <Reveal y={22}>
                <span className="chip chip-accent">
                  <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-current" />
                  Fixed {CYCLE_DAYS}-day digital-asset vaults
                </span>

                <h1
                  id="hero-title"
                  className="display mt-6 text-balance text-[clamp(2.25rem,7.2vw,4.25rem)]"
                >
                  Capital held to a <span className="text-accent-gradient">defined horizon</span>.
                </h1>

                <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-[var(--text-mid)] sm:text-lg">
                  Rigel is a vault platform for members who want a defined outcome rather than a
                  market view. One term, one published rate: {pct(DAILY_RATE, 2)} of principal a
                  day, {pct(CYCLE_RETURN, 0)} at maturity, {CYCLE_DAYS} days end to end.
                </p>

                <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link to="/app" className="btn btn-primary h-12 px-6 text-[15px]">
                    Enter Portal
                    <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  </Link>
                  <a href="#how" className="btn btn-outline h-12 px-6 text-[15px]">
                    See how it works
                  </a>
                </div>

                <p className="mt-6 max-w-md text-xs leading-relaxed text-[var(--text-low)]">
                  Capital placed in a vault is at risk, including the risk of total loss. Read the{" "}
                  <Link
                    to="/legal/risk"
                    className="text-[var(--text-mid)] underline underline-offset-2 hover:text-[var(--accent-hi)]"
                  >
                    risk disclosure
                  </Link>{" "}
                  before you commit funds.
                </p>
              </Reveal>

              {/* Programme terms — the entire offer, on one card. */}
              <Reveal y={26} delay={0.12}>
                <div className="panel-hi edge-light p-6 sm:p-7">
                  <div className="flex items-center justify-between gap-4">
                    <p className="eyebrow">Programme terms</p>
                    <Mark size={26} />
                  </div>

                  <dl className="mt-6 space-y-4">
                    {[
                      { k: "Term length", v: `${CYCLE_DAYS} days`, tone: "hi" },
                      { k: "Daily accrual", v: pct(DAILY_RATE, 2), tone: "accent" },
                      { k: "Return at maturity", v: pct(CYCLE_RETURN, 0), tone: "gain" },
                      { k: "Entry threshold", v: `from ${money(FIRST.entry)}`, tone: "hi" },
                    ].map((row) => (
                      <div
                        key={row.k}
                        className="flex items-baseline justify-between gap-4 border-b border-[var(--line)] pb-4 last:border-0 last:pb-0"
                      >
                        <dt className="text-sm text-[var(--text-mid)]">{row.k}</dt>
                        <dd
                          className={`metric text-lg sm:text-xl ${
                            row.tone === "accent"
                              ? "text-[var(--accent-hi)]"
                              : row.tone === "gain"
                                ? "text-[var(--gain)]"
                                : "text-[var(--text-hi)]"
                          }`}
                        >
                          {row.v}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <p className="mt-6 text-xs leading-relaxed text-[var(--text-low)]">
                    Identical at every tier, from {FIRST.name} to {LAST.name}. Tiers change access,
                    never the rate.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── 3. Trust strip ──────────────────────────────────────────── */}
        <section aria-label="Programme at a glance" className="border-t border-[var(--line)]">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <Stagger className="grid grid-cols-2 divide-x divide-y divide-[var(--line)] border-x border-[var(--line)] lg:grid-cols-4 lg:divide-y-0">
              {TRUST.map((t) => (
                <StaggerItem key={t.label} className="px-5 py-7 sm:px-6 sm:py-9">
                  <p className="metric text-[clamp(1.5rem,4vw,2rem)]">
                    {t.value}
                    {t.unit && (
                      <span className="ml-1.5 text-sm font-medium text-[var(--text-low)]">
                        {t.unit}
                      </span>
                    )}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--text-low)]">{t.label}</p>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>

        {/* ── 4. Product ──────────────────────────────────────────────── */}
        <Section id="product" labelledBy="product-title">
          <SectionIntro
            id="product-title"
            eyebrow="The platform"
            title="Three parts, and no fourth."
            lead="Rigel does one thing and instruments it thoroughly: it holds capital in fixed terms, ranks members by commitment rather than by rate, and shows both without a marketing layer on top."
          />

          <Stagger className="mt-12 grid gap-4 md:grid-cols-3">
            {PRODUCT.map((c) => (
              <StaggerItem key={c.kicker} className="h-full">
                <article className="panel flex h-full flex-col p-6 transition-colors hover:border-[var(--line-hi)]">
                  <span className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--line-hi)] bg-[rgba(46,139,255,0.08)]">
                    <c.icon
                      className="h-5 w-5 text-[var(--accent-hi)]"
                      strokeWidth={1.7}
                      aria-hidden="true"
                    />
                  </span>
                  <p className="eyebrow mt-5">{c.kicker}</p>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--text-hi)]">{c.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--text-mid)]">{c.body}</p>
                </article>
              </StaggerItem>
            ))}
          </Stagger>
        </Section>

        {/* ── 5. Vaults explainer ─────────────────────────────────────── */}
        <Section id="vaults" labelledBy="vaults-title">
          <SectionIntro
            id="vaults-title"
            eyebrow="Vaults"
            title="One term. One rate. No discretion."
            lead={
              <>
                A vault is a {CYCLE_DAYS}-day commitment. Accrual is linear against your original
                principal — {pct(DAILY_RATE, 2)} a day, {pct(CYCLE_RETURN, 0)} at the end — so the
                figure quoted on day one is the figure paid on day {CYCLE_DAYS}.
              </>
            }
          />

          <div className="mt-12 grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">
            <Stagger as="ol" className="space-y-3">
              {TERM_STEPS.map((s) => (
                <StaggerItem as="li" key={s.marker}>
                  <div className="panel p-5">
                    <p className="tabular chip chip-accent">{s.marker}</p>
                    <h3 className="mt-3 text-base font-semibold text-[var(--text-hi)]">
                      {s.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--text-mid)]">{s.body}</p>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>

            <Reveal delay={0.08}>
              <TermTimeline principal={LAST.entry} />
              <p className="mt-4 text-xs leading-relaxed text-[var(--text-low)]">
                Illustration of the published term structure applied to a {money(LAST.entry)}{" "}
                position. It is arithmetic, not a forecast, and not a guarantee of payment.
              </p>
            </Reveal>
          </div>
        </Section>

        {/* ── 6. Tiers ────────────────────────────────────────────────── */}
        <Section id="tiers" labelledBy="tiers-title">
          <SectionIntro
            id="tiers-title"
            eyebrow="The ladder"
            title="Tiers change access, never the rate."
            lead={
              <>
                Most platforms pay their largest members more. Rigel does not: the term rate is
                {" " + pct(CYCLE_RETURN, 0)} at every rung from {FIRST.name} to {LAST.name}. What
                climbing buys is depth of analytics, priority in the queue and shorter settlement
                targets.
              </>
            }
          />

          <div className="mt-12">
            <TierLadder />
          </div>

          <Reveal className="mt-6">
            <p className="text-xs leading-relaxed text-[var(--text-low)]">
              Settlement figures are the targets the desk works to, measured from an approved
              withdrawal request. They are operational objectives rather than contractual
              guarantees.
            </p>
          </Reveal>
        </Section>

        {/* ── 7. How it works ─────────────────────────────────────────── */}
        <Section id="how" labelledBy="how-title">
          <SectionIntro
            id="how-title"
            eyebrow="How it works"
            title="Four steps, then it repeats."
            lead="From account to settlement, the whole path is four actions — and every one of them is something you initiate."
          />

          <Stagger as="ol" className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <StaggerItem as="li" key={s.title} className="h-full">
                <div className="panel relative flex h-full flex-col p-5 pt-6">
                  <span
                    aria-hidden="true"
                    className="tabular absolute right-5 top-5 text-2xl font-semibold text-[rgba(120,160,220,0.16)]"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--line-hi)] bg-[rgba(46,139,255,0.08)]">
                    <s.icon
                      className="h-[18px] w-[18px] text-[var(--accent-hi)]"
                      strokeWidth={1.7}
                      aria-hidden="true"
                    />
                  </span>
                  <h3 className="mt-4 text-[15px] font-semibold text-[var(--text-hi)]">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-mid)]">{s.body}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </Section>

        {/* ── 8. Security & trust ─────────────────────────────────────── */}
        <Section id="security" labelledBy="security-title">
          <SectionIntro
            id="security-title"
            eyebrow="Security model"
            title="How the platform is built."
            lead="Principles we hold ourselves to in the architecture — what the system does, and what it refuses to do on your behalf."
          />

          <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PRINCIPLES.map((p) => (
              <StaggerItem key={p.title} className="h-full">
                <article className="panel flex h-full gap-4 p-5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-[rgba(46,139,255,0.07)]">
                    <p.icon
                      className="h-4 w-4 text-[var(--accent-hi)]"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-semibold text-[var(--text-hi)]">{p.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--text-mid)]">{p.body}</p>
                  </div>
                </article>
              </StaggerItem>
            ))}
          </Stagger>

          <Reveal className="mt-8">
            <aside className="inset p-5 sm:p-6" aria-label="What Rigel does not claim">
              <h3 className="eyebrow">What we do not claim</h3>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--text-mid)]">
                This page describes architecture, not credentials. Rigel does not advertise
                licences, insurance cover, audit certificates, regulatory registrations or custody
                partners on this site. Where such things exist for a platform, they should be
                published as documents you can read and verify — not as badges in a footer. Treat
                any platform that does the opposite with suspicion, this one included.
              </p>
            </aside>
          </Reveal>
        </Section>

        {/* ── 9. FAQ ──────────────────────────────────────────────────── */}
        <Section id="faq" labelledBy="faq-title">
          <SectionIntro
            id="faq-title"
            eyebrow="Questions"
            title="The six we are asked most."
            lead="Answered plainly, including the one about what can go wrong."
          />
          <div className="mt-12 max-w-3xl">
            <Faq />
          </div>
        </Section>

        {/* ── 10. Closing CTA ─────────────────────────────────────────── */}
        <Section id="start" labelledBy="start-title">
          <Reveal>
            <div className="panel-hi edge-light relative overflow-hidden px-6 py-14 text-center sm:px-10 sm:py-20">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 -top-24 h-64"
                style={{
                  background:
                    "radial-gradient(ellipse 50% 100% at 50% 0%, rgba(46,139,255,0.22), transparent 70%)",
                }}
              />
              <div className="relative">
                <Mark size={46} className="mx-auto" />
                <h2
                  id="start-title"
                  className="display mx-auto mt-7 max-w-2xl text-balance text-[clamp(1.75rem,5vw,2.75rem)]"
                >
                  Open a term, or read the risks first.
                </h2>
                <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-[var(--text-mid)]">
                  Both take one click, and we would rather you did the second one. Entry starts at{" "}
                  {money(FIRST.entry)}; the rate is the same whether you place that or{" "}
                  {money(LAST.entry)}.
                </p>
                <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link to="/app" className="btn btn-primary h-12 px-6 text-[15px]">
                    Enter Portal
                    <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  </Link>
                  <Link to="/legal/risk" className="btn btn-outline h-12 px-6 text-[15px]">
                    Read the risk disclosure
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </Section>
      </main>

      <LandingFooter />
    </div>
  );
}
