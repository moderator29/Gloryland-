import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  Clock,
  Database,
  Download,
  Eye,
  HardDrive,
  KeyRound,
  LogOut,
  Monitor,
  RefreshCw,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import { clearLedger } from "@/domain/ledger";
import { useLedger } from "@/hooks/useLedger";
import { useArmedAction } from "@/hooks/useArmedAction";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { SettingsBlock, SettingsGroup, SettingsNote } from "@/components/system/SettingsUI";
import { fullDate } from "@/components/system/format";
import {
  ConfirmErase,
  formatBytes,
  measureStorage,
  useMemberIdentity,
  type StorageReading,
} from "@/features/profile";

/**
 * Security: an account of what this build actually does with the member's data,
 * written to be checkable rather than reassuring.
 *
 * Everything on this page is read from the browser when the page opens. The
 * storage figures are measured key by key, the device readout is whatever
 * `navigator` reports, and the session clock starts from the document's own
 * time origin. Nothing is fetched and nothing is sent.
 *
 * What the page must never do is claim a protection that does not exist. There
 * is no encryption here, no passcode, no second factor and no custody of funds,
 * so the copy says exactly that. A page that implied otherwise would be the
 * most dangerous surface in the product.
 */

/* ── device ──────────────────────────────────────────────────────────────── */

type Reading = { label: string; value: string; note?: string };

/** Fields some browsers expose and the type definitions do not carry. */
type ExtendedNavigator = Navigator & {
  deviceMemory?: number;
  userAgentData?: { platform?: string; brands?: { brand: string; version: string }[] };
};

/**
 * The browser's name from its own user agent string.
 *
 * A guess, and labelled as one on the page. User agent strings are written to
 * be mistaken for each other, so the raw string is printed underneath and the
 * derived name is never treated as a fact about the device.
 */
function browserFromUA(ua: string): string {
  if (/\bEdg\//.test(ua)) return "Edge";
  if (/\bOPR\/|\bOpera\b/.test(ua)) return "Opera";
  if (/\bFirefox\//.test(ua)) return "Firefox";
  if (/\bChrome\//.test(ua) && !/\bChromium\//.test(ua)) return "Chrome";
  if (/\bChromium\//.test(ua)) return "Chromium";
  if (/\bSafari\//.test(ua) && /\bVersion\//.test(ua)) return "Safari";
  return "Not recognised";
}

function readEnvironment(): Reading[] {
  if (typeof navigator === "undefined") return [];
  const nav = navigator as ExtendedNavigator;
  const ua = nav.userAgent ?? "";
  const out: Reading[] = [
    { label: "Browser", value: browserFromUA(ua), note: "Derived from the user agent string" },
    {
      label: "Platform",
      value: nav.userAgentData?.platform || "Not reported",
      note: nav.userAgentData?.platform ? undefined : "This browser does not report it",
    },
    { label: "Language", value: nav.language || "Not reported" },
    {
      label: "Time zone",
      value: Intl.DateTimeFormat().resolvedOptions().timeZone || "Not reported",
    },
    {
      label: "Screen",
      value:
        typeof window !== "undefined"
          ? `${window.screen.width} by ${window.screen.height} at ${window.devicePixelRatio}x`
          : "Not reported",
    },
    {
      label: "Touch points",
      value: typeof nav.maxTouchPoints === "number" ? String(nav.maxTouchPoints) : "Not reported",
    },
    {
      label: "Processor cores",
      value:
        typeof nav.hardwareConcurrency === "number"
          ? String(nav.hardwareConcurrency)
          : "Not reported",
    },
    {
      label: "Device memory",
      value: typeof nav.deviceMemory === "number" ? `${nav.deviceMemory} GB` : "Not reported",
      note: typeof nav.deviceMemory === "number" ? "Reported in bands, not exactly" : undefined,
    },
    { label: "Cookies allowed", value: nav.cookieEnabled ? "Yes" : "No" },
    { label: "Network", value: nav.onLine ? "Online" : "Offline" },
  ];
  return out;
}

/* ── session clock ───────────────────────────────────────────────────────── */

function duration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** When this document started loading, which is the honest session start. */
function sessionStart(): number {
  if (typeof performance !== "undefined" && Number.isFinite(performance.timeOrigin)) {
    return performance.timeOrigin;
  }
  return Date.now();
}

/**
 * The running session length, isolated in its own component.
 *
 * A clock that ticks once a second would otherwise re-render the whole page,
 * storage list included, sixty times a minute for one changing string. It also
 * stops while the tab is hidden, because a counter nobody is looking at is
 * only a cost.
 */
function SessionClock({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(() => Date.now() - startedAt);

  useEffect(() => {
    let id = 0;
    const tick = () => setElapsed(Date.now() - startedAt);
    const start = () => {
      stop();
      tick();
      id = window.setInterval(tick, 1000);
    };
    const stop = () => {
      if (id) window.clearInterval(id);
      id = 0;
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [startedAt]);

  return (
    <>
      <p className="metric mt-1.5 text-base tabular-nums">{duration(elapsed)}</p>
      <p className="mt-1 text-[11px] text-[var(--text-low)]">
        Counted in this tab. Closing it ends the session and nothing expires.
      </p>
    </>
  );
}

/* ── the surface ─────────────────────────────────────────────────────────── */

/** What the app does beyond this browser, stated rather than left implied. */
function offDeviceFacts(): Reading[] {
  const host = typeof window === "undefined" ? "" : window.location.hostname;
  const local = host === "localhost" || host === "127.0.0.1" || host.endsWith(".local");
  const analyticsLoaded = import.meta.env.PROD && !local;
  const sw =
    typeof navigator !== "undefined" && "serviceWorker" in navigator
      ? navigator.serviceWorker.controller
        ? "Running, caching the app shell"
        : "Supported, not currently controlling this page"
      : "Not supported by this browser";

  return [
    {
      label: "Your ledger",
      value: "Never leaves this browser",
      note: "There is no endpoint it is sent to",
    },
    {
      label: "Page analytics",
      value: analyticsLoaded ? "Loaded" : "Not loaded here",
      note: analyticsLoaded
        ? "Counts page views on the deployed site. It carries no ledger data."
        : "Only loaded on the deployed site, not in local preview",
    },
    { label: "Service worker", value: sw, note: "Caches files, never your data" },
    {
      label: "Market prices",
      value: "Fetched from a public price feed",
      note: "A request for prices. Nothing about you goes with it.",
    },
  ];
}

export default function Security() {
  const snap = useLedger();
  const member = useMemberIdentity();
  const reduce = useReducedMotion();
  const startedAt = useMemo(sessionStart, []);

  const [storage, setStorage] = useState<StorageReading>(() => measureStorage());
  const [estimate, setEstimate] = useState<{ usage: number; quota: number } | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [erasedAt, setErasedAt] = useState<number | null>(null);

  const environment = useMemo(readEnvironment, []);
  const offDevice = useMemo(offDeviceFacts, []);

  const remeasure = useCallback(() => setStorage(measureStorage()), []);

  // Re-read whenever the ledger changes, so the figure on screen is never one
  // action out of date.
  useEffect(() => {
    remeasure();
  }, [snap.events.length, remeasure]);

  // The browser's own account of the whole origin. Asynchronous and not
  // supported everywhere, so its absence is reported rather than filled in.
  useEffect(() => {
    let live = true;
    const store = typeof navigator === "undefined" ? undefined : navigator.storage;
    if (!store?.estimate) return;
    store
      .estimate()
      .then((e) => {
        if (!live) return;
        if (typeof e.usage === "number" && typeof e.quota === "number") {
          setEstimate({ usage: e.usage, quota: e.quota });
        }
      })
      .catch(() => {});
    store
      .persisted?.()
      .then((p) => live && setPersisted(p))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const [signOutArmed, requestSignOut] = useArmedAction(() => {
    member.logout();
    toast.success("Signed out. Your ledger stays in this browser.");
  });

  const erase = () => {
    clearLedger();
    setErasedAt(Date.now());
    remeasure();
    toast.success("Ledger erased. Every event is gone from this browser.");
  };

  const ledgerKey = storage.keys.find((k) => k.key === "rgl_ledger_v1");

  const rise = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.42, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/app/settings" className="min-h-[36px] btn btn-ghost -ml-2 !py-1.5 !text-xs">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Settings
      </Link>

      <motion.header {...rise(0)}>
        <p className="eyebrow">Account</p>
        <h1 className="display mt-1 text-2xl sm:text-3xl">Security</h1>
        <p className="mt-2 max-w-prose text-sm text-[var(--text-low)]">
          What this build holds, where it holds it, and what it does not protect. Everything below
          is read from your browser when this page opens.
        </p>
      </motion.header>

      {/* ── The three facts that matter most ────────────────────────────── */}
      <motion.section {...rise(1)} className="glass p-5 sm:p-6">
        <div className="band-head">
          <h2 className="band-title">Stated plainly</h2>
          <span className="hairline" aria-hidden="true" />
        </div>

        <ul className="mt-4 space-y-4">
          <li className="flex items-start gap-3">
            <KeyRound
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warn)]"
              strokeWidth={1.8}
              aria-hidden="true"
            />
            <p className="text-sm leading-relaxed text-[var(--text)]">
              <span className="font-semibold text-[var(--text-hi)]">
                There is no password and no account server.
              </span>{" "}
              Signing in claims a handle inside this browser. Anyone who can open this browser
              profile is already signed in as you, and there is nothing here to recover an account
              with.
            </p>
          </li>
          <li className="flex items-start gap-3">
            <Eye
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warn)]"
              strokeWidth={1.8}
              aria-hidden="true"
            />
            <p className="text-sm leading-relaxed text-[var(--text)]">
              <span className="font-semibold text-[var(--text-hi)]">
                Nothing stored here is encrypted.
              </span>{" "}
              Your ledger and preferences sit in local storage as plain text. Any extension or
              script able to run on this site can read them. This build has no passcode, no second
              factor and no device lock.
            </p>
          </li>
          <li className="flex items-start gap-3">
            <ShieldAlert
              className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warn)]"
              strokeWidth={1.8}
              aria-hidden="true"
            />
            <p className="text-sm leading-relaxed text-[var(--text)]">
              <span className="font-semibold text-[var(--text-hi)]">
                No card, no bank detail, no custody.
              </span>{" "}
              This build never asks for a payment instrument and holds no keys, so nothing on this
              device can move money. The figures in your ledger are a record of what you entered.
            </p>
          </li>
        </ul>
      </motion.section>

      {/* ── Storage ─────────────────────────────────────────────────────── */}
      <motion.div {...rise(2)}>
        <SettingsGroup
          icon={HardDrive}
          name="What is stored"
          descriptor={storage.readable ? formatBytes(storage.bytes) : "BLOCKED"}
        >
          <SettingsBlock>
            {!storage.readable ? (
              <p className="text-sm leading-relaxed text-[var(--text)]">
                This browser is refusing local storage, which is what a private window or a locked
                down profile does. Nothing persists: close the tab and everything you do here is
                gone.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="tag-micro">Measured in this browser</p>
                    <p className="metric mt-1.5 text-2xl">{formatBytes(storage.bytes)}</p>
                    <p className="mt-1 text-xs text-[var(--text-low)]">
                      Across {storage.keys.length} {storage.keys.length === 1 ? "key" : "keys"},
                      counted character by character
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={remeasure}
                    className="btn btn-outline min-h-[44px]"
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" /> Re-read
                  </button>
                </div>

                <div className="ledger mt-4">
                  {storage.keys.map((k) => (
                    <div key={k.key} className={`rail-row ${k.recognised ? "" : "rail-row-mute"}`}>
                      <span className="min-w-0 flex-1">
                        <span className="machine block truncate text-[var(--text-hi)]">
                          {k.key}
                        </span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-[var(--text-low)]">
                          {k.purpose}
                        </span>
                      </span>
                      <span className="tabular shrink-0 text-xs text-[var(--text-mid)]">
                        {formatBytes(k.bytes)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </SettingsBlock>

          <SettingsBlock>
            <p className="tag-micro">The browser&apos;s own estimate</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text)]">
              {estimate
                ? `${formatBytes(estimate.usage)} used of roughly ${formatBytes(estimate.quota)} available to this site. That figure covers everything the site stores, cached files included, so it is larger than the measurement above.`
                : "This browser does not report a storage estimate, so only the measurement above is available."}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[var(--text-low)]">
              {persisted === null
                ? "Whether this storage is protected from automatic clearing is not reported here."
                : persisted
                  ? "This browser has marked the storage as persistent, so it will not be cleared automatically to reclaim space."
                  : "This storage is not persistent. A browser short of space may clear it without asking, which is why an export is the only copy you can rely on."}
            </p>
          </SettingsBlock>
        </SettingsGroup>
      </motion.div>

      {/* ── Beyond this device ──────────────────────────────────────────── */}
      <motion.div {...rise(3)}>
        <SettingsGroup
          icon={Database}
          name="Leaving this device"
          descriptor="What does and does not"
        >
          {offDevice.map((r) => (
            <div key={r.label} className="rail-row">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-[var(--text-hi)]">{r.label}</span>
                {r.note && (
                  <span className="mt-0.5 block text-xs leading-relaxed text-[var(--text-low)]">
                    {r.note}
                  </span>
                )}
              </span>
              <span className="max-w-[9rem] shrink-0 text-right text-xs font-medium text-[var(--text-mid)]">
                {r.value}
              </span>
            </div>
          ))}
        </SettingsGroup>
      </motion.div>

      {/* ── Session ─────────────────────────────────────────────────────── */}
      <motion.div {...rise(4)}>
        <SettingsGroup
          icon={Clock}
          name="This session"
          descriptor={`SINCE ${new Date(startedAt).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })}`}
        >
          <SettingsBlock>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="inset p-3.5">
                <p className="tag-micro">Open since</p>
                <p className="metric mt-1.5 text-base">
                  {new Date(startedAt).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                <p className="mt-1 text-[11px] text-[var(--text-low)]">
                  {fullDate(startedAt)}, when this page started loading
                </p>
              </div>
              <div className="inset p-3.5">
                <p className="tag-micro">Elapsed</p>
                <SessionClock startedAt={startedAt} />
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-[var(--text)]">
              Signed in as{" "}
              <span className="font-semibold text-[var(--text-hi)]">{member.displayName}</span>
              {member.handle && (
                <span className="machine text-[var(--text-mid)]"> @{member.handle}</span>
              )}
              . There are no other sessions to end: this build has no server, so nothing is signed
              in anywhere else.
            </p>

            <button
              type="button"
              onClick={requestSignOut}
              aria-label={signOutArmed ? "Confirm sign out" : "Sign out"}
              className={`btn mt-3.5 min-h-[44px] ${signOutArmed ? "btn-danger" : "btn-outline"}`}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {signOutArmed ? "Tap again to sign out" : "Sign out"}
            </button>
            {signOutArmed && (
              <p className="mt-2 text-xs text-[var(--loss)]" role="alert">
                Signing out clears your handle from this browser. Your ledger stays where it is.
              </p>
            )}
          </SettingsBlock>
        </SettingsGroup>
      </motion.div>

      {/* ── Device ──────────────────────────────────────────────────────── */}
      <motion.div {...rise(5)}>
        <SettingsGroup icon={Monitor} name="This device" descriptor="Read from your browser">
          <SettingsBlock>
            <p className="text-xs leading-relaxed text-[var(--text-low)]">
              Values your browser makes available to any page you visit. They are shown here so you
              can see them, and they are not recorded anywhere.
            </p>
            <dl className="mt-3 grid gap-x-6 sm:grid-cols-2">
              {environment.map((r) => (
                <div key={r.label} className="rail-stat">
                  <dt className="tag-micro">{r.label}</dt>
                  <dd className="min-w-0 text-right">
                    <span className="block truncate text-sm font-medium text-[var(--text-hi)]">
                      {r.value}
                    </span>
                    {r.note && (
                      <span className="block text-[11px] text-[var(--text-low)]">{r.note}</span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </SettingsBlock>
          <SettingsBlock>
            <p className="tag-micro">User agent, as reported</p>
            <p className="machine mt-2 text-[var(--text-mid)]">
              {typeof navigator === "undefined" ? "Not available" : navigator.userAgent}
            </p>
          </SettingsBlock>
        </SettingsGroup>
      </motion.div>

      <SettingsNote>
        None of this is a security guarantee. It is a description of a browser-local build. Treat
        the ledger as you would any file on this device, and keep an export somewhere you control.
      </SettingsNote>

      {/* ── Erase ───────────────────────────────────────────────────────── */}
      <motion.div {...rise(6)}>
        <SettingsGroup
          icon={TriangleAlert}
          name="Erase the ledger"
          descriptor="Permanent"
          tone="danger"
        >
          <SettingsBlock>
            <ConfirmErase
              phrase="ERASE"
              actionLabel="Erase ledger"
              onConfirm={erase}
              disabled={snap.events.length === 0}
              disabledNote="Your ledger is already empty, so there is nothing to erase."
            >
              <p>
                This removes all {snap.events.length}{" "}
                {snap.events.length === 1 ? "event" : "events"} from{" "}
                <span className="machine text-[var(--text-hi)]">rgl_ledger_v1</span>
                {ledgerKey ? `, currently ${formatBytes(ledgerKey.bytes)}` : ""}. Every vault,
                claim, close and withdrawal goes with it, and every figure in the product is derived
                from those events, so all of them return to zero.
              </p>
              <p className="mt-2">
                It cannot be undone and there is no copy anywhere else. Your name, handle and
                preferences are left alone.
              </p>
            </ConfirmErase>

            <p className="mt-4">
              <Link to="/app/settings/data" className="btn btn-secondary min-h-[44px]">
                <Download className="h-4 w-4" aria-hidden="true" /> Export a copy first
              </Link>
            </p>

            {erasedAt !== null && (
              <p className="mt-3 text-xs text-[var(--gain)]" role="status">
                Ledger erased at{" "}
                {new Date(erasedAt).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  second: "2-digit",
                })}
                . Every derived figure is now zero.
              </p>
            )}
          </SettingsBlock>
        </SettingsGroup>
      </motion.div>
    </div>
  );
}
