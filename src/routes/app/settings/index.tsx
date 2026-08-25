import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Database, FileText, Palette, Search, ShieldCheck, User, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { useMotionLevel } from "@/context/MotionContext";
import { useLedger } from "@/hooks/useLedger";
import { isMuted } from "@/lib/sound";
import { SettingsGroup, SettingsRow } from "@/components/system/SettingsUI";
import { money } from "@/components/system/format";

/* Mirrors the shape written by the notifications screen. Read-only here, so
   the hub can show what each category is currently set to. */
const NOTIFY_KEY = "rgl_notify_prefs";
const NOTIFY_LABELS: Record<string, string> = {
  maturity: "Vault maturity",
  claims: "Reward claims",
  tierProgress: "Tier progress",
  productUpdates: "Product updates",
};

function readNotify(): Record<string, boolean> {
  const fallback = { maturity: true, claims: true, tierProgress: true, productUpdates: false };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(NOTIFY_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out = { ...fallback };
    for (const k of Object.keys(fallback)) {
      if (typeof parsed[k] === "boolean") out[k as keyof typeof fallback] = parsed[k] as boolean;
    }
    return out;
  } catch {
    return fallback;
  }
}

const MOTION_LABEL = { solo: "Solo", vibe: "Vibe", cinema: "Cinema" } as const;

type Row = { label: string; description: string; value?: string; to: string };
type Section = { name: string; icon: LucideIcon; descriptor: string; rows: Row[] };

function Hint({ children }: { children: string }) {
  return (
    <span className="max-w-[8rem] truncate text-xs font-medium text-[var(--text-mid)] sm:max-w-none">
      {children}
    </span>
  );
}

export default function SettingsHub() {
  const { username } = useUser();
  const { level } = useMotionLevel();
  const snap = useLedger();
  const [query, setQuery] = useState("");
  const notify = readNotify();
  const soundOn = !isMuted();
  const enabledCount = Object.values(notify).filter(Boolean).length;

  const sections: Section[] = useMemo(
    () => [
      {
        name: "Profile",
        icon: User,
        descriptor: "Account",
        rows: [
          {
            label: "Display name",
            description: "The name used across the app",
            value: username ?? "Not set",
            to: "/app/settings/profile",
          },
        ],
      },
      {
        name: "Appearance",
        icon: Palette,
        descriptor: "Motion and sound",
        rows: [
          {
            label: "Motion level",
            description: "How much the interface animates",
            value: MOTION_LABEL[level],
            to: "/app/settings/appearance",
          },
          {
            label: "Interface sound",
            description: "Subtle feedback on actions",
            value: soundOn ? "On" : "Off",
            to: "/app/settings/appearance",
          },
        ],
      },
      {
        name: "Notifications",
        icon: Bell,
        descriptor: `${enabledCount} of 4 on`,
        rows: Object.entries(NOTIFY_LABELS).map(([key, label]) => ({
          label,
          description: notify[key] ? "Preference stored as on" : "Preference stored as off",
          value: notify[key] ? "On" : "Off",
          to: "/app/settings/notifications",
        })),
      },
      {
        name: "Data",
        icon: Database,
        descriptor: `${snap.events.length} events`,
        rows: [
          {
            label: "Export ledger",
            description: "Download every recorded event as JSON or CSV",
            value: "JSON, CSV",
            to: "/app/settings/data",
          },
          {
            label: "Reset account",
            description: `Erases ${money(snap.portfolioValue)} of position data permanently`,
            value: "Danger",
            to: "/app/settings/data",
          },
        ],
      },
      {
        name: "Legal",
        icon: ShieldCheck,
        descriptor: "Policies",
        rows: [
          {
            label: "Privacy Policy",
            description: "What is collected and what is not",
            to: "/legal/privacy",
          },
          {
            label: "Terms of Service",
            description: "The agreement covering use of the programme",
            to: "/legal/terms",
          },
          {
            label: "Risk Disclosure",
            description: "What placing capital in a vault involves",
            to: "/legal/risk",
          },
        ],
      },
    ],
    [username, level, soundOn, enabledCount, notify, snap.events.length, snap.portfolioValue],
  );

  const q = query.trim().toLowerCase();
  const filtered = q
    ? sections
        .map((s) => ({
          ...s,
          rows: s.rows.filter(
            (r) => r.label.toLowerCase().includes(q) || s.name.toLowerCase().includes(q),
          ),
        }))
        .filter((s) => s.rows.length > 0)
    : sections;

  const matchCount = filtered.reduce((n, s) => n + s.rows.length, 0);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <p className="eyebrow">Account</p>
        <h1 className="display mt-1 text-2xl sm:text-3xl">Settings</h1>
        <p className="mt-2 text-sm text-[var(--text-low)]">
          Preferences, data and the legal documents behind the programme.
        </p>
      </header>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-low)]"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search settings"
          aria-label="Search settings"
          className="w-full rounded-xl border border-[var(--line-hi)] bg-[rgba(5,7,15,0.6)] py-3 pl-10 pr-10 text-sm text-[var(--text-hi)] outline-none transition-colors placeholder:text-[var(--text-low)] focus:border-[var(--accent)]"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-[var(--text-low)] transition-colors hover:bg-[rgba(120,160,220,0.09)] hover:text-[var(--text-hi)]"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {q && (
        <p className="text-xs text-[var(--text-low)]" aria-live="polite">
          {matchCount === 0
            ? `Nothing matches "${query.trim()}"`
            : `${matchCount} ${matchCount === 1 ? "setting" : "settings"} match "${query.trim()}"`}
        </p>
      )}

      {filtered.length === 0 ? (
        <section className="panel p-8 text-center">
          <h2 className="text-[15px] font-semibold text-[var(--text-hi)]">No matching setting</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[var(--text-low)]">
            Try a shorter word, such as name, motion, sound, tier or export.
          </p>
          <button type="button" onClick={() => setQuery("")} className="btn btn-secondary mt-5">
            Clear search
          </button>
        </section>
      ) : (
        filtered.map((s) => (
          <SettingsGroup key={s.name} icon={s.icon} name={s.name} descriptor={s.descriptor}>
            {s.rows.map((r) => (
              <SettingsRow
                key={`${s.name}-${r.label}`}
                title={r.label}
                description={r.description}
                to={r.to}
                control={r.value ? <Hint>{r.value}</Hint> : undefined}
              />
            ))}
          </SettingsGroup>
        ))
      )}

      <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pb-2 text-center text-[11px] text-[var(--text-low)]">
        <Link to="/" className="underline-offset-2 hover:underline">
          Return to the public site
        </Link>
        <span className="inline-flex items-center gap-1.5">
          <FileText className="h-3 w-3" aria-hidden /> Ledger stored in this browser
        </span>
      </p>
    </div>
  );
}
