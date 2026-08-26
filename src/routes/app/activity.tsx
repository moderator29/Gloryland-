import { useMemo, useState } from "react";
import { Receipt, ArrowDownLeft, ArrowUpRight, Gift, Check, Repeat } from "lucide-react";
import { useLedger } from "@/hooks/useLedger";
import { Empty } from "@/components/system/ui";
import { money, fullDate, relative } from "@/components/system/format";
import { tierById } from "@/domain/tiers";
import type { LedgerEvent } from "@/domain/ledger";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "open", label: "Placements" },
  { id: "claim", label: "Claims" },
  { id: "withdraw", label: "Withdrawals" },
] as const;

/** One row's presentation, derived from the event kind. */
function describe(e: LedgerEvent) {
  switch (e.kind) {
    case "open":
      return {
        icon: ArrowDownLeft,
        title: `${tierById(e.tierId)?.name ?? "Vault"} vault opened`,
        detail: `${e.asset} on ${e.network}`,
        amount: e.amount,
        tone: "text-[var(--accent-hi)]",
        sign: "",
      };
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
        title: "Vault settled",
        detail: "Principal returned",
        amount: null,
        tone: "text-[var(--text-mid)]",
        sign: "",
      };
    case "relay.set":
      return {
        icon: Repeat,
        title: e.mode === "full" ? "Relay armed" : "Relay armed, principal only",
        detail: "Carries into a new term at maturity",
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
  }
}

export default function Activity() {
  const snap = useLedger();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  const rows = useMemo(
    () => (filter === "all" ? snap.events : snap.events.filter((e) => e.kind === filter)),
    [snap.events, filter],
  );

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
        <h1 className="display mt-1 text-2xl sm:text-3xl">Activity</h1>
      </div>

      <div
        className="flex gap-2 overflow-x-auto no-bar"
        role="tablist"
        aria-label="Filter activity"
      >
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
            title="No activity yet"
            body="Placements, claims, settlements and withdrawals all appear here as they happen."
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
