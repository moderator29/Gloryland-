import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Bell, Send } from "lucide-react";
import {
  SelectRow,
  SettingsGroup,
  SettingsNote,
  SettingsRow,
  Toggle,
} from "@/components/system/SettingsUI";

/**
 * Notification preferences.
 *
 * Nothing is delivered from this build: there is no server holding an address
 * to send to. What this screen does is record the choice, so the preference
 * survives and can be honoured the moment delivery exists. The screen says so
 * plainly rather than implying alerts are on their way.
 */

const KEY = "rgl_notify_prefs";

type Channel = "email" | "push" | "none";
type Prefs = {
  maturity: boolean;
  claims: boolean;
  tierProgress: boolean;
  productUpdates: boolean;
  channel: Channel;
};

const DEFAULTS: Prefs = {
  maturity: true,
  claims: true,
  tierProgress: true,
  productUpdates: false,
  channel: "email",
};

const CATEGORIES: { key: keyof Omit<Prefs, "channel">; title: string; description: string }[] = [
  {
    key: "maturity",
    title: "Vault maturity",
    description: "When a 30-day term completes and principal is ready to settle",
  },
  {
    key: "claims",
    title: "Reward claims",
    description: "When accrued rewards are claimed into available cash",
  },
  {
    key: "tierProgress",
    title: "Tier progress",
    description: "When a contribution moves you onto the next rung of the ladder",
  },
  {
    key: "productUpdates",
    title: "Product updates",
    description: "New vault terms, desk features and programme changes",
  },
];

function read(): Prefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return {
      maturity: typeof parsed.maturity === "boolean" ? parsed.maturity : DEFAULTS.maturity,
      claims: typeof parsed.claims === "boolean" ? parsed.claims : DEFAULTS.claims,
      tierProgress:
        typeof parsed.tierProgress === "boolean" ? parsed.tierProgress : DEFAULTS.tierProgress,
      productUpdates:
        typeof parsed.productUpdates === "boolean"
          ? parsed.productUpdates
          : DEFAULTS.productUpdates,
      channel:
        parsed.channel === "email" || parsed.channel === "push" || parsed.channel === "none"
          ? parsed.channel
          : DEFAULTS.channel,
    };
  } catch {
    return DEFAULTS;
  }
}

export default function SettingsNotifications() {
  const [prefs, setPrefs] = useState<Prefs>(read);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      /* storage unavailable: the choice simply does not persist */
    }
  }, [prefs]);

  const on = CATEGORIES.filter((c) => prefs[c.key]).length;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link to="/app/settings" className="btn btn-ghost -ml-2 !py-1.5 !text-xs">
        <ArrowLeft className="h-4 w-4" /> Settings
      </Link>

      <header>
        <p className="eyebrow">Settings</p>
        <h1 className="display mt-1 text-2xl sm:text-3xl">Notifications</h1>
        <p className="mt-2 text-sm text-[var(--text-low)]">
          Choose what you would want to hear about, and how.
        </p>
      </header>

      <SettingsNote>
        Nothing is delivered yet. This build has no server to send from, so these controls store a
        preference in this browser and nothing more. No email, push or message will arrive until the
        production backend is connected.
      </SettingsNote>

      <SettingsGroup icon={Bell} name="Categories" descriptor={`${on} of ${CATEGORIES.length} on`}>
        {CATEGORIES.map((c) => (
          <SettingsRow
            key={c.key}
            title={c.title}
            description={c.description}
            control={
              <Toggle
                checked={prefs[c.key]}
                label={c.title}
                onChange={(v) => setPrefs((p) => ({ ...p, [c.key]: v }))}
              />
            }
          />
        ))}
      </SettingsGroup>

      <SettingsGroup icon={Send} name="Delivery" descriptor="Stored only">
        <SelectRow
          label="Preferred channel"
          description="Where you would want these to land once delivery is live"
          value={prefs.channel}
          onChange={(channel) => setPrefs((p) => ({ ...p, channel }))}
          options={[
            { value: "email", label: "Email" },
            { value: "push", label: "Push" },
            { value: "none", label: "In app only" },
          ]}
        />
        <SettingsRow
          title="Delivery status"
          description="Reported honestly, and updated when the backend ships"
          control={<span className="chip chip-warn">Not connected</span>}
        />
      </SettingsGroup>

      <p className="pb-2 text-center text-[11px] leading-relaxed text-[var(--text-low)]">
        Preferences are saved under {KEY} in this browser. Clearing site data resets them to the
        defaults.
      </p>
    </div>
  );
}
