import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Bell, BellRing, Moon, Send } from "lucide-react";
import {
  SelectRow,
  SettingsBlock,
  SettingsGroup,
  SettingsNote,
  SettingsRow,
} from "@/components/system/SettingsUI";
import {
  NOTIFY_CATEGORIES,
  NOTIFY_KEY,
  Switch,
  notifyOnCount,
  readNotifyPrefs,
  writeNotifyPrefs,
  type NotifyPrefs,
} from "@/features/profile";

/**
 * Notification preferences.
 *
 * Nothing is delivered from this build: there is no server holding an address
 * to send to. What this screen does is record the choice so it can be honoured
 * the moment delivery exists, and prove one thing that is real, which is
 * whether this browser will show a notification at all. The permission state
 * and the test notification are genuine; everything else is a stored intention
 * and says so.
 */

const HOURS = Array.from({ length: 24 }, (_, h) => ({
  value: String(h),
  label: new Date(2020, 0, 1, h).toLocaleTimeString("en-US", { hour: "numeric" }),
}));

type Permission = NotificationPermission | "unsupported";

function readPermission(): Permission {
  // Two checks rather than one: some browsers carry the name without the API
  // behind it, and reading `permission` on those throws.
  if (typeof window === "undefined" || typeof Notification === "undefined") return "unsupported";
  try {
    return Notification.permission;
  } catch {
    return "unsupported";
  }
}

const PERMISSION_COPY: Record<Permission, string> = {
  granted: "This browser will show a notification when the app asks it to.",
  denied:
    "This browser is refusing notifications for this site. Only your browser settings can change that, not this page.",
  default: "This browser has not been asked yet.",
  unsupported: "This browser does not support notifications at all.",
};

const PERMISSION_CHIP: Record<Permission, string> = {
  granted: "chip chip-gain",
  denied: "chip",
  default: "chip chip-warn",
  unsupported: "chip",
};

export default function SettingsNotifications() {
  const [prefs, setPrefs] = useState<NotifyPrefs>(readNotifyPrefs);
  const [permission, setPermission] = useState<Permission>(readPermission);

  useEffect(() => {
    writeNotifyPrefs(prefs);
  }, [prefs]);

  const on = notifyOnCount(prefs);
  const patch = (p: Partial<NotifyPrefs>) => setPrefs((current) => ({ ...current, ...p }));

  const ask = async () => {
    if (permission === "unsupported") return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") toast.success("Your browser will now show notifications");
      else if (result === "denied") toast.error("Your browser refused notifications for this site");
    } catch {
      toast.error("This browser would not answer the permission request");
    }
  };

  const test = async () => {
    const body = "Sent by this tab, not by a server. This is what one would look like.";
    try {
      // A service worker registration is the only way some mobile browsers will
      // show one, so it is preferred when there is one to use.
      const registration = await navigator.serviceWorker?.getRegistration?.();
      if (registration?.showNotification) await registration.showNotification("Rigel", { body });
      else new Notification("Rigel", { body });
      toast.success("Test notification handed to your browser");
    } catch {
      toast.error("Your browser refused to show it");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link to="/app/settings" className="btn btn-ghost -ml-2 !py-1.5 !text-xs">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Settings
      </Link>

      <header>
        <p className="eyebrow">Settings</p>
        <h1 className="display mt-1 text-2xl sm:text-3xl">Notifications</h1>
        <p className="mt-2 max-w-prose text-sm text-[var(--text-low)]">
          What you would want to hear about, and how. Stored now, honoured when there is something
          to send it with.
        </p>
      </header>

      <SettingsNote>
        Nothing is delivered from this build. There is no server holding an address, so these
        controls record a preference in this browser and nothing more. No email, push or message
        will arrive until a backend exists to send it.
      </SettingsNote>

      {/* ── What this browser can actually do ───────────────────────────── */}
      <SettingsGroup
        icon={BellRing}
        name="This browser"
        descriptor={permission === "granted" ? "ALLOWED" : permission.toUpperCase()}
      >
        <SettingsRow
          title="Notification permission"
          description={PERMISSION_COPY[permission]}
          control={
            <span className={PERMISSION_CHIP[permission]}>
              {permission === "default" ? "Not asked" : permission}
            </span>
          }
        />
        <SettingsBlock>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={() => void ask()}
              disabled={permission !== "default"}
              className="btn btn-secondary min-h-[44px] flex-1"
            >
              <Bell className="h-4 w-4" aria-hidden="true" /> Ask for permission
            </button>
            <button
              type="button"
              onClick={() => void test()}
              disabled={permission !== "granted"}
              className="btn btn-outline min-h-[44px] flex-1"
            >
              <Send className="h-4 w-4" aria-hidden="true" /> Show a test notification
            </button>
          </div>
          <p className="mt-2.5 text-xs leading-relaxed text-[var(--text-low)]">
            The test is drawn by this tab while it is open. It proves your browser will display one.
            It does not mean Rigel can reach you when this tab is closed, because nothing is
            scheduled and there is no server to schedule it.
          </p>
        </SettingsBlock>
      </SettingsGroup>

      {/* ── Categories ──────────────────────────────────────────────────── */}
      <SettingsGroup
        icon={Bell}
        name="Categories"
        descriptor={`${on} of ${NOTIFY_CATEGORIES.length} on`}
      >
        {NOTIFY_CATEGORIES.map((c) => (
          <SettingsRow
            key={c.id}
            title={c.title}
            description={c.description}
            controlId={`notify-${c.id}`}
            control={
              <Switch
                id={`notify-${c.id}`}
                checked={prefs[c.id]}
                label={c.title}
                onChange={(v) => patch({ [c.id]: v } as Partial<NotifyPrefs>)}
              />
            }
          />
        ))}
        {/* The two events worth being told about both happen while nobody is
            looking, and this build cannot tell anyone. Saying so here is more
            use than a switch that stores an intention. */}
        <SettingsBlock>
          <p className="text-xs leading-relaxed text-[var(--text-low)]">
            Two of these matter more than the rest and neither can reach you today. A term matures
            on a date fixed when it opened, and it earns nothing from that moment until you act. A
            relay does not run in the background either: it fires the next time you open Rigel,
            never while the app is closed and never backdated, so a relay that came due last week
            has been sitting still since then. Until delivery exists, the withdrawal calendar on{" "}
            <Link
              to="/app/horizon"
              className="text-[var(--accent-hi)] underline underline-offset-2"
            >
              Horizon
            </Link>{" "}
            is the only thing that will tell you a date is coming.
          </p>
        </SettingsBlock>
      </SettingsGroup>

      {/* ── Delivery ────────────────────────────────────────────────────── */}
      <SettingsGroup icon={Send} name="Delivery" descriptor="Stored only">
        <SelectRow
          label="Preferred channel"
          description="Where these would land once delivery exists"
          value={prefs.channel}
          onChange={(channel) => patch({ channel })}
          options={[
            { value: "email", label: "Email" },
            { value: "push", label: "Push" },
            { value: "none", label: "In app only" },
          ]}
        />
        <SelectRow
          label="Grouping"
          description="One message per event, or a single summary"
          value={prefs.digest}
          onChange={(digest) => patch({ digest })}
          options={[
            { value: "instant", label: "As it happens" },
            { value: "daily", label: "Daily summary" },
            { value: "weekly", label: "Weekly summary" },
          ]}
        />
        <SettingsRow
          title="Delivery status"
          description="Reported honestly, and updated when a backend ships"
          control={<span className="chip chip-warn">Not connected</span>}
        />
      </SettingsGroup>

      {/* ── Quiet hours ─────────────────────────────────────────────────── */}
      <SettingsGroup icon={Moon} name="Quiet hours" descriptor={prefs.quietHours ? "ON" : "OFF"}>
        <SettingsRow
          title="Hold messages overnight"
          description="Anything raised inside the window would wait until it closes"
          controlId="quiet-hours"
          control={
            <Switch
              id="quiet-hours"
              checked={prefs.quietHours}
              label="Quiet hours"
              onChange={(quietHours) => patch({ quietHours })}
            />
          }
        />
        {prefs.quietHours && (
          <>
            <SelectRow
              label="From"
              description="When the quiet window opens, in this device's time zone"
              value={String(prefs.quietFrom)}
              onChange={(v) => patch({ quietFrom: Number(v) })}
              options={HOURS}
            />
            <SelectRow
              label="Until"
              description="When it closes"
              value={String(prefs.quietTo)}
              onChange={(v) => patch({ quietTo: Number(v) })}
              options={HOURS}
            />
          </>
        )}
      </SettingsGroup>

      <p className="pb-2 text-center text-[11px] leading-relaxed text-[var(--text-low)]">
        Preferences are saved under <span className="machine">{NOTIFY_KEY}</span> in this browser.
        Clearing site data resets them to the defaults.
      </p>
    </div>
  );
}
