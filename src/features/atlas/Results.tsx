import type { MouseEvent } from "react";
import { Link } from "react-router-dom";
import {
  AlignVerticalDistributeCenter,
  Banknote,
  Bell,
  BookOpen,
  CalendarRange,
  CandlestickChart,
  ChartLine,
  Clock,
  Coins,
  Compass,
  Database,
  FileText,
  Flag,
  Gift,
  Landmark,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  Medal,
  Palette as PaletteIcon,
  Plus,
  Radio,
  Receipt,
  Repeat,
  Route,
  Scale,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Terminal,
  Timer,
  TrendingUp,
  User,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import {
  flattenGroups,
  foldRange,
  KIND_CHIP,
  queryTokens,
  type AtlasEntry,
  type AtlasGroup,
} from "./catalog";
import { atlasOptionId } from "./useAtlas";

/**
 * The one result list in the product.
 *
 * The launcher and the Atlas route both render this, so ranking, row order,
 * highlighting and keyboard identity cannot drift apart between the two. Rows
 * are options inside a listbox and the search field keeps focus throughout,
 * which is the pattern a member's screen reader already knows from every
 * other command palette.
 *
 * Rows are still real links. An option that swallowed the href would take away
 * opening a surface in a new tab, so a modified click is left to the browser
 * and only a plain click is intercepted.
 */

const ICONS: Record<string, LucideIcon> = {
  AlignVerticalDistributeCenter,
  Banknote,
  Bell,
  BookOpen,
  CalendarRange,
  CandlestickChart,
  ChartLine,
  Clock,
  Coins,
  Compass,
  Database,
  FileText,
  Flag,
  Gift,
  Landmark,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  Medal,
  // Aliased at the import: Palette is also the name of the launcher.
  Palette: PaletteIcon,
  Plus,
  Radio,
  Receipt,
  Repeat,
  Route,
  Scale,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Terminal,
  Timer,
  TrendingUp,
  User,
  UsersRound,
};

/** The mark for one entry. Unknown names fall back rather than render nothing. */
export function AtlasIcon({ name, className = "" }: { name?: string; className?: string }) {
  const Icon = (name && ICONS[name]) || Compass;
  return <Icon className={className} strokeWidth={1.8} aria-hidden="true" />;
}

/**
 * The matched run of characters, marked on the accent tokens.
 *
 * The browser's own `mark` is a yellow highlighter, which would be the only
 * yellow in the product and would read as a warning. Matching runs through the
 * same fold the ranking used, so the mark sits on what actually matched even
 * when the member typed without the accents.
 */
function Highlight({ text, query }: { text: string; query: string }) {
  const range = matchRange(text, query);
  if (!range) return <>{text}</>;
  return (
    <>
      {text.slice(0, range.start)}
      <mark className="rounded-[3px] bg-[rgba(46,139,255,0.22)] px-0.5 text-[var(--accent-soft)]">
        {text.slice(range.start, range.end)}
      </mark>
      {text.slice(range.end)}
    </>
  );
}

/**
 * The whole phrase where it lands, otherwise the longest word that does.
 * Only the words the ranking actually searched on are candidates, so a query
 * written as a question never marks its own connective tissue.
 */
function matchRange(text: string, query: string): { start: number; end: number } | null {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const whole = foldRange(text, trimmed);
  if (whole) return whole;
  const tokens = [...queryTokens(query)].sort((a, b) => b.length - a.length);
  for (const token of tokens) {
    const range = foldRange(text, token);
    if (range) return range;
  }
  return null;
}

/** A plain left click is ours. Anything else is the browser opening a tab. */
function isPlainClick(event: MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export type AtlasResultsProps = {
  groups: AtlasGroup[];
  /** What was typed, used only to place the highlight. */
  query: string;
  /** Index into the flattened rows, or -1. */
  active: number;
  /** Id of the listbox, so a combobox field can point `aria-controls` at it. */
  listId: string;
  onSelect: (entry: AtlasEntry, index: number) => void;
  /** Pointer moved over a row. Lets the mouse take the selection from the keys. */
  onActivate?: (index: number) => void;
  /** Tighter rows, for the launcher where vertical room is scarce. */
  dense?: boolean;
  emptyHint?: string;
  className?: string;
};

export function AtlasResults({
  groups,
  query,
  active,
  listId,
  onSelect,
  onActivate,
  dense = false,
  emptyHint = "Nothing in Atlas matches that. Support can take the question directly.",
  className = "",
}: AtlasResultsProps) {
  // Row indices are read off the same flatten the hook keyboards through, so
  // the row the arrow keys land on is the row that lights up.
  const order = new Map(flattenGroups(groups).map((entry, index) => [entry.id, index]));

  return (
    <div className={className}>
      <div id={listId} role="listbox" aria-label="Atlas results" className="space-y-3">
        {groups.map((group) => (
          <div key={group.kind} role="group" aria-label={group.label}>
            <p className="eyebrow px-2.5 pb-1.5">{group.label}</p>
            <div className={dense ? "space-y-0.5" : "space-y-1"}>
              {group.entries.map((entry) => {
                const index = order.get(entry.id) ?? -1;
                const selected = index === active;
                return (
                  <Link
                    key={entry.id}
                    id={atlasOptionId(listId, index)}
                    to={entry.to}
                    role="option"
                    aria-selected={selected}
                    tabIndex={-1}
                    onMouseMove={() => onActivate?.(index)}
                    onClick={(event) => {
                      if (!isPlainClick(event)) return;
                      event.preventDefault();
                      onSelect(entry, index);
                    }}
                    className={`min-h-[36px] flex items-center gap-3 rounded-xl border px-2.5 transition-colors ${
                      dense ? "py-2" : "py-2.5"
                    } ${
                      selected
                        ? "border-[rgba(46,139,255,0.45)] bg-[rgba(46,139,255,0.12)]"
                        : "border-transparent hover:border-[var(--line)] hover:bg-[rgba(46,139,255,0.05)]"
                    }`}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[var(--line)] bg-[rgba(46,139,255,0.07)]">
                      <AtlasIcon name={entry.icon} className="h-4 w-4 text-[var(--accent-hi)]" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-[var(--text-hi)]">
                        <Highlight text={entry.title} query={query} />
                      </span>
                      {entry.subtitle && (
                        <span className="mt-0.5 block truncate text-xs text-[var(--text-low)]">
                          {entry.subtitle}
                        </span>
                      )}
                    </span>

                    <span className={`chip shrink-0 ${selected ? "chip-accent" : ""}`}>
                      {KIND_CHIP[entry.kind]}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {groups.length === 0 && (
        <p role="status" className="px-3 py-8 text-center text-sm text-[var(--text-low)]">
          {emptyHint}
        </p>
      )}
    </div>
  );
}
