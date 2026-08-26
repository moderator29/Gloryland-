import { Outlet, useLocation, Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { MobileTabs, MobileMenuButton } from "./MobileNav";
import { Ambience } from "./Ambience";
import { AccountMenu } from "./AccountMenu";
import { MarketTicker } from "@/features/market";
import { LocalLedgerNotice } from "./LocalLedgerNotice";
import { Aperture } from "@/features/onboarding";
import { InstallPrompt, ScrollRail, Wayfinder } from "@/features/utility";
import { Palette } from "@/features/atlas";
import { useRelays } from "@/features/relay";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const COLLAPSE_KEY = "rgl_sidebar_collapsed";

/** Page transition: a short lift, enough to signal a change without delaying it. */
function Page({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, y: -6 }}
      transition={{ duration: reduce ? 0 : 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function AppShell() {
  const { pathname, hash } = useLocation();

  // Mounted here rather than on a route, because a relay must fire wherever
  // the member lands, not only if they open the vault it belongs to.
  useRelays();

  const mainRef = useRef<HTMLElement>(null);

  // Navigating used to leave focus where the link had been and carry the old
  // scroll position into the new route. Reset both, and move focus to the
  // heading so assistive technology announces where it landed.
  useLayoutEffect(() => {
    if (hash) return;
    window.scrollTo(0, 0);
    const heading = mainRef.current?.querySelector<HTMLElement>("h1");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
  }, [pathname, hash]);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  return (
    <div className="relative min-h-screen bg-[var(--ink-000)]">
      {/* Played once a session, before anything else is readable. */}
      <Aperture />
      {/* The one overlay in the product, because a launcher is not a
          destination. Cmd+K anywhere, or "/" outside a text field. */}
      <Palette />
      <Ambience />
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

      <div
        className="relative z-10 flex min-h-screen flex-col"
        style={{ paddingLeft: "var(--rail, 0px)" }}
      >
        {/* the rail offset only exists at lg and up; set via a style tag below */}
        <style>{`@media (min-width:1024px){:root{--rail:${collapsed ? 96 : 256}px}}@media (max-width:1023px){:root{--rail:0px}}`}</style>

        <ScrollRail />
        <LocalLedgerNotice />
        <MarketTicker />

        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-[var(--line)] bg-[rgba(5,7,15,0.82)] px-4 backdrop-blur-xl sm:px-6">
          <MobileMenuButton />
          <div className="ml-auto flex items-center gap-2">
            <Wayfinder />
            <Link to="/app/vaults/new" className="btn btn-primary !py-2 !text-[13px]">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Vault</span>
              <span className="sm:hidden">Vault</span>
            </Link>
            <AccountMenu />
          </div>
        </header>

        <a
          href="#app-main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[var(--accent)] focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#04101f]"
        >
          Skip to content
        </a>

        <main ref={mainRef} id="app-main" className="flex-1 px-4 pb-28 pt-6 sm:px-6 lg:pb-10">
          <div className="mx-auto w-full max-w-6xl">
            <AnimatePresence mode="wait">
              <Page key={pathname}>
                <Outlet />
              </Page>
            </AnimatePresence>
            {/* Asked below the content rather than over it, so it never
                interrupts what the member came to read. */}
            <InstallPrompt className="mt-8" />
          </div>
        </main>
      </div>

      <MobileTabs />
    </div>
  );
}
