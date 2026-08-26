import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";
import { Wordmark } from "@/components/brand/Mark";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Public site header.
 *
 * Transparent over the hero, then glass once the page has scrolled, so the
 * links stay legible against content rather than fighting it. The hairline
 * along the bottom edge doubles as a read position: it is the one piece of
 * page furniture that tells you how much of the argument is left. Below `lg`
 * the section links collapse into a disclosure panel, and the portal call to
 * action never collapses.
 */

const LINKS = [
  { href: "#instrument", label: "Instrument" },
  { href: "#term", label: "Term" },
  { href: "#ladder", label: "Ladder" },
  { href: "#desk", label: "Desk" },
  { href: "#questions", label: "Questions" },
];

export function LandingNav() {
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile panel on resize up to desktop, so state cannot get stuck.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handle = (e: MediaQueryListEvent) => e.matches && setOpen(false);
    mq.addEventListener("change", handle);
    return () => mq.removeEventListener("change", handle);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
        scrolled || open
          ? "border-[var(--line)] bg-[rgba(8,11,22,0.78)] backdrop-blur-xl backdrop-saturate-150"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5 sm:px-6">
        <Link
          to="/"
          className="shrink-0 rounded-lg"
          aria-label="Rigel, home"
          onClick={() => setOpen(false)}
        >
          <Wordmark size={26} />
        </Link>

        <nav aria-label="Sections" className="ml-4 hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-mid)] transition-colors hover:bg-[rgba(120,160,220,0.08)] hover:text-[var(--text-hi)]"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link to="/app" className="btn btn-primary text-[13px]">
            Enter Portal
            <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </Link>
          <button
            type="button"
            className="btn btn-ghost px-2.5 lg:hidden"
            aria-expanded={open}
            aria-controls="landing-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <X className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <div
        id="landing-menu"
        hidden={!open}
        className="border-t border-[var(--line)] lg:hidden"
        aria-label="Sections"
      >
        <nav className="mx-auto grid max-w-6xl gap-1 px-4 py-3 sm:px-5">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--text)] transition-colors hover:bg-[rgba(120,160,220,0.08)] hover:text-[var(--text-hi)]"
            >
              {l.label}
            </a>
          ))}
        </nav>
      </div>

      {/* Read position. Decorative, and the transform is driven straight from
          the scroll value, so it never costs a React render. */}
      {!reduce && (
        <motion.div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-px origin-left"
          style={{
            scaleX: scrollYProgress,
            background:
              "linear-gradient(90deg, var(--accent-deep), var(--accent) 45%, var(--accent-soft))",
          }}
        />
      )}
    </header>
  );
}
