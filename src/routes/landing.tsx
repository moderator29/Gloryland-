import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  ChartSpline,
  Check,
  Compass,
  Fingerprint,
  Layers,
  Lock,
  Network,
  ScrollText,
  ShieldCheck,
  Sparkles,
  SquareStack,
  TriangleAlert,
  Vault,
  type LucideIcon,
} from "lucide-react";
import { Mark } from "@/components/brand/Mark";
import { CYCLE_DAYS, CYCLE_RETURN, DAILY_RATE, TIERS } from "@/domain/tiers";
import { money } from "@/components/system/format";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { HeroBackdrop } from "@/components/landing/HeroBackdrop";
import { PointerLight } from "@/components/landing/PointerLight";
import { Reveal, Stagger, StaggerItem } from "@/components/landing/Reveal";
import { Section, SectionIntro } from "@/components/landing/Section";
import { DrawRule } from "@/components/landing/DrawRule";
import { Counter } from "@/components/landing/Counter";
import { CapitalMarquee } from "@/components/landing/CapitalMarquee";
import { TermWorkedExample } from "@/components/landing/TermWorkedExample";
import { TermTimeline } from "@/components/landing/TermTimeline";
import { TierLadder } from "@/components/landing/TierLadder";
import { DeskStatement } from "@/components/landing/DeskStatement";
import { Faq } from "@/components/landing/Faq";
import { DAY_RATE, FIRST_TIER, TERM_RATE, TOP_TIER } from "@/components/landing/figures";

/**
 * RIGEL, the public page.
 *
 * The argument runs in one direction and does not double back: here is the
 * offer, here is where the capital works, here is the machine, here is the
 * term drawn to scale, here is the ladder that does not change the rate, here
 * is why it was built that way, here is what it refuses to do, here are the
 * questions, here is the risk. Every figure is read from `domain/tiers`, so
 * the marketing surface and the product cannot disagree with one another.
 *
 * Nothing on this page carries social proof. There is no licence, regulator,
 * partner, client, award, press mention or member count to cite, so the page
 * carries verifiable statements about how the product works instead. Where a
 * section would normally hold a badge, it holds a mechanism.
 */

/* ── The published constants, counted up once ────────────────────────── */

const CONSTANTS: { value: number; format: (n: number) => string; label: string }[] = [
  {
    value: CYCLE_DAYS,
    format: (n) => `${n.toFixed(0)}`,
    label: "Days from open to maturity, fixed at the moment a vault is written",
  },
  {
    value: DAILY_RATE * 100,
    format: (n) => `${n.toFixed(2)}%`,
    label: "Of the original principal, credited to the position every day",
  },
  {
    value: CYCLE_RETURN * 100,
    format: (n) => `${n.toFixed(0)}%`,
    label: "Reached at maturity, on every rung of the ladder without exception",
  },
  {
    value: TIERS.length,
    format: (n) => `${n.toFixed(0)}`,
    label: `Rungs, from ${money(FIRST_TIER.entry)} to ${money(TOP_TIER.entry)}, all at one rate`,
  },
];

/* ── Section 02: the surfaces, as a bento of unequal cells ───────────── */

type Surface = {
  to: string;
  icon: LucideIcon;
  kicker: string;
  title: string;
  body: string;
  span: string;
  foot?: string;
};

const SURFACES: Surface[] = [
  {
    to: "/app/vaults/new",
    icon: Vault,
    kicker: "Vaults",
    title: "Capital enters as a dated position",
    body: "Not a share of a pool. Each placement is written as its own position with its own principal, its opening timestamp and its maturity timestamp, and it accrues on its own record. You can always say which tranche is doing what, and exactly when it comes back.",
    foot: `From ${money(FIRST_TIER.entry)} · ${CYCLE_DAYS} days · ${TERM_RATE} at maturity`,
    span: "lg:col-span-7 lg:row-span-2",
  },
  {
    to: "/app/tiers",
    icon: Layers,
    kicker: "Tiers",
    title: "Access, never a better rate",
    body: `${TIERS.length} rungs from ${FIRST_TIER.name} to ${TOP_TIER.name}. Climbing shortens the published settlement target, from ${FIRST_TIER.settlementHours} hours to ${TOP_TIER.settlementHours}. The term rate does not move.`,
    span: "lg:col-span-5",
  },
  {
    to: "/app/analytics",
    icon: ChartSpline,
    kicker: "Telemetry",
    title: "Charts drawn from your own ledger",
    body: "Maturity calendars, projection curves and portfolio breakdowns computed from your positions, so what matures and when is answered before the next tranche is committed.",
    span: "lg:col-span-5",
  },
  {
    to: "/app/activity",
    icon: ScrollText,
    kicker: "Ledger",
    title: "Every event, in order",
    body: "Deposits, accrual, requests and settlements are written as entries, never as edits. Any balance on screen reconstructs from the history that produced it.",
    span: "lg:col-span-4",
  },
  {
    to: "/app/insights",
    icon: Compass,
    kicker: "Insight",
    title: "Observations, not opinions",
    body: "Derived from your own record and nobody else's. With no positions there is nothing to derive, and the surface says so rather than borrowing a curve.",
    span: "lg:col-span-4",
  },
  {
    to: "/app/copilot",
    icon: Sparkles,
    kicker: "Copilot",
    title: "An analyst that cannot act",
    body: "It reads the figures derived from your ledger, unless you switch that off on its own screen, and explains what they mean. It does not advise, and it cannot move capital.",
    span: "lg:col-span-4",
  },
];

/* ── Section 06: what the system refuses to do ───────────────────────────
   Every entry here has to be checkable against the running product, so each
   one names where to check it. A refusal that cannot be tested is a slogan,
   and it belongs on somebody else's site. */

const DISCIPLINE: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ScrollText,
    title: "It will not edit history",
    body: "Placements, claims, settlements and instructions are appended as entries, and a correction is a new entry too, so the record of a mistake survives the fix. The only deletion anywhere in the product is the one you perform yourself, on your whole record at once, from Settings.",
  },
  {
    icon: Check,
    title: "It will not print a figure it cannot derive",
    body: "Every number on your surfaces is replayed from your own entries by one function, and Explain will show you that arithmetic step by step. The two figures the product generates rather than observes, the activity band and the members viewing count, each carry the word Sample in visible text next to them.",
  },
  {
    icon: SquareStack,
    title: "It will not pay more for size",
    body: `Core and Sovereign earn the identical ${TERM_RATE} across ${CYCLE_DAYS} days, from one constant that every surface reads. What a larger position buys is the shorter settlement target published against its rung, and that target is the only figure on the ladder that moves.`,
  },
  {
    icon: Lock,
    title: "It will not act without an instruction you gave",
    body: "One mechanism writes to your ledger unprompted, and it only exists where you armed it: a relay carries a matured term into the next one. It states before you arm it that it will write without asking again, it runs the next time you open Rigel after maturity rather than while you are away, it is never backdated, and it can be disarmed at any point before it fires. Nothing else renews, reallocates or settles by itself.",
  },
  {
    icon: Fingerprint,
    title: "It will not hold a secret it could lose",
    body: "There is no password, no recovery question and no stored credential, because there is no account server to hold one. Your identity and your ledger live in your own browser, and the security page reads that storage back to you key by key rather than asking you to take it on trust.",
  },
  {
    icon: Network,
    title: "It will not take money it cannot hold",
    body: "This build ships with no deposit address at all. There is no custody behind it, so the funding surfaces say funding is not open instead of printing a string that looks like a destination. An interface that shows an address it does not control is how people lose money they cannot get back.",
  },
  {
    icon: ShieldCheck,
    title: "It will not wear a badge it cannot show you",
    body: "No licence, insurer, auditor, regulator, custodian, partner, award, press mention or member count is claimed anywhere on this site, because none has been published as a document you could read and check.",
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
        {/* ── Hero ─────────────────────────────────────────────────────
            One slab rather than the usual text-left, card-right split. The
            offer is written across the masthead and the calculator is built
            into its base, so the first thing a visitor can do is check the
            arithmetic rather than read an adjective. */}
        <section className="relative isolate overflow-hidden" aria-labelledby="hero-title">
          <HeroBackdrop />

          <div className="relative mx-auto max-w-6xl px-5 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:pb-24 lg:pt-20">
            <Reveal y={26}>
              <div className="glass relative p-5 sm:p-8 lg:p-12">
                <PointerLight />

                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                  <span className="chip chip-accent">
                    <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-current" />
                    Fixed {CYCLE_DAYS} day vault terms
                  </span>
                  <p className="machine break-normal text-[10px] text-[var(--text-low)] sm:text-[11px]">
                    TERM {CYCLE_DAYS}D &middot; ACCRUAL {DAY_RATE}/DAY &middot; MATURITY {TERM_RATE}
                  </p>
                </div>

                <h1
                  id="hero-title"
                  className="display mt-7 text-balance text-[clamp(2.1rem,7.4vw,4.5rem)] sm:mt-9"
                >
                  The entire offer fits on one line.
                </h1>

                {/* And here is the line. Read as an instrument, not a promise. */}
                <p className="display mt-6 max-w-3xl text-[clamp(1.05rem,3.6vw,1.8rem)] leading-snug text-[var(--text-low)]">
                  <span className="tabular text-[var(--accent-hi)]">{DAY_RATE}</span> of principal a
                  day, <span className="tabular text-[var(--text-hi)]">{CYCLE_DAYS} days</span> end
                  to end, <span className="tabular text-[var(--gain)]">{TERM_RATE}</span> at
                  maturity.
                </p>

                <DrawRule className="mt-8" delay={0.25} />

                <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-12">
                  <div className="min-w-0">
                    <p className="max-w-xl text-[15px] leading-relaxed text-[var(--text-mid)] sm:text-base">
                      Rigel holds capital in fixed terms and instruments the result. A position is
                      written with its principal and both dates before a cent accrues, it credits{" "}
                      {DAY_RATE} of that principal every day, and it closes at {TERM_RATE}. The rate
                      is identical at {FIRST_TIER.name} and at {TOP_TIER.name}. What a larger
                      position buys is settlement speed and tooling, and the ladder says so out
                      loud.
                    </p>

                    <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                      <Link to="/app" className="btn btn-primary h-12 px-6 text-[15px]">
                        Enter the portal
                        <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                      </Link>
                      <a href="#term" className="btn btn-outline h-12 px-6 text-[15px]">
                        See how a term works
                      </a>
                    </div>

                    <p className="mt-7 flex max-w-md items-start gap-2.5 text-xs leading-relaxed text-[var(--text-low)]">
                      <TriangleAlert
                        className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warn)]"
                        strokeWidth={1.9}
                        aria-hidden="true"
                      />
                      <span>
                        Capital placed in a vault is at risk, including the risk of total loss. Read
                        the{" "}
                        <Link
                          to="/legal/risk"
                          className="text-[var(--text-mid)] underline underline-offset-2 hover:text-[var(--accent-hi)]"
                        >
                          risk disclosure
                        </Link>{" "}
                        before you commit funds.
                      </span>
                    </p>
                  </div>

                  <TermWorkedExample />
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── The constants, ruled off edge to edge ────────────────────── */}
        <section aria-label="The published term structure at a glance">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <Stagger className="grid grid-cols-2 border-y border-[var(--line)] lg:grid-cols-4">
              {CONSTANTS.map((c, i) => (
                // Rules are set per cell rather than with divide-*, which on a
                // two column grid would put a stray line above the second cell.
                <StaggerItem
                  key={c.label}
                  className={`border-[var(--line)] px-4 py-7 sm:px-6 sm:py-9 lg:border-b-0 lg:border-r lg:last:border-r-0 ${
                    i % 2 === 0 ? "border-r" : ""
                  } ${i < 2 ? "border-b" : ""}`}
                >
                  <p className="figure-mid text-[var(--text-hi)]">
                    <Counter value={c.value} format={c.format} />
                  </p>
                  <p className="mt-2.5 text-xs leading-relaxed text-[var(--text-low)]">{c.label}</p>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>

        {/* ── 01. Where the capital works ──────────────────────────────── */}
        <Section id="capital" labelledBy="capital-title">
          <SectionIntro
            id="capital-title"
            label="Deployment"
            index="01"
            title="Nine income lines, and not one of them waits on the next."
            lead="The programme is built around music rights and the businesses that sit on top of them. What follows are the categories the capital works in. They are named as categories rather than as holdings, because no counterparty, catalogue or agreement has been published as a document you could check, and an unverifiable name is worth less than an honest gap."
          />

          <div className="mt-10 sm:mt-14">
            <CapitalMarquee />
          </div>

          <Reveal className="mt-8">
            <p className="inset max-w-3xl p-5 text-sm leading-relaxed text-[var(--text-mid)] sm:p-6">
              Independent lines reduce the chance that one weak season carries the whole return.
              They do not remove it, and no arrangement of them turns a published rate into a
              promise. What the rate is, and what stands behind it, is set out in full in the{" "}
              <Link
                to="/legal/risk"
                className="text-[var(--accent-hi)] underline underline-offset-2 hover:text-[var(--accent-soft)]"
              >
                risk disclosure
              </Link>
              .
            </p>
          </Reveal>
        </Section>

        {/* ── 02. The instrument ───────────────────────────────────────── */}
        <Section id="instrument" labelledBy="instrument-title">
          <SectionIntro
            id="instrument-title"
            label="The instrument"
            index="02"
            title="Six surfaces, one record underneath all of them."
            lead="Every screen in the portal derives from the same append only ledger of your own events. Nothing is averaged across members, nothing is illustrative, and nothing appears before there is a record to produce it."
          />

          <Stagger className="bento mt-10 sm:mt-14">
            {SURFACES.map((s) => (
              <StaggerItem key={s.kicker} className={`bento-cell ${s.span}`}>
                <Link
                  to={s.to}
                  className="panel sheen group flex h-full flex-col p-5 transition-colors hover:border-[var(--line-hi)] sm:p-6"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--line-hi)] bg-[rgba(46,139,255,0.08)]">
                    <s.icon
                      className="h-[18px] w-[18px] text-[var(--accent-hi)]"
                      strokeWidth={1.7}
                      aria-hidden="true"
                    />
                  </span>

                  <span className="eyebrow mt-5 flex items-center gap-1.5">
                    {s.kicker}
                    <ArrowUpRight
                      className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100"
                      strokeWidth={2.4}
                      aria-hidden="true"
                    />
                  </span>

                  <h3 className="mt-2 text-base font-semibold text-[var(--text-hi)] sm:text-lg">
                    {s.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--text-mid)]">{s.body}</p>

                  {s.foot && (
                    <span className="machine mt-6 block break-normal border-t border-[var(--line)] pt-4 text-[11px] text-[var(--text-low)] sm:mt-auto">
                      {s.foot}
                    </span>
                  )}
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </Section>

        {/* ── 03. How a term works ─────────────────────────────────────── */}
        <Section id="term" labelledBy="term-title">
          <SectionIntro
            id="term-title"
            label="How a term works"
            index="03"
            title="Thirty days, drawn to scale."
            lead={
              <>
                Accrual is linear against the original principal, so the shape of a term is a
                straight ramp and not a curve that flatters itself. Scroll the stages and the figure
                keeps pace: every reading on it is {DAY_RATE} of principal multiplied by the day
                count, and nothing else.
              </>
            }
          />

          <div className="mt-10 sm:mt-14">
            <TermTimeline principal={TIERS[1].entry} />
          </div>
        </Section>

        {/* ── 04. The ladder ───────────────────────────────────────────── */}
        <Section id="ladder" labelledBy="ladder-title">
          <SectionIntro
            id="ladder-title"
            label="The ladder"
            index="04"
            title="Six rungs, and the only column that moves is speed."
            lead={
              <>
                Most platforms pay their largest members more. Rigel does not. The term rate is{" "}
                {TERM_RATE} at every rung from {FIRST_TIER.name} to {TOP_TIER.name}. What climbing
                buys is settlement measured in hours instead of days, deeper analytics and priority
                in the queue. Each rung below links to its own terms.
              </>
            }
          />

          <div className="mt-10 sm:mt-14">
            <TierLadder />
          </div>
        </Section>

        {/* ── 05. From the desk ────────────────────────────────────────── */}
        <Section id="desk" labelledBy="desk-title">
          <SectionIntro
            id="desk-title"
            label="From the desk"
            index="05"
            title="Why it is shaped this way."
            lead="Three decisions produced almost everything else on this page. They are the ones worth arguing with, so they are set out in full rather than compressed into a slogan. No individual signs for them, because there is no track record to attach to a name yet, and inventing one would be the first unverifiable thing on the page."
          />

          <div className="mt-10 sm:mt-14">
            <DeskStatement />
          </div>
        </Section>

        {/* ── 06. Discipline ───────────────────────────────────────────── */}
        <Section id="discipline" labelledBy="discipline-title">
          <SectionIntro
            id="discipline-title"
            label="Discipline"
            index="06"
            title="What the system refuses to do on your behalf."
            lead="Stated as refusals rather than as promises. A refusal is easier to check, harder to quietly drop, and considerably more useful when you are deciding whether to trust a platform with money. Each one below names the surface you can test it on, and every change to this list is dated on the change log."
          />

          <Stagger as="ul" className="ledger mt-10 sm:mt-14">
            {DISCIPLINE.map((d, i) => (
              <StaggerItem as="li" key={d.title} className="min-w-0">
                <div
                  className={`rail-row rail-row-mute !items-start gap-4 ${
                    i === DISCIPLINE.length - 1 ? "!border-b-0" : ""
                  }`}
                >
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-[rgba(46,139,255,0.07)]">
                    <d.icon
                      className="h-4 w-4 text-[var(--accent-hi)]"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-semibold text-[var(--text-hi)]">{d.title}</h3>
                    <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--text-mid)]">
                      {d.body}
                    </p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </Section>

        {/* ── 07. Questions ────────────────────────────────────────────── */}
        <Section id="questions" labelledBy="questions-title">
          <SectionIntro
            id="questions-title"
            label="Questions"
            index="07"
            title="Everything worth asking before you place capital."
            lead="Including where the record actually lives today, what happens if you do nothing at maturity, and what this product is not."
          />

          <div className="mt-10 max-w-3xl sm:mt-14">
            <Faq />
          </div>
        </Section>

        {/* ── Closing ──────────────────────────────────────────────────── */}
        <section
          id="start"
          aria-labelledby="start-title"
          className="scroll-mt-20 pb-20 pt-14 sm:pb-28 sm:pt-20"
        >
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <DrawRule className="mb-12 sm:mb-16" />

            <Reveal>
              <div className="glass relative p-6 sm:p-10 lg:p-14">
                <PointerLight size={520} />

                <div className="grid gap-9 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-end lg:gap-14">
                  <div className="min-w-0">
                    <Mark size={40} />
                    <h2
                      id="start-title"
                      className="display mt-6 text-balance text-[clamp(1.85rem,5.4vw,3.25rem)]"
                    >
                      Open a term, or read what can go wrong first.
                    </h2>
                    <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-[var(--text-mid)] sm:text-base">
                      Both are one click, and we would rather you did the second one. Entry starts
                      at {money(FIRST_TIER.entry)}, and the rate is the same whether you place that
                      or {money(TOP_TIER.entry)}.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Link to="/app/vaults/new" className="btn btn-primary h-12 px-6 text-[15px]">
                      Open a term
                      <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                    </Link>
                    <Link to="/legal/risk" className="btn btn-outline h-12 px-6 text-[15px]">
                      Read the risk disclosure
                    </Link>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--text-low)]">
                      No account system stands behind this build yet. The portal identifies you by a
                      name held in your own browser, and it says so on the way in.
                    </p>
                  </div>
                </div>

                {/* The risk line sits at the same weight as the call to action,
                    not in the small print underneath it. */}
                <div className="mt-10 border-t border-[var(--line)] pt-6">
                  <p className="flex items-start gap-3 text-sm leading-relaxed text-[var(--text)]">
                    <TriangleAlert
                      className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[var(--warn)]"
                      strokeWidth={1.9}
                      aria-hidden="true"
                    />
                    <span className="max-w-3xl">
                      <strong className="font-semibold text-[var(--text-hi)]">
                        The risk, stated plainly.
                      </strong>{" "}
                      Capital placed in a vault can be lost in part or in full. The published rate
                      is a target, not a promise. There is no deposit protection and no compensation
                      scheme, Rigel is not a bank, and a return of this size implies risk of the
                      same size. Place only what you can lose entirely without it changing how you
                      live.
                    </span>
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
