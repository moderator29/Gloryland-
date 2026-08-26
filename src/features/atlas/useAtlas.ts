import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { subscribe as subscribeFeed } from "@/domain/feed";
import {
  ATLAS_LIMIT,
  buildCatalog,
  flattenGroups,
  searchCatalog,
  type AtlasEntry,
  type AtlasGroup,
} from "./catalog";

/**
 * The state behind Atlas, shared by the launcher and the full route.
 *
 * The hook owns the query, the ranked rows and which row the keyboard is on.
 * It owns no focus and no DOM: when `open` is false it does nothing at all
 * beyond listening for the hotkey, so mounting the launcher in the shell can
 * never take focus away from the page underneath.
 */

export type AtlasOptions = {
  /**
   * Register Cmd/Ctrl+K and "/" on the window. The Atlas route turns this off,
   * because a launcher on top of the index it launches is a loop.
   */
  hotkeys?: boolean;
  limit?: number;
  /** Called after a row is chosen. The caller decides where that goes. */
  onSelect?: (entry: AtlasEntry) => void;
};

export type AtlasController = {
  open: boolean;
  setOpen: (open: boolean) => void;
  query: string;
  setQuery: (query: string) => void;
  groups: AtlasGroup[];
  /** The same rows as `groups`, flattened in render order. */
  entries: AtlasEntry[];
  /** Index into `entries`, clamped. -1 when there is nothing to select. */
  active: number;
  setActive: (index: number) => void;
  activeEntry: AtlasEntry | null;
  /** Choose a row: closes the launcher, then hands the entry to `onSelect`. */
  select: (entry: AtlasEntry) => void;
  onKeyDown: (event: KeyboardEvent) => void;
};

/** The id of one option row, so the input can point at it with aria. */
export function atlasOptionId(listId: string, index: number): string {
  return `${listId}-opt-${index}`;
}

/** Typing somewhere real, where a bare "/" belongs to the field and not to us. */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function wrap(index: number, count: number): number {
  return ((index % count) + count) % count;
}

export function useAtlas(options: AtlasOptions = {}): AtlasController {
  const { hotkeys = true, limit = ATLAS_LIMIT, onSelect } = options;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [rawActive, setRawActive] = useState(0);
  const [catalog, setCatalog] = useState<AtlasEntry[]>(() => buildCatalog());

  // Signal publishes through the day, so the index follows the store rather
  // than snapshotting it once and going stale on a long-lived tab.
  useEffect(() => {
    setCatalog(buildCatalog());
    return subscribeFeed(() => setCatalog(buildCatalog()));
  }, []);

  const groups = useMemo(() => searchCatalog(query, catalog, limit), [query, catalog, limit]);
  const entries = useMemo(() => flattenGroups(groups), [groups]);

  // Clamp on read rather than correcting with an effect, so the selection can
  // never be pointing past the end of a list that just shrank mid keystroke.
  const active = entries.length === 0 ? -1 : Math.min(Math.max(rawActive, 0), entries.length - 1);
  const activeEntry = active < 0 ? null : entries[active];

  // A new query is a new list. Reopening starts at the top for the same reason.
  useEffect(() => {
    setRawActive(0);
  }, [query, open]);

  const select = useCallback(
    (entry: AtlasEntry) => {
      setOpen(false);
      onSelect?.(entry);
    },
    [onSelect],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const count = entries.length;
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          if (count > 0) setRawActive(wrap(active + 1, count));
          break;
        case "ArrowUp":
          event.preventDefault();
          if (count > 0) setRawActive(wrap(active - 1, count));
          break;
        case "Home":
          event.preventDefault();
          setRawActive(0);
          break;
        case "End":
          event.preventDefault();
          setRawActive(Math.max(0, count - 1));
          break;
        case "Enter": {
          // An IME candidate list uses Enter to commit. Stealing it there would
          // navigate on a half typed word.
          if (event.nativeEvent.isComposing) break;
          if (!activeEntry) break;
          event.preventDefault();
          select(activeEntry);
          break;
        }
        case "Escape":
          setOpen(false);
          break;
        default:
          break;
      }
    },
    [entries.length, active, activeEntry, select],
  );

  useEffect(() => {
    if (!hotkeys || typeof window === "undefined") return;

    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && (event.key === "k" || event.key === "K")) {
        event.preventDefault();
        setOpen((wasOpen) => !wasOpen);
        return;
      }
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      // "/" is the second way in, and it only belongs to Atlas when the
      // keystroke is not already going into a field.
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        if (isTyping(event.target)) return;
        event.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hotkeys]);

  return {
    open,
    setOpen,
    query,
    setQuery,
    groups,
    entries,
    active,
    setActive: setRawActive,
    activeEntry,
    select,
    onKeyDown,
  };
}
