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
import { DAY_MS, type LedgerEvent } from "@/domain/ledger";
import { WITHDRAW_INTERVAL_DAYS } from "@/domain/tiers";
import { useLedger } from "@/hooks/useLedger";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { Countdown, Horizon as HorizonRail } from "@/features/engagement";
import { Ladder } from "@/features/ladder";
import { BandHead, Empty, Metric } from "@/components/system/ui";
import { fullDate, money, moneyCompact, days as fmtDays } from "@/components/system/format";

/**
 * Horizon: the withdrawal calendar.
 *
 * This grid used to plot maturities. Positions no longer mature, so the dates
 * a member actually needs are the ones cash can move on: a withdrawal may be
 * requested once every four days, and the window runs from the last request
 * rather than from any position.
 *
 * Two kinds of mark, and deliberately no third. Every request already filed is
 * a real event in the ledger, and the day the next one is allowed is derived
 * from the latest of them. Nothing beyond that date is drawn, because the
 * window stays open once it opens: a further date would depend on a request
 * nobody has made, and the calendar would be quoting a schedule that does not
 * exist.
 *
 * The rail and the countdown above the grid are the existing Horizon and
 * Countdown components rather than new ones. The rail is aliased here only to
 * keep it apart from this page, which carries the same name for the same
 * reason: this whole surface is Horizon.
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

/** A withdrawal request the ledger recorded. */
type Request = { at: number; amount: number; address: string };

type Cell = {
  key: string;
  date: Date;
  day: number;
  /** False for the padding days either side of the month. */
  inMonth: boolean;
  isToday: boolean;
  /** Requests filed on this day. */
  requests: Request[];
  /** Total requested on this day. */
  requested: number;
  /** This is the day the next request is allowed. */
  opens: boolean;
};

/** What a screen reader is told about a day, figures included. */
function labelFor(cell: Cell): string {
  const date = `${cell.isToday ? "Today, " : ""}${longDate(cell.date)}`;
  const parts: string[] = [];
  if (cell.requests.length > 0) {
    const verb = cell.requests.length === 1 ? "withdrawal" : "withdrawals";
    parts.push(`${cell.requests.length} ${verb} filed, ${money(cell.requested)}`);
  }
  if (cell.opens) parts.push("the withdrawal window opens");
  return parts.length === 0 ? `${date}. Nothing filed.` : `${date}. ${parts.join(". ")}.`;
}

export default function Horizon() {
  const snap = useLedger();
  const reduce = useReducedMotion();

  const now = Date.now();
  const today = new Date(now);
  const todayKey = keyOf(today);

  // Every request the ledger holds, newest last, and the day the next one is
  // allowed. Both come out of the snapshot rather than being counted here, so
  // this page cannot disagree with the figure the rail shows beside it.
  const requests = useMemo<Request[]>(
    () =>
      snap.events
        .filter((e): e is Extract<LedgerEvent, { kind: "withdraw" }> => e.kind === "withdraw")
        .map((e) => ({ at: e.at, amount: e.amount, address: e.address }))
        .sort((a, b) => a.at - b.at),
    [snap.events],
  );
  const unlocksAt = snap.withdrawUnlocksAt;
  const windowOpen = snap.withdrawAllowed;
  const opensKey = keyOf(new Date(unlocksAt));

  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [focusDate, setFocusDate] = useState(() => new Date());
  const [selected, setSelected] = useState<Date | null>(null);
  const [dir, setDir] = useState(0);

  const gridRef = useRef<HTMLDivElement>(null);
  // Only a keyboard move should pull focus. A click already has it, and a
  // first paint should never steal it from wherever the member was.
  const wantFocus = useRef(false);

  /* ── requests, grouped by the day they were filed ── */
  const byDay = useMemo(() => {
    const map = new Map<string, Request[]>();
    for (const r of requests) {
      const k = keyOf(new Date(r.at));
      const list = map.get(k);
      if (list) list.push(r);
      else map.set(k, [r]);
    }
    return map;
  }, [requests]);

  const weeks = useMemo(() => {
    const first = startOfMonth(cursor);
    const lead = first.getDay();
    const length = endOfMonth(cursor).getDate();
    const cells: Cell[] = [];

    for (let i = 0; i < Math.ceil((lead + length) / 7) * 7; i++) {
      const date = addDays(first, i - lead);
      const inMonth = sameMonth(date, first);
      const key = keyOf(date);
      const dayRequests = inMonth ? (byDay.get(key) ?? []) : [];
      cells.push({
        key,
        date,
        day: date.getDate(),
        inMonth,
        isToday: key === todayKey,
        requests: dayRequests,
        requested: dayRequests.reduce((sum, r) => sum + r.amount, 0),
        // The window opens once. Marking it on a day already in the past would
        // be marking a date that has come and gone rather than one to act on.
        opens: inMonth && key === opensKey && !windowOpen,
      });
    }

    return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
  }, [cursor, byDay, todayKey, opensKey, windowOpen]);

  const monthTotals = useMemo(() => {
    const cells = weeks.flat();
    const filed = cells.flatMap((c) => c.requests);
    return {
      count: filed.length,
      requested: filed.reduce((sum, r) => sum + r.amount, 0),
      opens: cells.some((c) => c.opens),
    };
  }, [weeks]);

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

  /* ── what has been filed, and what can be ── */

  const filedCount = requests.length;
  const filedTotal = requests.reduce((sum, r) => sum + r.amount, 0);

  const selectedRequests = selected ? (byDay.get(keyOf(selected)) ?? []) : [];
  const selectedTotal = selectedRequests.reduce((sum, r) => sum + r.amount, 0);
  const selectedOpens = selected !== null && keyOf(selected) === opensKey && !windowOpen;

  const monthKey = `${cursor.getFullYear()}-${cursor.getMonth()}`;

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Schedule</p>
        <h1 className="display mt-1.5 text-2xl sm:text-3xl">Horizon</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--text-low)]">
          A withdrawal can be requested once every {WITHDRAW_INTERVAL_DAYS} days. These are the
          requests you have already filed and the day the next one is allowed, taken from your own
          ledger.
        </p>
      </header>

      {filedCount === 0 && snap.positions.length === 0 ? (
        <section className="panel">
          <Empty
            icon={CalendarClock}
            art="horizon"
            title="Nothing to plot yet"
            body={`A first withdrawal is allowed immediately, and every one after it opens the window again ${WITHDRAW_INTERVAL_DAYS} days later. Place capital and the dates start landing here.`}
            action={{ label: "Open a vault", to: "/app/vaults/new" }}
          />
        </section>
      ) : (
        <>
          {/* ── Where the account stands ── */}
          <section
            aria-label="Withdrawal window"
            className="grid grid-cols-1 gap-2.5 sm:grid-cols-3"
          >
            <Metric
              label="Available to withdraw"
              tone={snap.available > 0 ? "gain" : "default"}
              sub={
                snap.available > 0
                  ? "Settled cash, not accruing"
                  : "Claim rewards or close a position to build it"
              }
            >
              {money(snap.available, 2)}
            </Metric>
            <Metric
              label="Next request allowed"
              tone="accent"
              sub={
                windowOpen
                  ? "The window is open"
                  : `${fmtDays((unlocksAt - now) / DAY_MS)} days from now`
              }
            >
              {windowOpen ? "Now" : <Countdown to={unlocksAt} />}
            </Metric>
            <Metric
              label="Requests filed"
              sub={
                filedCount
                  ? `${money(filedTotal)} withdrawn in total`
                  : "A first request is allowed immediately"
              }
            >
              {filedCount}
            </Metric>
          </section>

          {/* The rail carries its own h3. Without a band heading above it the
              page went h1 straight to h3, which is a level skip a screen
              reader reports as a missing section. */}
          <section className="band" aria-labelledby="horizon-rail">
            <BandHead id="horizon-rail" title="This window" />
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
                    ? `${monthTotals.count} filed, ${money(monthTotals.requested)} withdrawn`
                    : monthTotals.opens
                      ? "The window opens this month"
                      : "Nothing filed this month"}
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
                ? selectedRequests.length
                  ? `${longDate(selected)} selected. ${selectedRequests.length} filed, ${money(selectedTotal)} withdrawn.`
                  : selectedOpens
                    ? `${longDate(selected)} selected. The withdrawal window opens.`
                    : `${longDate(selected)} selected. Nothing filed.`
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
                        const marked = cell.requests.length > 0 || cell.opens;
                        const tone = !marked
                          ? "border-[var(--line)] text-[var(--text-mid)] hover:border-[var(--line-hi)]"
                          : cell.requests.length > 0
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
                                      {cell.requests.length > 0
                                        ? moneyCompact(cell.requested)
                                        : "opens"}
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
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--gain)]" aria-hidden="true" />
                Withdrawal filed
              </li>
              <li className="flex items-center gap-1.5 text-[11px] text-[var(--text-low)]">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-[var(--accent-hi)]"
                  aria-hidden="true"
                />
                The window opens
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
                    <p className="eyebrow">Withdrawals</p>
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

                {selectedRequests.length ? (
                  <>
                    <div className="ledger mt-3">
                      {selectedRequests.map((request) => (
                        <div key={`${request.at}-${request.address}`} className="rail-row">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-[var(--text-hi)]">
                              Withdrawal request
                            </p>
                            <p className="mt-0.5 truncate text-xs text-[var(--text-low)]">
                              {fullDate(request.at)} · to {request.address}
                            </p>
                          </div>
                          <p className="metric shrink-0 text-sm">{money(request.amount, 2)}</p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-[var(--text-low)]">
                      {selectedRequests.length}{" "}
                      {selectedRequests.length === 1 ? "request" : "requests"} filed,{" "}
                      {money(selectedTotal, 2)} in total. The window reopened{" "}
                      {WITHDRAW_INTERVAL_DAYS} days after the last of them.
                    </p>
                  </>
                ) : selectedOpens ? (
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-low)]">
                    This is the day the window opens. From then it stays open until you file a
                    request, and filing one sets the next date {WITHDRAW_INTERVAL_DAYS} days later.
                  </p>
                ) : (
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-low)]">
                    Nothing was filed on this day.{" "}
                    {windowOpen
                      ? "A request can be filed today, and the window stays open until you do."
                      : `The next request is allowed ${fullDate(unlocksAt)}.`}
                  </p>
                )}
              </motion.div>
            )}
          </section>
        </>
      )}

      {/* ── Echelon ──
          The planner that used to sit here is a surface of its own now, and it
          argues against itself: staggering placements bought separate return
          dates, and there are no return dates any more. This links rather than
          duplicating, because two copies of an argument are two to keep in
          agreement. */}
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
              <p className="eyebrow">What a split would cost</p>
              <h3 className="mt-1 text-[15px] font-semibold text-[var(--text-hi)]">
                Splitting a placement across days
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-low)]">
                Echelon used to stagger maturities so capital came back on several dates. Nothing
                matures now, and this window belongs to the account rather than to any position, so
                a split buys no extra access to cash.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-low)]">
                What it does cost is accrual: a leg that waits earns nothing while it waits, and
                both plans accrue identically afterwards. Echelon works that out to the cent.
              </p>

              <Link to="/app/echelon" className="btn btn-secondary mt-4">
                <AlignVerticalDistributeCenter className="h-4 w-4" aria-hidden="true" />
                See what a split costs
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
