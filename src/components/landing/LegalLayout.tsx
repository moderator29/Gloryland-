import { Link } from "react-router-dom";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/Mark";
import { Reveal } from "./Reveal";

/**
 * Shared shell for the legal shelf.
 *
 * A single readable measure, a numbered section spine, and a contents rail
 * on wide screens. Prose styling is applied at the container so each page
 * can be written as plain semantic HTML.
 */

export type LegalSection = {
  id: string;
  heading: string;
  body: ReactNode;
};

const prose = [
  "space-y-4 text-[15px] leading-relaxed text-[var(--text-mid)]",
  "[&_p]:max-w-none",
  "[&_strong]:font-semibold [&_strong]:text-[var(--text-hi)]",
  "[&_a]:text-[var(--accent-hi)] [&_a]:underline [&_a]:underline-offset-2",
  "[&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_ul]:marker:text-[var(--text-low)]",
  "[&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_ol]:marker:text-[var(--text-low)]",
  "[&_h3]:mt-6 [&_h3]:text-[15px] [&_h3]:font-semibold [&_h3]:text-[var(--text-hi)]",
].join(" ");

/** A visible flag on anything that needs a real lawyer before launch. */
export function ReviewNote({ children }: { children: ReactNode }) {
  return (
    <div
      className="my-5 rounded-xl border p-4"
      style={{
        borderColor: "rgba(251,191,36,0.32)",
        background: "rgba(251,191,36,0.07)",
      }}
      role="note"
    >
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--warn)]">
        <TriangleAlert className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} aria-hidden="true" />
        Requires legal review
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text)]">{children}</p>
    </div>
  );
}

export function LegalPage({
  title,
  kicker,
  updated,
  summary,
  sections,
  footnote,
}: {
  title: string;
  kicker: string;
  updated: string;
  summary: ReactNode;
  sections: LegalSection[];
  /**
   * Replaces the standing "needs counsel" note. The change log is a record
   * rather than an agreement, so the default line is wrong on it.
   */
  footnote?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--ink-000)] text-[var(--text)]">
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[rgba(8,11,22,0.82)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-5 sm:px-6">
          <Link to="/" className="rounded-lg" aria-label="Rigel, home">
            <Wordmark size={24} />
          </Link>
          <Link to="/" className="btn btn-ghost text-[13px]">
            <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-24 pt-12 sm:px-6 sm:pt-16">
        <Reveal>
          <p className="eyebrow">{kicker}</p>
          <h1 className="display mt-3 text-balance text-[clamp(2rem,6vw,3rem)]">{title}</h1>
          <p className="tabular mt-4 text-sm text-[var(--text-low)]">Last updated: {updated}</p>
          <div className="panel mt-8 max-w-3xl p-5 sm:p-6">
            <h2 className="eyebrow">In short</h2>
            <div className="mt-3 text-[15px] leading-relaxed text-[var(--text)]">{summary}</div>
          </div>
        </Reveal>

        <div className="mt-12 gap-12 lg:flex lg:items-start">
          {/* Contents rail. */}
          <nav
            aria-label="On this page"
            className="mb-10 shrink-0 lg:sticky lg:top-24 lg:order-2 lg:mb-0 lg:w-56"
          >
            <h2 className="eyebrow">Contents</h2>
            <ol className="mt-4 space-y-2">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="flex gap-2.5 rounded text-sm text-[var(--text-low)] transition-colors hover:text-[var(--text-hi)]"
                  >
                    <span className="tabular shrink-0 text-[var(--text-low)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0">{s.heading}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="min-w-0 max-w-3xl lg:order-1 lg:flex-1">
            {sections.map((s, i) => (
              <Reveal
                key={s.id}
                as="section"
                className="scroll-mt-24 border-t border-[var(--line)] py-8 first:border-0 first:pt-0"
              >
                <h2 id={s.id} className="flex gap-3 text-lg font-semibold text-[var(--text-hi)]">
                  <span className="tabular pt-0.5 text-sm text-[var(--accent)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0">{s.heading}</span>
                </h2>
                <div className={`mt-4 ${prose}`}>{s.body}</div>
              </Reveal>
            ))}

            <div className="mt-10 border-t border-[var(--line)] pt-8">
              <div className="text-xs leading-relaxed text-[var(--text-low)] [&_a]:text-[var(--accent-hi)] [&_a]:underline [&_a]:underline-offset-2">
                {footnote ?? (
                  <p>
                    This document is a good-faith description of how the platform intends to
                    operate. It is not legal advice, and it has not been reviewed by counsel.
                    Sections flagged above need real legal and business input before this page is
                    relied upon.
                  </p>
                )}
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link to="/legal/risk" className="btn btn-outline text-[13px]">
                  Risk disclosure
                </Link>
                <Link to="/legal/terms" className="btn btn-outline text-[13px]">
                  Terms of service
                </Link>
                <Link to="/legal/privacy" className="btn btn-outline text-[13px]">
                  Privacy policy
                </Link>
                <Link to="/legal/changes" className="btn btn-outline text-[13px]">
                  Change log
                </Link>
                <Link to="/contact" className="btn btn-outline text-[13px]">
                  Contact
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
