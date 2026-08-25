import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

/**
 * Shared page furniture for the public site: a section shell with the right
 * anchor offset under the sticky header, and the eyebrow / heading / lead
 * block that opens each one.
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
      className={`scroll-mt-20 border-t border-[var(--line)] py-16 sm:py-24 ${className}`}
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-6">{children}</div>
    </section>
  );
}

export function SectionIntro({
  eyebrow,
  title,
  lead,
  id,
  className = "",
}: {
  eyebrow: string;
  title: string;
  lead?: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <Reveal className={`max-w-2xl ${className}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id} className="display mt-3 text-[clamp(1.75rem,4.4vw,2.5rem)] text-balance">
        {title}
      </h2>
      {lead && (
        <p className="mt-4 text-[15px] leading-relaxed text-[var(--text-mid)] sm:text-base">
          {lead}
        </p>
      )}
    </Reveal>
  );
}
