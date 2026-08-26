import { useEffect, useRef, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, Command, Search } from "lucide-react";
import {
  AtlasIcon,
  AtlasResults,
  atlasOptionId,
  surfaceDirectory,
  useAtlas,
} from "@/features/atlas";
import { Systems } from "@/features/engagement";
import { useMarket } from "@/hooks/useMarket";

/**
 * Atlas as a place rather than a launcher.
 *
 * The overlay answers a member who already knows what they want. This page
 * answers the one who does not: with nothing typed it lays the whole product
 * out by area, one line each on what a surface is for, so the shape of the
 * thing can be read rather than recalled. Type anything and it becomes the
 * same ranked list the launcher shows, from the same index.
 *
 * Systems sits at the foot of it. A member who has come to the index of the
 * product to work out where something is, is often the member wondering
 * whether it is working at all, and Systems reports only what this browser
 * has actually observed. The market reading is taken from the same shared
 * fetch the ticker in the shell already runs, so mounting it here costs no
 * extra request.
 */

const LIST_ID = "atlas-page-list";
const INPUT_ID = "atlas-page-input";

export default function Atlas() {
  const navigate = useNavigate();
  // No hotkeys here: this page is the index, so summoning the launcher on top
  // of it would only cover what the member came for.
  const atlas = useAtlas({ hotkeys: false, limit: 40, onSelect: (entry) => navigate(entry.to) });
  const { query, setQuery, groups, active, setActive, select, onKeyDown } = atlas;

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  // Keep the selected row in view as the keys walk it, but never on first
  // paint: on a phone the list starts below the fold, and scrolling to row one
  // on arrival would push the heading the member just opened off the screen.
  const settled = useRef(false);
  useEffect(() => {
    if (!settled.current) {
      settled.current = true;
      return;
    }
    if (active < 0) return;
    document.getElementById(atlasOptionId(LIST_ID, active))?.scrollIntoView({ block: "nearest" });
  }, [active, query]);

  // Undefined while the first fetch is still out, so Systems can say it is
  // waiting rather than reporting a failure that has not happened.
  const market = useMarket();
  const marketOk = market.loading ? undefined : market.coins.length > 0 && !market.stale;

  const searching = query.trim().length > 0;
  const areas = surfaceDirectory();
  const activeId = active >= 0 ? atlasOptionId(LIST_ID, active) : undefined;

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Index</p>
        <h1 className="display mt-1 text-2xl sm:text-3xl">Atlas</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--text-low)]">
          Every surface, every rung of the ladder, the actions you take most, and everything
          published to Signal. One index over the whole product.
        </p>
      </header>

      <div className="inset flex items-center gap-2.5 px-3.5 py-3 focus-within:border-[var(--accent)]">
        <Search className="h-4 w-4 shrink-0 text-[var(--text-low)]" aria-hidden="true" />
        <label htmlFor={INPUT_ID} className="sr-only">
          Search Atlas
        </label>
        <input
          id={INPUT_ID}
          ref={inputRef}
          type="text"
          role="combobox"
          // The list is on the page whether or not anything is typed, because
          // an empty query still ranks the curated set.
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
      </div>

      {searching ? (
        <AtlasResults
          groups={groups}
          query={query}
          active={active}
          listId={LIST_ID}
          onActivate={setActive}
          onSelect={(entry) => select(entry)}
        />
      ) : (
        <>
          <section className="band">
            <div className="band-head">
              <span className="band-title">Suggested</span>
              <span className="hairline" />
            </div>
            <div className="mt-4">
              <AtlasResults
                groups={groups}
                query={query}
                active={active}
                listId={LIST_ID}
                onActivate={setActive}
                onSelect={(entry) => select(entry)}
              />
            </div>
          </section>

          <section className="band">
            <div className="band-head">
              <span className="band-title">Directory</span>
              <span className="hairline" />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {areas.map((area) => (
                <div key={area.id} className="panel p-4 sm:p-5">
                  <p className="eyebrow">{area.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--text-low)]">
                    {area.blurb}
                  </p>
                  <div className="mt-3 space-y-0.5">
                    {area.entries.map((entry) => (
                      <Link
                        key={entry.id}
                        to={entry.to}
                        className="group flex items-start gap-3 rounded-xl border border-transparent px-2.5 py-2.5 transition-colors hover:border-[var(--line)] hover:bg-[rgba(46,139,255,0.05)]"
                      >
                        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--line)] bg-[rgba(46,139,255,0.07)]">
                          <AtlasIcon
                            name={entry.icon}
                            className="h-4 w-4 text-[var(--accent-hi)]"
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-[var(--text-hi)]">
                            {entry.title}
                          </span>
                          {entry.subtitle && (
                            <span className="mt-0.5 block text-xs leading-relaxed text-[var(--text-low)]">
                              {entry.subtitle}
                            </span>
                          )}
                        </span>
                        <ChevronRight
                          className="mt-1.5 h-4 w-4 shrink-0 text-[var(--text-low)] transition-colors group-hover:text-[var(--accent-hi)]"
                          aria-hidden="true"
                        />
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <aside className="panel flex items-start gap-3 p-4 sm:items-center sm:p-5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--line-hi)] bg-[rgba(46,139,255,0.08)]">
            <Command
              className="h-4 w-4 text-[var(--accent-hi)]"
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </span>
          <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-[var(--text-mid)]">
            <span className="font-semibold text-[var(--text-hi)]">Keyboard.</span> Atlas opens
            anywhere in the product with <Key>⌘</Key> <Key>K</Key> on a Mac, or <Key>Ctrl</Key>{" "}
            <Key>K</Key> elsewhere. Press <Key>/</Key> when you are not already typing to do the
            same.
          </p>
        </aside>

        <Systems marketOk={marketOk} />
      </div>
    </div>
  );
}

function Key({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[1.35rem] items-center justify-center rounded-md border border-[var(--line-hi)] bg-[rgba(5,7,15,0.6)] px-1 py-0.5 font-[inherit] text-[10px] font-semibold text-[var(--text-mid)]">
      {children}
    </kbd>
  );
}
