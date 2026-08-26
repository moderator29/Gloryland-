/**
 * What this build has written to local storage, measured rather than assumed.
 *
 * Two surfaces need this: Security lists it key by key, and the settings hub
 * shows the total on its Security row. Both read the same measurement, so the
 * two screens can never disagree about how much is stored.
 */

export type StoredKey = {
  key: string;
  bytes: number;
  /** What the key is for, in the member's terms. */
  purpose: string;
  /** False when this build has no description on file for the key. */
  recognised: boolean;
};

export type StorageReading = {
  /** False when the browser refuses local storage entirely. */
  readable: boolean;
  keys: StoredKey[];
  bytes: number;
};

/**
 * Every key this product writes, and why. Kept as one list because a member
 * reading a storage inspector deserves an answer for each line rather than a
 * screen of opaque identifiers.
 */
const PURPOSE: Record<string, string> = {
  rgl_ledger_v1: "Your ledger: every vault opened, reward claimed, position closed and withdrawal",
  rgl_member_v2: "Your handle, display name and stated approach",
  rgl_member_v1: "Your name from the first build, kept until it is upgraded",
  rgl_handles_v1: "Handles already claimed in this browser",
  rgl_circle_v1: "An invite code you arrived with, and joins recorded here",
  rgl_cadence_v1: "The days this browser has opened Rigel, for the day count",
  rgl_motion_v1: "Motion level",
  rgl_display_v1: "Density and transparency",
  rgl_muted: "Whether interface sound is on",
  rgl_ambient: "Whether the ambient tone is on",
  rgl_notify_prefs: "Which notifications you would want, once there is anything to send them",
  rgl_feed_posts_v1: "Signal posts this browser has seen",
  rgl_feed_likes_v1: "Signal posts you liked",
  rgl_feed_bookmarks_v1: "Signal posts you saved",
  rgl_market_v2: "The last market prices fetched, so a reload is not blank",
  rgl_deposits_v1: "Deposit records from the first build",
  rgl_withdrawals_v1: "Withdrawal records from the first build",
  rgl_plans_v1: "Plans from the first build",
  rgl_arrange_v1: "The order you put your Home sections in",
  rgl_sidebar_collapsed: "Whether the sidebar is collapsed",
  rgl_aperture_v1: "That the opening animation has played",
  rgl_orientation_v1: "How far through orientation you are",
  rgl_orientation_dismissed: "That orientation was dismissed",
  rgl_install_dismissed: "That the install prompt was dismissed",
  rgl_local_notice_dismissed: "That the local storage notice was dismissed",
  rgl_welcome_v1: "That the welcome has been seen",
};

function purposeOf(key: string): { purpose: string; recognised: boolean } {
  const known = PURPOSE[key];
  if (known) return { purpose: known, recognised: true };
  if (key.startsWith("rgl_ai_")) {
    return { purpose: "A Copilot or Support conversation held in this browser", recognised: true };
  }
  if (key.startsWith("rgl_")) {
    return { purpose: "Written by Rigel, no description on file for this key", recognised: false };
  }
  return { purpose: "Not written by Rigel", recognised: false };
}

/**
 * Measure local storage, key by key, largest first.
 *
 * Sizes are the characters stored counted as two bytes each, which is how a
 * browser bills UTF-16 against its quota. This measures one store, not the
 * whole origin: the browser's own estimate covers caches and databases too, so
 * the two figures are shown separately and never added together.
 */
export function measureStorage(): StorageReading {
  if (typeof window === "undefined") return { readable: false, keys: [], bytes: 0 };
  try {
    const keys: StoredKey[] = [];
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key === null) continue;
      const value = localStorage.getItem(key) ?? "";
      const size = (key.length + value.length) * 2;
      total += size;
      const { purpose, recognised } = purposeOf(key);
      keys.push({ key, bytes: size, purpose, recognised });
    }
    keys.sort((a, b) => b.bytes - a.bytes);
    return { readable: true, keys, bytes: total };
  } catch {
    // A private window or a locked down profile lands here. That is a real
    // state to report, not an error to swallow: nothing persists at all.
    return { readable: false, keys: [], bytes: 0 };
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
