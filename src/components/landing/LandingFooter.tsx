import { Link } from "react-router-dom";
import { Wordmark } from "@/components/brand/Mark";
import { CYCLE_DAYS, CYCLE_RETURN } from "@/domain/tiers";
import { pct } from "@/components/system/format";

/**
 * Public site footer: navigation columns, the legal shelf, and the standing
 * risk line that has to sit under every marketing surface.
 */

type Item = { label: string; to?: string; href?: string };

const COLUMNS: { heading: string; items: Item[] }[] = [
  {
    heading: "Platform",
    items: [
      { label: "Product", href: "#product" },
      { label: "Vaults", href: "#vaults" },
      { label: "Tiers", href: "#tiers" },
      { label: "How it works", href: "#how" },
    ],
  },
  {
    heading: "Trust",
    items: [
      { label: "Security model", href: "#security" },
      { label: "FAQ", href: "#faq" },
      { label: "Risk disclosure", to: "/legal/risk" },
    ],
  },
  {
    heading: "Legal",
    items: [
      { label: "Privacy policy", to: "/legal/privacy" },
      { label: "Terms of service", to: "/legal/terms" },
      { label: "Risk disclosure", to: "/legal/risk" },
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
              Fixed-term digital-asset vaults with a single published rate: {pct(CYCLE_RETURN, 0)}{" "}
              over {CYCLE_DAYS} days. Named for the blue supergiant in Orion.
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

        <div className="mt-12 border-t border-[var(--line)] pt-8">
          <p className="max-w-3xl text-xs leading-relaxed text-[var(--text-low)]">
            Capital placed in a vault is at risk. Published term rates are targets, not guarantees,
            and past performance does not predict future results. Nothing on this site is
            investment, tax or legal advice. Read the{" "}
            <Link
              to="/legal/risk"
              className="text-[var(--accent-hi)] underline underline-offset-2 hover:text-[var(--accent-soft)]"
            >
              risk disclosure
            </Link>{" "}
            before committing funds.
          </p>
          <div className="mt-6 flex flex-col gap-3 text-xs text-[var(--text-low)] sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Rigel. All rights reserved.</p>
            <p className="tabular">Built for institutional digital-asset custody.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
