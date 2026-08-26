import { Link } from "react-router-dom";
import { ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * One line in an account surface: an icon, what it is, what it does in a
 * sentence, what it is currently set to, and a chevron when it leads somewhere.
 *
 * The current value is the point. A settings list that only names its screens
 * makes the member open every one to find out what is on, so every row that can
 * report its own state does.
 *
 * The row is a 56px target at its smallest, which clears the 44px minimum with
 * the padding a thumb actually needs on a phone.
 */

export type SectionRowProps = {
  icon: LucideIcon;
  title: string;
  /** One line. It wraps rather than truncating, because it is the explanation. */
  description?: string;
  /** What this setting is set to right now. Truncates, never wraps. */
  value?: ReactNode;
  /** Internal route. Renders the row as a link with a chevron. */
  to?: string;
  /** External or legal document. Renders as a plain anchor. */
  href?: string;
  onClick?: () => void;
  tone?: "default" | "danger";
};

const BASE =
  "flex w-full min-h-[56px] items-center gap-3.5 border-t border-[var(--line)] px-1 py-3 text-left transition-colors first:border-t-0";

const HOVER = "hover:bg-[rgba(46,139,255,0.05)]";

export function SectionRow({
  icon: Icon,
  title,
  description,
  value,
  to,
  href,
  onClick,
  tone = "default",
}: SectionRowProps) {
  const danger = tone === "danger";

  const body = (
    <>
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${
          danger
            ? "border-[rgba(248,113,113,0.3)] bg-[rgba(248,113,113,0.08)]"
            : "border-[var(--line)] bg-[rgba(46,139,255,0.07)]"
        }`}
      >
        <Icon
          aria-hidden="true"
          strokeWidth={1.8}
          className={`h-4 w-4 ${danger ? "text-[var(--loss)]" : "text-[var(--accent-hi)]"}`}
        />
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={`block text-sm font-medium ${
            danger ? "text-[var(--loss)]" : "text-[var(--text-hi)]"
          }`}
        >
          {title}
        </span>
        {description && (
          <span className="mt-0.5 block text-xs leading-relaxed text-[var(--text-low)]">
            {description}
          </span>
        )}
      </span>

      {value !== undefined && (
        <span className="max-w-[7.5rem] shrink-0 truncate text-right text-xs font-medium text-[var(--text-mid)] sm:max-w-[12rem]">
          {value}
        </span>
      )}

      {(to || href || onClick) && (
        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-low)]" aria-hidden="true" />
      )}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={`${BASE} ${HOVER}`}>
        {body}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={`${BASE} ${HOVER}`}>
        {body}
      </a>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${BASE} ${HOVER}`}>
        {body}
      </button>
    );
  }

  return <div className={BASE}>{body}</div>;
}
