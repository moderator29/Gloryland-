import {
  LayoutDashboard,
  Terminal,
  Landmark,
  Layers,
  Gift,
  ChartLine,
  Sparkles,
  Receipt,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean };
export type NavGroup = { heading: string; items: NavItem[] };

/**
 * Navigation is deliberately short. Anything that is a detail of one of these
 * surfaces lives inside it — as a tab, a drawer or a detail route — rather
 * than earning its own line in the sidebar.
 */
export const NAV: NavGroup[] = [
  {
    heading: "Overview",
    items: [
      { to: "/app", label: "Home", icon: LayoutDashboard, end: true },
      { to: "/app/desk", label: "Desk", icon: Terminal },
      { to: "/app/vaults", label: "Vaults", icon: Landmark },
      { to: "/app/tiers", label: "Tiers", icon: Layers },
      { to: "/app/rewards", label: "Rewards", icon: Gift },
    ],
  },
  {
    heading: "Intelligence",
    items: [
      { to: "/app/analytics", label: "Analytics", icon: ChartLine },
      { to: "/app/insights", label: "Insights", icon: Sparkles },
      { to: "/app/activity", label: "Activity", icon: Receipt },
    ],
  },
  {
    heading: "Account",
    items: [{ to: "/app/settings", label: "Settings", icon: Settings }],
  },
];

/** The four surfaces that get a slot in the mobile tab bar. */
export const MOBILE_TABS: NavItem[] = [
  { to: "/app", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/app/desk", label: "Desk", icon: Terminal },
  { to: "/app/vaults", label: "Vaults", icon: Landmark },
  { to: "/app/rewards", label: "Rewards", icon: Gift },
];
