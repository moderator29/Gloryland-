import { Link } from "react-router-dom";
import { BrandMark } from "@/components/BrandLogo";
import { BRAND_NAME, BRAND_TAGLINE, BRAND_FULL } from "@/lib/site-config";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/packages", label: "Tiers" },
  { to: "/portal", label: "Portal" },
  { to: "/portfolio", label: "Vault" },
  { to: "/settings", label: "Settings" },
] as const;

export function SiteFooter() {
  return (
    <footer className="relative z-10 mx-auto max-w-2xl px-5 pb-32 pt-10">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="mt-8 flex flex-col items-center text-center">
        <BrandMark size={44} />
        <p className="font-display mt-2.5 text-lg tracking-[0.18em] text-gradient-gold">
          {BRAND_NAME.toUpperCase()}
        </p>
        <p className="mt-0.5 text-[9px] uppercase tracking-[0.34em] text-primary/70">
          {BRAND_TAGLINE}
        </p>

        <nav aria-label="Footer" className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <p className="mt-6 max-w-md text-[11px] leading-relaxed text-muted-foreground/80">
          Digital asset investments carry risk, including the possible loss of principal. Returns
          are illustrative and never guaranteed. Membership is by private invitation, for eligible
          participants aged 18 and over.
        </p>

        <p className="mt-4 text-[10px] uppercase tracking-[0.22em] text-muted-foreground/60">
          © {new Date().getFullYear()} {BRAND_FULL} · All rights reserved
        </p>
      </div>
    </footer>
  );
}
