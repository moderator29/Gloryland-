import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { AtlasResults } from "./Results";
import { atlasOptionId, useAtlas, type AtlasController } from "./useAtlas";

/**
 * The Atlas launcher.
 *
 * This is the one overlay in the product that earns itself. Every other
 * surface here is a place a member goes and stays; this one is a way of
 * leaving, summoned over whatever they were already reading and gone the
 * moment it has answered. Covering the page is the point, because the page is
 * what they are trying to get away from.
 *
 * Because it takes the whole screen it has to give it back cleanly: focus goes
 * to the field on open and back to whatever held it on close, Tab cannot
 * escape the dialog, the page behind cannot scroll, and closing leaves no
 * listener and no locked body behind it.
 */

const LIST_ID = "atlas-palette-list";
const INPUT_ID = "atlas-palette-input";
const TITLE_ID = "atlas-palette-title";

export type PaletteProps = {
  /**
   * An existing controller, for a shell that wants its own trigger to open
   * the launcher. Left out, the launcher owns its state and answers Cmd/Ctrl+K
   * and "/" on its own. A caller passing one owns navigation through the
   * controller's `onSelect`.
   */
  atlas?: AtlasController;
};

export function Palette({ atlas }: PaletteProps = {}) {
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  // A hook cannot be called conditionally, so the internal controller always
  // exists. When one is passed in, this one holds no hotkey and is never read.
  const own = useAtlas({ hotkeys: !atlas, onSelect: (entry) => navigate(entry.to) });
  const controller = atlas ?? own;
  const { open, setOpen, query, setQuery, groups, active, setActive, select, onKeyDown } =
    controller;

  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    restoreRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Focus after paint, or the spring entrance scrolls the field under the
    // caret on the way in.
    const frame = requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Capture phase, so the trap holds even over a component that handles Tab.
    const onTab = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;

      const focusable = Array.from(
        root.querySelectorAll<HTMLElement>("a[href], button, input, select, textarea, [tabindex]"),
      ).filter((el) => el.tabIndex >= 0 && !el.hasAttribute("disabled"));

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;
      const inside = current instanceof Node && root.contains(current);

      if (event.shiftKey && (!inside || current === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!inside || current === last)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onTab, true);

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onTab, true);
      // Where the member was before they reached for the launcher. A detached
      // element after a navigation simply ignores this.
      restoreRef.current?.focus({ preventScroll: true });
      restoreRef.current = null;
    };
  }, [open]);

  // Keep the selected row in the scroll box as the keys walk down the list.
  useEffect(() => {
    if (!open || active < 0) return;
    document.getElementById(atlasOptionId(LIST_ID, active))?.scrollIntoView({ block: "nearest" });
  }, [open, active, query]);

  if (typeof document === "undefined") return null;

  const activeId = active >= 0 ? atlasOptionId(LIST_ID, active) : undefined;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-[rgba(5,7,15,0.72)] backdrop-blur-md"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.16 }}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={TITLE_ID}
            className="raised fixed inset-x-3 top-[6vh] z-[70] mx-auto flex max-h-[82vh] max-w-2xl flex-col overflow-hidden rounded-2xl sm:inset-x-6 sm:top-[10vh]"
            initial={reduce ? false : { opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: -6, scale: 0.99 }}
            transition={
              reduce ? { duration: 0 } : { type: "spring", stiffness: 430, damping: 34, mass: 0.7 }
            }
          >
            <h2 id={TITLE_ID} className="sr-only">
              Atlas
            </h2>

            <div className="flex items-center gap-2.5 border-b border-[var(--line)] px-3.5 py-3">
              <Search className="h-4 w-4 shrink-0 text-[var(--text-low)]" aria-hidden="true" />
              <label htmlFor={INPUT_ID} className="sr-only">
                Search Atlas
              </label>
              <input
                id={INPUT_ID}
                ref={inputRef}
                type="text"
                role="combobox"
                aria-expanded
                aria-controls={LIST_ID}
                aria-activedescendant={activeId}
                aria-autocomplete="list"
                autoComplete="off"
                spellCheck={false}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Surfaces, tiers, actions, Signal"
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--text-hi)] outline-none placeholder:text-[var(--text-low)]"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close Atlas"
                className="min-h-[36px] btn btn-ghost shrink-0 !px-2 !py-1.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="no-bar min-h-0 flex-1 overflow-y-auto p-2">
              <AtlasResults
                groups={groups}
                query={query}
                active={active}
                listId={LIST_ID}
                dense
                onActivate={setActive}
                onSelect={(entry) => select(entry)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[var(--line)] px-3.5 py-2.5">
              <Legend keys={["↑", "↓"]} label="navigate" />
              <Legend keys={["↵"]} label="open" />
              <Legend keys={["esc"]} label="close" />
              <span className="eyebrow ml-auto hidden sm:block">Atlas</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function Legend({ keys, label }: { keys: string[]; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-low)]">
      <span className="flex gap-1">
        {keys.map((key) => (
          <kbd
            key={key}
            className="tabular inline-flex min-w-[1.35rem] items-center justify-center rounded-md border border-[var(--line-hi)] bg-[rgba(5,7,15,0.6)] px-1 py-0.5 font-[inherit] text-[10px] font-semibold text-[var(--text-mid)]"
          >
            {key}
          </kbd>
        ))}
      </span>
      {label}
    </span>
  );
}
