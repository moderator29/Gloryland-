import {
  LayoutDashboard,
  Terminal,
  Landmark,
  Layers,
  Gift,
  Radio,
  CandlestickChart,
  Sparkles,
  ChartLine,
  Receipt,
  LifeBuoy,
  Settings,
  UsersRound,
  CalendarRange,
  Compass,
  BookMarked,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean };
export type NavGroup = { heading: string; items: NavItem[] };

/**
 * Navigation stays short on purpose. Anything that is a detail of one of these
 * surfaces lives inside it, as a tab, a nested route or a drawer, rather than
 * earning its own line here.
 */
export const NAV: NavGroup[] = [
  {
    heading: "Capital",
    items: [
      { to: "/app", label: "Home", icon: LayoutDashboard, end: true },
      { to: "/app/desk", label: "Desk", icon: Terminal },
      { to: "/app/vaults", label: "Vaults", icon: Landmark },
      { to: "/app/tiers", label: "Tiers", icon: Layers },
      { to: "/app/rewards", label: "Yield", icon: Gift },
      { to: "/app/horizon", label: "Horizon", icon: CalendarRange },
      { to: "/app/market", label: "Markets", icon: CandlestickChart },
    ],
  },
  {
    heading: "Intelligence",
    items: [
      { to: "/app/signal", label: "Signal", icon: Radio },
      { to: "/app/insights", label: "Insight", icon: Sparkles },
      { to: "/app/analytics", label: "Telemetry", icon: ChartLine },
      { to: "/app/activity", label: "Ledger", icon: Receipt },
    ],
  },
  {
    heading: "Assistants",
    items: [
      { to: "/app/copilot", label: "Copilot", icon: Sparkles },
      { to: "/app/support", label: "Support", icon: LifeBuoy },
    ],
  },
  {
    heading: "Account",
    items: [
      { to: "/app/circle", label: "Circle", icon: UsersRound },
      { to: "/app/atlas", label: "Atlas", icon: Compass },
      { to: "/app/glossary", label: "Glossary", icon: BookMarked },
      { to: "/app/settings", label: "Settings", icon: Settings },
    ],
  },
];

/** The four surfaces that get a slot in the mobile capsule bar. */
export const MOBILE_TABS: NavItem[] = [
  { to: "/app", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/app/desk", label: "Desk", icon: Terminal },
  { to: "/app/vaults", label: "Vaults", icon: Landmark },
  { to: "/app/rewards", label: "Yield", icon: Gift },
];
