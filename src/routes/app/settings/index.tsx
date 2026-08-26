import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Bell,
  BookMarked,
  Bookmark,
  Compass,
  Database,
  Download,
  Flag,
  Gauge,
  HardDrive,
  LifeBuoy,
  LogOut,
  Palette,
  ScrollText,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
  Volume2,
  X,
  type LucideIcon,
} from "lucide-react";
import { useMotionLevel } from "@/context/MotionContext";
import { useLedger } from "@/hooks/useLedger";
import { useArmedAction } from "@/hooks/useArmedAction";
import { isMuted } from "@/lib/sound";
import { bookmarkCount } from "@/domain/feed";
import { inviteCode } from "@/domain/circle";
import { SettingsGroup } from "@/components/system/SettingsUI";
import { money } from "@/components/system/format";
import {
  MemberAvatar,
  SectionRow,
  formatBytes,
  measureStorage,
  notifyOnCount,
  readNotifyPrefs,
  useDisplayPrefs,
  useMemberIdentity,
} from "@/features/profile";
import { TierBadge } from "@/features/engagement";

/**
 * Settings: the hub.
 *
 * Every row states what it is currently set to. A list that only names its
 * screens makes the member open all of them to find out what is on, so the
 * motion level, the sound state, the density, the number of notifications
 * enabled, the size of the ledger and the count of saved posts are all read
 * live and printed on the row that leads to them.
 *
 * Nothing here is a setting in itself. The hub navigates, and the screens it
 * points at own their preferences.
 */

const MOTION_LABEL = { solo: "Solo", vibe: "Vibe", cinema: "Cinema" } as const;

type Row = {
  key: string;
  icon: LucideIcon;
  title: string;
  description: string;
  value?: string;
  to?: string;
  href?: string;
  onClick?: () => void;
  tone?: "default" | "danger";
};

type Group = { name: string; icon: LucideIcon; descriptor: string; rows: Row[] };

export default function SettingsHub() {
  const member = useMemberIdentity();
  const { level } = useMotionLevel();
  const [display] = useDisplayPrefs();
  const snap = useLedger();
  const [query, setQuery] = useState("");

  // Read once per visit. These are preferences and counts, not live feeds, and
  // re-reading them on a timer would only spend battery to show the same thing.
  const [storage, setStorage] = useState(() => measureStorage());
  const notify = useMemo(readNotifyPrefs, []);
  const saved = useMemo(bookmarkCount, []);
  const soundOn = !isMuted();

  useEffect(() => {
    setStorage(measureStorage());
  }, [snap.events.length]);

  const [signOutArmed, requestSignOut] = useArmedAction(() => {
    member.logout();
    toast.success("Signed out. Your ledger stays in this browser.");
  });

  // Seeded with the display name because that is what Circle itself passes to
  // `inviteCode`. Two surfaces showing the same member two different codes
  // would be worse than the row saying nothing at all, so they share an input.
  const code = useMemo(() => inviteCode(member.displayName), [member.displayName]);
  const enabled = notifyOnCount(notify);

  const groups: Group[] = [
    {
      name: "Account",
      icon: UserRound,
      descriptor: member.approach.name,
      rows: [
        {
          key: "profile",
          icon: UserRound,
          title: "Profile",
          description: "Your name, standing, record and stated approach",
          value: member.displayName,
          to: "/app/settings/profile",
        },
        {
          key: "security",
          icon: ShieldCheck,
          title: "Security and storage",
          description: "What this build holds in this browser, and what it does not protect",
          value: storage.readable ? formatBytes(storage.bytes) : "Blocked",
          to: "/app/security",
        },
        {
          key: "circle",
          icon: UsersRound,
          title: "Circle",
          description: "Your invite code and an honest account of what it does today",
          value: code,
          to: "/app/circle",
        },
      ],
    },
    {
      name: "Interface",
      icon: Palette,
      descriptor: MOTION_LABEL[level],
      rows: [
        {
          key: "motion",
          icon: Sparkles,
          title: "Motion",
          description: "How much the interface animates, from still to full",
          value: MOTION_LABEL[level],
          to: "/app/settings/appearance",
        },
        {
          key: "sound",
          icon: Volume2,
          title: "Sound",
          description: "Short tones on confirmations and taps",
          value: soundOn ? "On" : "Off",
          to: "/app/settings/appearance",
        },
        {
          key: "density",
          icon: Gauge,
          title: "Density and transparency",
          description: "Row spacing, and whether floating surfaces stay see through",
          value: `${display.density === "compact" ? "Compact" : "Comfortable"}, ${
            display.transparency === "reduced" ? "solid" : "glass"
          }`,
          to: "/app/settings/appearance",
        },
        {
          key: "notifications",
          icon: Bell,
          title: "Notifications",
          description: "What you would want to hear about, stored until there is a way to send it",
          value: `${enabled} of 6 on`,
          to: "/app/settings/notifications",
        },
      ],
    },
    {
      name: "Data",
      icon: Database,
      descriptor: `${snap.events.length} events`,
      rows: [
        {
          key: "ledger",
          icon: ScrollText,
          title: "Your ledger",
          description: "Every event this browser holds, and what it derives",
          value: `${snap.events.length} ${snap.events.length === 1 ? "event" : "events"}`,
          to: "/app/settings/data",
        },
        {
          key: "export",
          icon: Download,
          title: "Export and import",
          description: "Take a copy as JSON or CSV, or restore one you took before",
          value: "JSON, CSV",
          to: "/app/settings/data",
        },
        {
          key: "storage",
          icon: HardDrive,
          title: "Storage in use",
          description: "Measured across every key this build has written",
          value: storage.readable ? formatBytes(storage.bytes) : "Blocked",
          to: "/app/security",
        },
        {
          key: "saved",
          icon: Bookmark,
          title: "Saved posts",
          description: "Signal posts you kept, held in this browser",
          value: `${saved} saved`,
          to: "/app/signal",
        },
      ],
    },
    {
      name: "Learn",
      icon: Compass,
      descriptor: "Reference",
      rows: [
        {
          key: "orientation",
          icon: Flag,
          title: "Orientation",
          description: "The introduction to how vaults, terms and tiers work",
          to: "/app/orientation",
        },
        {
          key: "glossary",
          icon: BookMarked,
          title: "Glossary",
          description: "Every term the product uses, defined once",
          to: "/app/glossary",
        },
        {
          key: "atlas",
          icon: Compass,
          title: "Atlas",
          description: "The map of every surface in the product",
          to: "/app/atlas",
        },
        {
          key: "support",
          icon: LifeBuoy,
          title: "Support",
          description: "Practical help with the desk and the programme",
          to: "/app/support",
        },
      ],
    },
    {
      name: "Legal",
      icon: ShieldCheck,
      descriptor: "Policies",
      rows: [
        {
          key: "privacy",
          icon: ShieldCheck,
          title: "Privacy Policy",
          description: "What is collected and what is not",
          href: "/legal/privacy",
        },
        {
          key: "terms",
          icon: ScrollText,
          title: "Terms of Service",
          description: "The agreement covering use of the programme",
          href: "/legal/terms",
        },
        {
          key: "risk",
          icon: ShieldCheck,
          title: "Risk Disclosure",
          description: "What placing capital in a vault involves",
          href: "/legal/risk",
        },
      ],
    },
    {
      name: "Session",
      icon: LogOut,
      descriptor: "This browser",
      rows: [
        {
          key: "signout",
          icon: LogOut,
          title: signOutArmed ? "Tap again to sign out" : "Sign out",
          description: signOutArmed
            ? "This clears your handle from this browser. Your ledger stays where it is."
            : "Clears your handle from this browser. Nothing is signed out anywhere else.",
          onClick: requestSignOut,
          tone: "danger",
        },
      ],
    },
  ];

  const q = query.trim().toLowerCase();
  const filtered = q
    ? groups
        .map((g) => ({
          ...g,
          rows: g.rows.filter((r) =>
            `${g.name} ${r.title} ${r.description} ${r.value ?? ""}`.toLowerCase().includes(q),
          ),
        }))
        .filter((g) => g.rows.length > 0)
    : groups;

  const matches = filtered.reduce((n, g) => n + g.rows.length, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <p className="eyebrow">Account</p>
        <h1 className="display mt-1 text-2xl sm:text-3xl">Settings</h1>
        <p className="mt-2 max-w-prose text-sm text-[var(--text-low)]">
          Preferences, your data and the documents behind the programme. Every one of them is held
          in this browser.
        </p>
      </header>

      {/* Identity, so the hub opens on who is signed in rather than a list. */}
      <Link
        to="/app/settings/profile"
        className="glass sheen flex items-center gap-4 p-4 transition-colors hover:border-[rgba(46,139,255,0.4)] sm:p-5"
      >
        <MemberAvatar
          initials={member.initials}
          seed={member.handle || member.displayName}
          size="md"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-[var(--text-hi)]">
            {member.displayName}
          </span>
          <span className="machine block truncate text-[var(--text-low)]">
            {member.handle ? `@${member.handle}` : member.reference || "No handle claimed"}
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1.5">
          <TierBadge tier={snap.tier} size="sm" />
          <span className="tabular text-[11px] text-[var(--text-low)]">
            {money(snap.portfolioValue)}
          </span>
        </span>
      </Link>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-low)]"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search settings"
          aria-label="Search settings"
          className="min-h-[44px] w-full rounded-xl border border-[var(--line-hi)] bg-[rgba(5,7,15,0.6)] py-3 pl-10 pr-10 text-sm text-[var(--text-hi)] outline-none transition-colors placeholder:text-[var(--text-low)] focus:border-[var(--accent)]"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-[var(--text-low)] transition-colors hover:bg-[rgba(120,160,220,0.09)] hover:text-[var(--text-hi)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {q && (
        <p className="text-xs text-[var(--text-low)]" aria-live="polite">
          {matches === 0
            ? `Nothing matches "${query.trim()}"`
            : `${matches} ${matches === 1 ? "setting" : "settings"} match "${query.trim()}"`}
        </p>
      )}

      {filtered.length === 0 ? (
        <section className="panel p-8 text-center">
          <h2 className="text-[15px] font-semibold text-[var(--text-hi)]">No matching setting</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[var(--text-low)]">
            Try a shorter word, such as name, motion, sound, density, export or storage.
          </p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="btn btn-secondary mt-5 min-h-[44px]"
          >
            Clear search
          </button>
        </section>
      ) : (
        filtered.map((g) => (
          <SettingsGroup key={g.name} icon={g.icon} name={g.name} descriptor={g.descriptor}>
            {g.rows.map((r) => (
              <SectionRow
                key={r.key}
                icon={r.icon}
                title={r.title}
                description={r.description}
                value={r.value}
                to={r.to}
                href={r.href}
                onClick={r.onClick}
                tone={r.tone}
              />
            ))}
          </SettingsGroup>
        ))
      )}

      <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pb-2 text-center text-[11px] text-[var(--text-low)]">
        <Link to="/" className="underline-offset-2 hover:underline">
          Return to the public site
        </Link>
        <Link
          to="/app/security"
          className="inline-flex items-center gap-1.5 hover:text-[var(--text)]"
        >
          <HardDrive className="h-3 w-3" aria-hidden="true" /> Everything is stored in this browser
        </Link>
      </p>
    </div>
  );
}
