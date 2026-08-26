import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlignVerticalDistributeCenter,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Split,
} from "lucide-react";
import { DAY_MS, type Position } from "@/domain/ledger";
import { CYCLE_DAYS } from "@/domain/tiers";
import { useLedger } from "@/hooks/useLedger";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Countdown, Horizon as HorizonRail } from "@/features/engagement";
import { Ladder } from "@/features/ladder";
import { BandHead, Empty, Metric, Status } from "@/components/system/ui";
import { fullDate, money, moneyCompact } from "@/components/system/format";

/**
 * Horizon: the maturity calendar.
 *
 * Every mark on this grid is a maturity date the ledger already recorded. A
 * position's term is fixed at thirty days from the moment it opened, so the
 * calendar is not a forecast: it is the schedule those open positions have
 * committed to, read one month at a time.
 *
 * The ninety day rail and the countdown above the grid are the existing
 * Horizon and Countdown components rather than new ones. The rail is aliased
 * here only to keep it apart from this page, which carries the same name for
 * the same reason: this whole surface is Horizon.
 */

/* ── dates ──────────────────────────────────────────────────────────────── */

const WEEKDAYS = [
  { short: "Su", long: "Sunday" },
  { short: "Mo", long: "Monday" },
  { short: "Tu", long: "Tuesday" },
  { short: "We", long: "Wednesday" },
  { short: "Th", long: "Thursday" },
  { short: "Fr", long: "Friday" },
  { short: "Sa", long: "Saturday" },
];

/** Local day identity. Maturities are read in the member's own timezone. */
function keyOf(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Same day of the month where it exists, otherwise the last day of it. */
function addMonths(d: Date, n: number): Date {
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = endOfMonth(target).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), last));
}

function sameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function longDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/* ── the grid ───────────────────────────────────────────────────────────── */

type Cell = {
  key: string;
  date: Date;
  day: number;
  /** False for the padding days either side of the month. */
  inMonth: boolean;
  isToday: boolean;
  positions: Position[];
  /** Principal maturing on this day. */
  principal: number;
  /** Principal plus term reward: what the day releases. */
  releases: number;
  /** Every position on this day has already reached its maturity. */
  matured: boolean;
};

function summarise(positions: Position[]) {
  return {
    count: positions.length,
    principal: positions.reduce((s, p) => s + p.principal, 0),
    releases: positions.reduce((s, p) => s + p.principal + p.termReward, 0),
  };
}

/** What a screen reader is told about a day, figures included. */
function labelFor(cell: Cell): string {
  const date = `${cell.isToday ? "Today, " : ""}${longDate(cell.date)}`;
  if (cell.positions.length === 0) return `${date}. Nothing matures.`;
  const verb = cell.positions.length === 1 ? "vault matures" : "vaults mature";
  return `${date}. ${cell.positions.length} ${verb}, ${money(cell.principal)} principal, ${money(cell.releases)} releasing.`;
}

export default function Horizon() {
  const snap = useLedger();
  const reduce = useReducedMotion();

  const now = Date.now();
  const today = new Date(now);
  const todayKey = keyOf(today);
  const open = snap.activePositions;

  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [focusDate, setFocusDate] = useState(() => new Date());
  const [selected, setSelected] = useState<Date | null>(null);
  const [dir, setDir] = useState(0);

  const gridRef = useRef<HTMLDivElement>(null);
  // Only a keyboard move should pull focus. A click already has it, and a
  // first paint should never steal it from wherever the member was.
  const wantFocus = useRef(false);

  /* ── maturities, grouped by the day they land on ── */
  const byDay = useMemo(() => {
    const map = new Map<string, Position[]>();
    for (const p of open) {
      const k = keyOf(new Date(p.maturesAt));
      const list = map.get(k);
      if (list) list.push(p);
      else map.set(k, [p]);
    }
    for (const list of map.values()) list.sort((a, b) => a.maturesAt - b.maturesAt);
    return map;
  }, [open]);

  const weeks = useMemo(() => {
    const first = startOfMonth(cursor);
    const lead = first.getDay();
    const length = endOfMonth(cursor).getDate();
    const cells: Cell[] = [];

    for (let i = 0; i < Math.ceil((lead + length) / 7) * 7; i++) {
      const date = addDays(first, i - lead);
      const inMonth = sameMonth(date, first);
      const positions = inMonth ? (byDay.get(keyOf(date)) ?? []) : [];
      const totals = summarise(positions);
      cells.push({
        key: keyOf(date),
        date,
        day: date.getDate(),
        inMonth,
        isToday: keyOf(date) === todayKey,
        positions,
        principal: totals.principal,
        releases: totals.releases,
        matured: positions.length > 0 && positions.every((p) => p.matured),
      });
    }

    return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
  }, [cursor, byDay, todayKey]);

  const monthTotals = useMemo(() => summarise(weeks.flat().flatMap((c) => c.positions)), [weeks]);

  const focusKey = keyOf(focusDate);

  useLayoutEffect(() => {
    if (!wantFocus.current) return;
    wantFocus.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focusKey}"]`)?.focus();
  }, [focusKey]);

  /* ── navigation ── */

  const goTo = (date: Date, keyboard: boolean) => {
    if (keyboard) wantFocus.current = true;
    setFocusDate(date);
    if (!sameMonth(date, cursor)) {
      setDir(date.getTime() > cursor.getTime() ? 1 : -1);
      setCursor(startOfMonth(date));
    }
  };

  const goMonth = (delta: number) => {
    const next = addMonths(startOfMonth(cursor), delta);
    setDir(delta);
    setCursor(next);
    // Land on today where the month holds it, so the grid opens somewhere real.
    setFocusDate(sameMonth(next, today) ? today : next);
  };

  const goToday = () => {
    setDir(startOfMonth(today).getTime() >= cursor.getTime() ? 1 : -1);
    setCursor(startOfMonth(today));
    setFocusDate(today);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    let next: Date | null = null;
    switch (e.key) {
      case "ArrowLeft":
        next = addDays(focusDate, -1);
        break;
      case "ArrowRight":
        next = addDays(focusDate, 1);
        break;
      case "ArrowUp":
        next = addDays(focusDate, -7);
        break;
      case "ArrowDown":
        next = addDays(focusDate, 7);
        break;
      case "Home":
        next = startOfMonth(focusDate);
        break;
      case "End":
        next = endOfMonth(focusDate);
        break;
      case "PageUp":
        next = addMonths(focusDate, -1);
        break;
      case "PageDown":
        next = addMonths(focusDate, 1);
        break;
      default:
        return;
    }
    e.preventDefault();
    goTo(next, true);
  };

  const select = (cell: Cell) => {
    setSelected((prev) => (prev && keyOf(prev) === cell.key ? null : cell.date));
    setFocusDate(cell.date);
  };

  /* ── what is coming, and when ── */

  const upcoming = open.filter((p) => p.maturesAt > now).sort((a, b) => a.maturesAt - b.maturesAt);
  const within = (d: number) => summarise(upcoming.filter((p) => p.maturesAt <= now + d * DAY_MS));
  const sevenDays = within(7);
  const thirtyDays = within(30);
  const next = upcoming[0] ?? null;
  const ready = open.filter((p) => p.matured);

  const selectedPositions = selected ? (byDay.get(keyOf(selected)) ?? []) : [];
  const selectedTotals = summarise(selectedPositions);

  const monthKey = `${cursor.getFullYear()}-${cursor.getMonth()}`;

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Schedule</p>
        <h1 className="display mt-1.5 text-2xl sm:text-3xl">Horizon</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--text-low)]">
          Every open position holds its principal for {CYCLE_DAYS} days from the day it opened.
          These are the dates those terms reach, taken from your own ledger.
        </p>
      </header>

      {open.length === 0 ? (
        <section className="panel">
          <Empty
            icon={CalendarClock}
            art="horizon"
            title="No maturities to plot"
            body={`A position matures ${CYCLE_DAYS} days after it opens. Open one and its date lands on this calendar the same day.`}
            action={{ label: "Open a vault", to: "/app/vaults/new" }}
          />
        </section>
      ) : (
        <>
          {/* ── What is coming, at three ranges ── */}
          <section aria-label="Maturing soon" className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <Metric
              label="Next 7 days"
              tone={sevenDays.count ? "gain" : "default"}
              sub={
                sevenDays.count
                  ? `${sevenDays.count} ${sevenDays.count === 1 ? "vault" : "vaults"}, ${money(sevenDays.principal)} principal`
                  : "Nothing matures this week"
              }
            >
              {money(sevenDays.releases)}
            </Metric>
            <Metric
              label="Next 30 days"
              tone={thirtyDays.count ? "gain" : "default"}
              sub={
                thirtyDays.count
                  ? `${thirtyDays.count} ${thirtyDays.count === 1 ? "vault" : "vaults"}, ${money(thirtyDays.principal)} principal`
                  : "Nothing matures inside a term"
              }
            >
              {money(thirtyDays.releases)}
            </Metric>
            <Metric
              label="Next maturity"
              tone="accent"
              sub={
                next
                  ? `${next.tier.name}, ${fullDate(next.maturesAt)}`
                  : ready.length
                    ? `${ready.length} matured and ready to settle`
                    : "No term is running"
              }
            >
              {next ? <Countdown to={next.maturesAt} /> : ready.length ? "Matured" : "None"}
            </Metric>
          </section>

          {/* The rail carries its own h3. Without a band heading above it the
              page went h1 straight to h3, which is a level skip a screen
              reader reports as a missing section. */}
          <section className="band" aria-labelledby="horizon-rail">
            <BandHead id="horizon-rail" title="The next 90 days" />
            <HorizonRail snap={snap} />
          </section>

          {/* ── The month ── */}
          <section className="band" aria-labelledby="horizon-month">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <div className="min-w-0">
                <h2 id="horizon-month" className="text-[15px] font-semibold text-[var(--text-hi)]">
                  {monthLabel(cursor)}
                </h2>
                <p className="mt-0.5 text-xs text-[var(--text-low)]">
                  {monthTotals.count
                    ? `${monthTotals.count} maturing, ${money(monthTotals.releases)} releasing`
                    : "Nothing matures this month"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => goMonth(-1)}
                  aria-label={`Previous month, ${monthLabel(addMonths(startOfMonth(cursor), -1))}`}
                  className="btn btn-ghost !px-2.5 !py-2"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={goToday}
                  className="btn btn-outline !px-3 !py-2 !text-xs"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => goMonth(1)}
                  aria-label={`Next month, ${monthLabel(addMonths(startOfMonth(cursor), 1))}`}
                  className="btn btn-ghost !px-2.5 !py-2"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* The selected day, announced rather than only drawn. */}
            <p className="sr-only" role="status" aria-live="polite">
              {selected
                ? selectedPositions.length
                  ? `${longDate(selected)} selected. ${selectedTotals.count} maturing, ${money(selectedTotals.releases)} releasing.`
                  : `${longDate(selected)} selected. Nothing matures.`
                : ""}
            </p>

            <div className="panel mt-3 p-2 sm:p-4">
              <motion.div
                key={monthKey}
                initial={reduce ? false : { opacity: 0, x: dir * 14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={reduce ? { duration: 0 } : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                <div
                  ref={gridRef}
                  role="grid"
                  aria-labelledby="horizon-month"
                  onKeyDown={onKeyDown}
                  className="select-none"
                >
                  <div role="row" className="grid grid-cols-7 gap-1 sm:gap-1.5">
                    {WEEKDAYS.map((d) => (
                      <span
                        key={d.long}
                        role="columnheader"
                        aria-label={d.long}
                        className="pb-1 text-center text-[10px] font-semibold uppercase tracking-widest text-[var(--text-low)]"
                      >
                        <span aria-hidden="true">{d.short}</span>
                      </span>
                    ))}
                  </div>

                  {weeks.map((row) => (
                    <div
                      key={row[0].key}
                      role="row"
                      className="mt-1 grid grid-cols-7 gap-1 sm:mt-1.5 sm:gap-1.5"
                    >
                      {row.map((cell) => {
                        const isSelected = selected !== null && keyOf(selected) === cell.key;
                        const marked = cell.positions.length > 0;
                        const tone = !marked
                          ? "border-[var(--line)] text-[var(--text-mid)] hover:border-[var(--line-hi)]"
                          : cell.matured
                            ? "border-[rgba(52,211,153,0.38)] bg-[rgba(52,211,153,0.10)] text-[var(--gain)] hover:bg-[rgba(52,211,153,0.18)]"
                            : "border-[rgba(46,139,255,0.38)] bg-[rgba(46,139,255,0.12)] text-[var(--accent-hi)] hover:bg-[rgba(46,139,255,0.2)]";

                        return (
                          <div
                            key={cell.key}
                            role="gridcell"
                            aria-selected={cell.inMonth ? isSelected : undefined}
                            className="aspect-square min-h-[44px] sm:aspect-auto sm:h-[68px]"
                          >
                            {cell.inMonth ? (
                              <button
                                type="button"
                                data-day={cell.key}
                                tabIndex={cell.key === focusKey ? 0 : -1}
                                onClick={() => select(cell)}
                                aria-label={labelFor(cell)}
                                className={`flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-lg border p-1 transition-colors ${tone} ${
                                  isSelected
                                    ? "!border-[var(--accent-hi)] !bg-[rgba(46,139,255,0.24)] !text-[var(--text-hi)]"
                                    : ""
                                } ${cell.isToday ? "ring-1 ring-inset ring-[var(--accent)]" : ""}`}
                              >
                                <span className="tabular text-[12px] font-semibold leading-none sm:text-[13px]">
                                  {cell.day}
                                </span>
                                {marked && (
                                  <>
                                    <span
                                      className="mt-0.5 h-1.5 w-1.5 rounded-full bg-current sm:hidden"
                                      aria-hidden="true"
                                    />
                                    <span
                                      className="tabular mt-0.5 hidden text-[10px] leading-tight sm:block"
                                      aria-hidden="true"
                                    >
                                      {cell.positions.length} · {moneyCompact(cell.principal)}
                                    </span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <span className="block h-full w-full" aria-hidden="true" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Under sm the cells carry a dot rather than figures, so say what a
                dot means rather than leaving the colour to do it alone. */}
            <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Calendar key">
              <li className="flex items-center gap-1.5 text-[11px] text-[var(--text-low)]">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-[var(--accent-hi)]"
                  aria-hidden="true"
                />
                Maturing
              </li>
              <li className="flex items-center gap-1.5 text-[11px] text-[var(--text-low)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--gain)]" aria-hidden="true" />
                Matured, ready to settle
              </li>
              <li className="flex items-center gap-1.5 text-[11px] text-[var(--text-low)]">
                <span
                  className="h-2.5 w-2.5 rounded-[3px] ring-1 ring-inset ring-[var(--accent)]"
                  aria-hidden="true"
                />
                Today
              </li>
            </ul>

            <p className="mt-2.5 text-[11px] leading-relaxed text-[var(--text-low)]">
              Arrow keys move a day, Page Up and Page Down move a month, Home and End jump to the
              ends of one. Marked days open beneath the grid.
            </p>

            {/* ── The chosen day, inline ── */}
            {selected && (
              <motion.div
                className="panel mt-3 p-4"
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduce ? { duration: 0 } : { duration: 0.24, ease: "easeOut" }}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1.5">
                  <div className="min-w-0">
                    <p className="eyebrow">Maturing</p>
                    <h3 className="mt-1 text-[15px] font-semibold text-[var(--text-hi)]">
                      {fullDate(selected.getTime())}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="min-h-[36px] btn btn-ghost !px-2.5 !py-1.5 !text-xs"
                  >
                    Close
                  </button>
                </div>

                {selectedPositions.length ? (
                  <>
                    <div className="ledger mt-3">
                      {selectedPositions.map((p) => (
                        <Link
                          key={p.id}
                          to={`/app/vaults/${p.id}`}
                          className="rail-row rail-row-gain"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-medium text-[var(--text-hi)]">
                                {p.tier.name} vault
                              </p>
                              <Status kind={p.matured ? "matured" : "accruing"} />
                            </div>
                            <p className="mt-0.5 text-xs text-[var(--text-low)]">
                              {money(p.principal)} principal · {money(p.termReward)} reward ·{" "}
                              {p.matured ? "matured" : <Countdown to={p.maturesAt} compact />}
                            </p>
                          </div>
                          <p className="metric shrink-0 text-sm text-[var(--gain)]">
                            {money(p.principal + p.termReward)}
                          </p>
                        </Link>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-[var(--text-low)]">
                      {selectedTotals.count} {selectedTotals.count === 1 ? "position" : "positions"}{" "}
                      releasing {money(selectedTotals.releases)}, of which{" "}
                      {money(selectedTotals.principal)} is principal returning.
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-low)]">
                    Nothing matures on this day. A position opened today would reach its term on{" "}
                    {fullDate(now + CYCLE_DAYS * DAY_MS)}.
                  </p>
                )}
              </motion.div>
            )}
          </section>
        </>
      )}

      {/* ── Echelon ──
          The planner that used to sit here is a surface of its own now, and
          NAMING.md rule 3 is the reason the panel could not keep its old
          title: `features/ladder` already means the tier progression, so
          calling staggered maturities "Laddering" used one word for two
          different things. This links rather than duplicating, because two
          copies of a planner are two planners to keep in agreement. */}
      <section className="band" aria-labelledby="echelon-title">
        <BandHead id="echelon-title" title="Echelon" />

        <div className="panel p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-[rgba(46,139,255,0.07)]">
              <Split
                className="h-4 w-4 text-[var(--accent-hi)]"
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="eyebrow">One cliff, or a rolling schedule</p>
              <h3 className="mt-1 text-[15px] font-semibold text-[var(--text-hi)]">
                Stagger a placement across the term
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-low)]">
                Opened at even intervals, each position still runs a full {CYCLE_DAYS} days, so
                their maturities arrive spaced out instead of landing on one date. The rate is
                identical either way: this changes when capital comes back, not how much.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-low)]">
                Echelon plans it. Every leg gets a date, a placement button on the day it is due,
                and a comparison against placing the whole sum at once.
              </p>

              <Link to="/app/echelon" className="btn btn-secondary mt-4">
                <AlignVerticalDistributeCenter className="h-4 w-4" aria-hidden="true" />
                Plan an echelon
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Where the next placement lands on the ladder ── */}
      <section className="band" aria-label="Ladder">
        <Ladder snap={snap} />
      </section>
    </div>
  );
}
