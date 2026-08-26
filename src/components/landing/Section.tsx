import type { ReactNode } from "react";
import { DrawRule } from "./DrawRule";
import { Reveal } from "./Reveal";

/**
 * Page furniture for the public site.
 *
 * A section here is a horizontal band ruled off from the one above, not
 * another floating card, and its head is left aligned rather than centred: a
 * short label, a hairline that draws itself out to the right edge, and the
 * band's index. The title and its lead then split into an oversized figure
 * with a narrow supporting rail, which is the same asymmetry the rest of the
 * product uses to open a screen.
 */

export function Section({
  id,
  children,
  className = "",
  labelledBy,
}: {
  id: string;
  children: ReactNode;
  className?: string;
  labelledBy?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={`scroll-mt-20 py-14 sm:py-20 lg:py-24 ${className}`}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-6">{children}</div>
    </section>
  );
}

export function SectionIntro({
  label,
  index,
  title,
  lead,
  id,
  className = "",
}: {
  /** The band label, tracked and uppercase. Not a heading: the title is. */
  label: string;
  /** Position in the page, shown at the end of the hairline. */
  index?: string;
  title: ReactNode;
  lead?: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <DrawRule className="mb-8 sm:mb-10" />

      <Reveal>
        <div className="band-head">
          <p className="band-title">{label}</p>
          <span aria-hidden="true" className="hairline" />
          {index && (
            <p aria-hidden="true" className="metric shrink-0 text-xs text-[var(--text-low)]">
              {index}
            </p>
          )}
        </div>

        <div className="mt-7 grid gap-5 lg:mt-9 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
          <h2 id={id} className="display text-balance text-[clamp(1.75rem,5vw,3rem)]">
            {title}
          </h2>
          {lead && (
            <div className="min-w-0 lg:border-l lg:border-[var(--line)] lg:pl-6 lg:pt-2">
              <p className="text-[15px] leading-relaxed text-[var(--text-mid)]">{lead}</p>
            </div>
          )}
        </div>
      </Reveal>
    </div>
  );
}
