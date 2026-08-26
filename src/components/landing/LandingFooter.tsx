import { Link } from "react-router-dom";
import { Wordmark } from "@/components/brand/Mark";
import { CYCLE_DAYS } from "@/domain/tiers";
import { DAY_RATE, TERM_RATE } from "./figures";
import { DrawRule } from "./DrawRule";

/**
 * Public site footer: the page's own sections, the routes into the portal,
 * the legal shelf, and the standing risk line that has to sit under every
 * marketing surface rather than behind a link.
 */

type Item = { label: string; to?: string; href?: string };

const COLUMNS: { heading: string; items: Item[] }[] = [
  {
    heading: "This page",
    items: [
      { label: "Where the capital works", href: "#capital" },
      { label: "The instrument", href: "#instrument" },
      { label: "How a term works", href: "#term" },
      { label: "The ladder", href: "#ladder" },
      { label: "From the desk", href: "#desk" },
      { label: "Questions", href: "#questions" },
    ],
  },
  {
    heading: "The portal",
    items: [
      { label: "Enter", to: "/app" },
      { label: "Open a term", to: "/app/vaults/new" },
      { label: "Tiers", to: "/app/tiers" },
      { label: "Security", to: "/app/security" },
      { label: "Glossary", to: "/app/glossary" },
    ],
  },
  {
    heading: "Legal",
    items: [
      { label: "Risk disclosure", to: "/legal/risk" },
      { label: "Terms of service", to: "/legal/terms" },
      { label: "Privacy policy", to: "/legal/privacy" },
      { label: "Change log", to: "/legal/changes" },
      // The only route in the product that reaches a person, so it sits with
      // the documents rather than behind the Gate with the assistants.
      { label: "Contact", to: "/contact" },
    ],
  },
];

const linkClass =
  "rounded text-sm text-[var(--text-mid)] transition-colors hover:text-[var(--text-hi)]";

export function LandingFooter() {
  return (
    <footer className="border-t border-[var(--line)] bg-[var(--ink-050)]">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-6 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Wordmark size={28} tagline />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-[var(--text-low)]">
              Fixed term vaults with a single published rate: {DAY_RATE} of principal a day for{" "}
              {CYCLE_DAYS} days, {TERM_RATE} at maturity, identical at every rung. Named for the
              blue supergiant in Orion.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h2 className="eyebrow">{col.heading}</h2>
              <ul className="mt-4 space-y-2.5">
                {col.items.map((item) => (
                  <li key={`${col.heading}-${item.label}`}>
                    {item.to ? (
                      <Link to={item.to} className={linkClass}>
                        {item.label}
                      </Link>
                    ) : (
                      <a href={item.href} className={linkClass}>
                        {item.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <DrawRule className="mt-12" />

        <div className="pt-8">
          <p className="max-w-3xl text-xs leading-relaxed text-[var(--text-low)]">
            Capital placed in a vault is at risk, including the risk of total loss. Published term
            rates are targets, not guarantees, and past performance does not predict future results.
            Rigel is not a bank, and nothing placed here carries deposit protection. Nothing on this
            site is investment, tax or legal advice. Read the{" "}
            <Link
              to="/legal/risk"
              className="text-[var(--accent-hi)] underline underline-offset-2 hover:text-[var(--accent-soft)]"
            >
              risk disclosure
            </Link>{" "}
            before committing funds.
          </p>
          <div className="mt-6 flex flex-col gap-3 text-xs text-[var(--text-low)] sm:flex-row sm:items-center sm:justify-between">
            <p>&copy; {new Date().getFullYear()} Rigel. All rights reserved.</p>
            <p className="machine break-normal text-[11px]">
              TERM {CYCLE_DAYS}D &middot; ACCRUAL {DAY_RATE}/DAY &middot; MATURITY {TERM_RATE}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
