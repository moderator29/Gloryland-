/**
 * Two display preferences that the design system cannot express on its own:
 * how tightly rows are packed, and whether the floating surfaces are allowed
 * to be see through.
 *
 * Both are applied by stamping an attribute on the document element and letting
 * one small stylesheet key off it. That stylesheet is injected once, holds
 * nothing but overrides gated behind those attributes, and therefore changes
 * exactly nothing until a member asks for it. Motion already works this way
 * through `data-motion`, so this follows the pattern rather than inventing one.
 *
 * Stored in this browser under `rgl_display_v1`, like every other preference in
 * this build.
 */

import { useCallback, useEffect, useState } from "react";

const KEY = "rgl_display_v1";
const STYLE_ID = "rgl-display-prefs";

export type Density = "comfortable" | "compact";
export type Transparency = "full" | "reduced";

export type DisplayPrefs = {
  density: Density;
  transparency: Transparency;
};

export const DISPLAY_DEFAULTS: DisplayPrefs = {
  density: "comfortable",
  transparency: "full",
};

/* ── the overrides ───────────────────────────────────────────────────────── */

/**
 * Compact tightens the two row rhythms the product is built from, and closes
 * the gaps between bento cells. Row heights stay at or above 48px, so a denser
 * list is still a list a thumb can hit.
 *
 * Reduced transparency drops the blur and paints the floating surfaces solid.
 * Blur is the most expensive thing on the page and the hardest to read text
 * through, so this is both an accessibility control and the fastest the app
 * gets on an older phone. The stride and the grain go with it, since both exist
 * to make a translucent surface look lit.
 */
const CSS = `
:root[data-density="compact"] .rail-row{min-height:48px;padding-top:.5rem;padding-bottom:.5rem}
:root[data-density="compact"] .rail-stat{min-height:44px;padding-top:.5rem;padding-bottom:.5rem}
:root[data-density="compact"] .bento{gap:.625rem}
:root[data-density="compact"] .band{padding-top:1rem}
@media (min-width:1024px){:root[data-density="compact"] .bento{gap:.75rem}:root[data-density="compact"] .lede{gap:2rem}}
:root[data-transparency="reduced"] .glass,
:root[data-transparency="reduced"] .raised{backdrop-filter:none;-webkit-backdrop-filter:none}
:root[data-transparency="reduced"] .glass{background:var(--ink-100)}
:root[data-transparency="reduced"] .raised{background:var(--ink-200)}
:root[data-transparency="reduced"] .glass::before,
:root[data-transparency="reduced"] .glass::after,
:root[data-transparency="reduced"] .grain::after{display:none}
`;

function ensureStylesheet() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = CSS;
  document.head.appendChild(el);
}

/* ── storage ─────────────────────────────────────────────────────────────── */

export function readDisplayPrefs(): DisplayPrefs {
  if (typeof window === "undefined") return DISPLAY_DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DISPLAY_DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<DisplayPrefs>;
    return {
      density: parsed.density === "compact" ? "compact" : "comfortable",
      transparency: parsed.transparency === "reduced" ? "reduced" : "full",
    };
  } catch {
    return DISPLAY_DEFAULTS;
  }
}

/** Put the preferences into effect. Safe to call as often as you like. */
export function applyDisplayPrefs(prefs: DisplayPrefs) {
  if (typeof document === "undefined") return;
  ensureStylesheet();
  const root = document.documentElement;
  root.dataset.density = prefs.density;
  root.dataset.transparency = prefs.transparency;
}

/** Read what is stored and apply it. The one call a startup path needs. */
export function applyStoredDisplayPrefs() {
  applyDisplayPrefs(readDisplayPrefs());
}

const listeners = new Set<(p: DisplayPrefs) => void>();

function writeDisplayPrefs(prefs: DisplayPrefs) {
  applyDisplayPrefs(prefs);
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // A blocked store costs persistence across reloads, never the current
    // session: the attributes are already on the document.
  }
  listeners.forEach((fn) => fn(prefs));
}

/* ── the hook the screens use ────────────────────────────────────────────── */

export function useDisplayPrefs(): [DisplayPrefs, (patch: Partial<DisplayPrefs>) => void] {
  const [prefs, setPrefs] = useState<DisplayPrefs>(readDisplayPrefs);

  // Applied on mount so a surface that reads the preference also honours it,
  // and so the appearance screen previews against the real document.
  useEffect(() => {
    applyDisplayPrefs(prefs);
  }, [prefs]);

  useEffect(() => {
    const fn = (p: DisplayPrefs) => setPrefs(p);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);

  const update = useCallback((patch: Partial<DisplayPrefs>) => {
    setPrefs((current) => {
      const next = { ...current, ...patch };
      writeDisplayPrefs(next);
      return next;
    });
  }, []);

  return [prefs, update];
}
