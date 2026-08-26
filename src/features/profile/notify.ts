/**
 * Notification preferences: the shape, the defaults and the reading of them.
 *
 * Held here rather than inside the notifications screen because the settings
 * hub reports what is switched on, and two copies of the same shape drift the
 * moment a category is added. One definition, two readers.
 *
 * Nothing in this build delivers a notification. There is no server to send
 * from, so what these preferences do today is record an intention that can be
 * honoured the moment delivery exists. The screen says so plainly.
 */

export const NOTIFY_KEY = "rgl_notify_prefs";

export type NotifyCategoryId =
  | "maturity"
  | "claims"
  | "tierProgress"
  | "settlement"
  | "signalPosts"
  | "productUpdates";

export type NotifyChannel = "email" | "push" | "none";
export type NotifyDigest = "instant" | "daily" | "weekly";

export type NotifyPrefs = Record<NotifyCategoryId, boolean> & {
  channel: NotifyChannel;
  digest: NotifyDigest;
  quietHours: boolean;
  /** Hour of day, 0 to 23, when quiet hours begin and end. */
  quietFrom: number;
  quietTo: number;
};

export const NOTIFY_CATEGORIES: {
  id: NotifyCategoryId;
  title: string;
  description: string;
}[] = [
  {
    id: "maturity",
    title: "Vault maturity",
    description: "When a 30 day term completes and principal is ready to settle",
  },
  {
    id: "claims",
    title: "Reward claims",
    description: "When accrued rewards are claimed into available cash",
  },
  {
    id: "tierProgress",
    title: "Tier progress",
    description: "When placed capital moves you onto the next rung of the ladder",
  },
  {
    id: "settlement",
    title: "Withdrawal settled",
    description: "When a withdrawal request reaches the settlement target for your tier",
  },
  {
    id: "signalPosts",
    title: "Signal posts",
    description: "When the desk publishes to the Signal channel",
  },
  {
    id: "productUpdates",
    title: "Product updates",
    description: "New vault terms, desk features and programme changes",
  },
];

export const NOTIFY_DEFAULTS: NotifyPrefs = {
  maturity: true,
  claims: true,
  tierProgress: true,
  settlement: true,
  signalPosts: false,
  productUpdates: false,
  channel: "email",
  digest: "instant",
  quietHours: false,
  quietFrom: 22,
  quietTo: 7,
};

function hour(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 23 ? v : fallback;
}

export function readNotifyPrefs(): NotifyPrefs {
  if (typeof window === "undefined") return NOTIFY_DEFAULTS;
  try {
    const raw = localStorage.getItem(NOTIFY_KEY);
    if (!raw) return NOTIFY_DEFAULTS;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out = { ...NOTIFY_DEFAULTS };
    for (const c of NOTIFY_CATEGORIES) {
      if (typeof parsed[c.id] === "boolean") out[c.id] = parsed[c.id] as boolean;
    }
    if (parsed.channel === "email" || parsed.channel === "push" || parsed.channel === "none") {
      out.channel = parsed.channel;
    }
    if (parsed.digest === "instant" || parsed.digest === "daily" || parsed.digest === "weekly") {
      out.digest = parsed.digest;
    }
    if (typeof parsed.quietHours === "boolean") out.quietHours = parsed.quietHours;
    out.quietFrom = hour(parsed.quietFrom, NOTIFY_DEFAULTS.quietFrom);
    out.quietTo = hour(parsed.quietTo, NOTIFY_DEFAULTS.quietTo);
    return out;
  } catch {
    return NOTIFY_DEFAULTS;
  }
}

export function writeNotifyPrefs(prefs: NotifyPrefs) {
  try {
    localStorage.setItem(NOTIFY_KEY, JSON.stringify(prefs));
  } catch {
    // A blocked store costs the preference across reloads and nothing else.
  }
}

/** How many categories are switched on, for the hub row. */
export function notifyOnCount(prefs: NotifyPrefs): number {
  return NOTIFY_CATEGORIES.filter((c) => prefs[c.id]).length;
}
