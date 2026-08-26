import { useMemo, useState } from "react";
import {
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
  Gift,
  Check,
  Repeat,
  RefreshCw,
  CalendarClock,
} from "lucide-react";
import { useLedger } from "@/hooks/useLedger";
import { Empty } from "@/components/system/ui";
import { money, fullDate, relative } from "@/components/system/format";
import { tierById } from "@/domain/tiers";
import { classify, isInstruction, isRoll, type LedgerEvent } from "@/domain/ledger";

/**
 * The filters, defined by what an event is rather than by which kind it was
 * written as.
 *
 * Two distinctions the kinds alone cannot make, and both matter to a member
 * reading their own record. A roll and a deposit are the same `open` event, so
 * "Placements" holds both and each row says which it was. And relay and course
 * events are instructions rather than movements: nothing about them moves
 * capital, so they get a filter of their own instead of appearing only under
 * All. Every one of the nine kinds is now reachable from this bar.
 */
const FILTERS = [
  { id: "all", label: "All", match: () => true },
  { id: "placements", label: "Placements", match: (e: LedgerEvent) => e.kind === "open" },
  { id: "claims", label: "Claims", match: (e: LedgerEvent) => classify(e) === "claim" },
  {
    id: "withdrawals",
    label: "Withdrawals",
    match: (e: LedgerEvent) => classify(e) === "withdrawal",
  },
  {
    id: "settlements",
    label: "Settlements",
    match: (e: LedgerEvent) => classify(e) === "settlement",
  },
  { id: "instructions", label: "Instructions", match: isInstruction },
] as const;

/** One row's presentation, derived from the event kind. */
function describe(e: LedgerEvent) {
  switch (e.kind) {
    case "deposit":
      return {
        icon: ArrowDownLeft,
        // The rate is on the row rather than only on the event, because the
        // dollars credited are a multiplication a member should be able to
        // check without opening a file.
        title: "Transfer credited",
        detail: `${e.units} ${e.asset} at ${money(e.unitPrice, e.unitPrice < 10 ? 4 : 0)} · ${e.txid.slice(0, 10)}...`,
        amount: e.amount,
        tone: "text-[var(--gain)]",
        sign: "+",
      };
    case "open": {
      const name = tierById(e.tierId)?.name ?? "Vault";
      // A roll and a deposit are the same event kind and the opposite fact: one
      // brought capital in, the other re-placed capital that was already here.
      // Reading them as one thing is what the double count looked like from the
      // ledger, so the row says which it was rather than leaving it derivable.
      const rolled = isRoll(e);
      const begins =
        e.startsAt !== undefined && e.startsAt > e.at
          ? `, term begins ${fullDate(e.startsAt)}`
          : "";
      return {
        icon: rolled ? RefreshCw : ArrowDownLeft,
        title: rolled ? `${name} vault rolled` : `${name} vault opened`,
        detail: rolled
          ? `From your account balance${begins}`
          : `${e.asset} on ${e.network}${begins}`,
        amount: e.amount,
        tone: "text-[var(--accent-hi)]",
        sign: "",
      };
    }
    case "claim":
      return {
        icon: Gift,
        title: "Rewards claimed",
        detail: "Moved to available balance",
        amount: e.amount,
        tone: "text-[var(--gain)]",
        sign: "+",
      };
    case "withdraw":
      return {
        icon: ArrowUpRight,
        title: "Withdrawal recorded",
        detail: `To ${e.address.slice(0, 10)}…${e.address.slice(-6)}`,
        amount: e.amount,
        tone: "text-[var(--text-hi)]",
        sign: "−",
      };
    case "close":
      return {
        icon: Check,
        title: "Vault closed",
        detail: "Principal returned",
        amount: null,
        tone: "text-[var(--text-mid)]",
        sign: "",
      };
    case "relay.set":
      return {
        icon: Repeat,
        title: e.mode === "full" ? "Relay armed, compounding" : "Relay armed, harvesting",
        detail:
          e.mode === "full"
            ? "Folds accrued reward back into principal"
            : "Claims accrued reward to the balance",
        amount: null,
        tone: "text-[var(--accent-hi)]",
        sign: "",
      };
    case "relay.clear":
      return {
        icon: Repeat,
        title: "Relay disarmed",
        detail: "This term will settle to your balance",
        amount: null,
        tone: "text-[var(--text-mid)]",
        sign: "",
      };
    case "course.set":
      return {
        icon: CalendarClock,
        title: "Course set",
        detail: `${money(e.amount)} every ${e.everyDays} days${e.legs > 0 ? `, ${e.legs} legs` : ", open ended"}`,
        amount: null,
        tone: "text-[var(--accent-hi)]",
        sign: "",
      };
    case "course.stop":
      return {
        icon: CalendarClock,
        title: "Course stopped",
        detail: "No further legs are scheduled",
        amount: null,
        tone: "text-[var(--text-mid)]",
        sign: "",
      };
    case "course.fill":
      return {
        icon: CalendarClock,
        title: `Leg ${e.leg} filled`,
        detail: "Placed against your course",
        amount: null,
        tone: "text-[var(--gain)]",
        sign: "",
      };
  }
}

export default function Activity() {
  const snap = useLedger();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  const rows = useMemo(() => {
    const match = FILTERS.find((f) => f.id === filter)?.match ?? (() => true);
    return snap.events.filter(match);
  }, [snap.events, filter]);

  // Group by calendar day so a long history stays scannable.
  const groups = useMemo(() => {
    const map = new Map<string, LedgerEvent[]>();
    for (const e of rows) {
      const key = new Date(e.at).toDateString();
      const list = map.get(key);
      if (list) list.push(e);
      else map.set(key, [e]);
    }
    return [...map.entries()];
  }, [rows]);

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Record</p>
        {/* Ledger, the name this surface has in the nav and in NAMING.md. */}
        <h1 className="display mt-1 text-2xl sm:text-3xl">Ledger</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto no-bar" role="tablist" aria-label="Filter ledger">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`chip transition-colors ${filter === f.id ? "chip-accent" : "hover:border-[var(--line-hi)]"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <div className="panel">
          <Empty
            icon={Receipt}
            title={filter === "all" ? "No activity yet" : "Nothing under this filter"}
            body="Placements, claims, settlements, withdrawals and the instructions you set all appear here as they happen."
            action={{ label: "Open a vault", to: "/app/vaults/new" }}
          />
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(([day, list]) => (
            <section key={day}>
              <p className="eyebrow mb-2">{fullDate(new Date(day).getTime())}</p>
              <div className="panel divide-y divide-[var(--line)]">
                {list.map((e) => {
                  const d = describe(e);
                  return (
                    <div key={e.id} className="flex items-center gap-3.5 p-4">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-[rgba(5,7,15,0.5)]">
                        <d.icon className={`h-4 w-4 ${d.tone}`} strokeWidth={1.9} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--text-hi)]">
                          {d.title}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-[var(--text-low)]">
                          {d.detail} · {relative(e.at)}
                        </p>
                      </div>
                      {d.amount !== null && (
                        <p className={`metric shrink-0 text-sm ${d.tone}`}>
                          {d.sign}
                          {money(d.amount, 2)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
