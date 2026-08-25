import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Database, Download, Trash2, TriangleAlert } from "lucide-react";
import { clearLedger, loadEvents, type LedgerEvent } from "@/domain/ledger";
import { useLedger } from "@/hooks/useLedger";
import { useArmedAction } from "@/hooks/useArmedAction";
import {
  SettingsBlock,
  SettingsGroup,
  SettingsNote,
  SettingsRow,
} from "@/components/system/SettingsUI";
import { fullDate, money } from "@/components/system/format";

/** Hands the browser a file without touching the network. */
function download(filename: string, mime: string, contents: string) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoked on the next frame so the click has taken the URL first.
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

const COLUMNS = [
  "id",
  "kind",
  "date",
  "timestamp",
  "amount",
  "amount_formatted",
  "tier",
  "asset",
  "network",
  "position_id",
  "address",
];

function cell(value: string | number) {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toRow(e: LedgerEvent): (string | number)[] {
  const amount = "amount" in e ? e.amount : "";
  return [
    e.id,
    e.kind,
    fullDate(e.at),
    new Date(e.at).toISOString(),
    amount,
    amount === "" ? "" : money(amount, 2),
    e.kind === "open" ? e.tierId : "",
    e.kind === "open" ? e.asset : "",
    e.kind === "open" ? e.network : "",
    e.kind === "claim" || e.kind === "close" ? e.positionId : "",
    e.kind === "withdraw" ? e.address : "",
  ];
}

export default function SettingsData() {
  const snap = useLedger();
  const count = snap.events.length;

  const [armed, requestReset] = useArmedAction(() => {
    clearLedger();
    toast.success("Ledger cleared. Your account is back to a clean slate.");
  });

  const exportJson = () => {
    const events = loadEvents();
    const payload = {
      product: "Rigel Capital",
      exportedAt: new Date().toISOString(),
      eventCount: events.length,
      summary: {
        contributed: snap.contributed,
        deployed: snap.deployed,
        rewardsAccrued: snap.rewardsAccrued,
        available: snap.available,
        portfolioValue: snap.portfolioValue,
      },
      events: [...events].sort((a, b) => a.at - b.at),
    };
    download(`rigel-ledger-${stamp()}.json`, "application/json", JSON.stringify(payload, null, 2));
    toast.success(`Exported ${events.length} events as JSON`);
  };

  const exportCsv = () => {
    const events = [...loadEvents()].sort((a, b) => a.at - b.at);
    const lines = [COLUMNS.join(","), ...events.map((e) => toRow(e).map(cell).join(","))];
    download(`rigel-ledger-${stamp()}.csv`, "text/csv;charset=utf-8", lines.join("\n"));
    toast.success(`Exported ${events.length} events as CSV`);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link to="/app/settings" className="btn btn-ghost -ml-2 !py-1.5 !text-xs">
        <ArrowLeft className="h-4 w-4" /> Settings
      </Link>

      <header>
        <p className="eyebrow">Settings</p>
        <h1 className="display mt-1 text-2xl sm:text-3xl">Data</h1>
        <p className="mt-2 text-sm text-[var(--text-low)]">
          Take a copy of your ledger, or erase it.
        </p>
      </header>

      <SettingsGroup icon={Database} name="Your ledger" descriptor={`${count} events`}>
        <SettingsRow
          title="Recorded events"
          description="Every vault opened, reward claimed, position closed and withdrawal made"
          control={<span className="tabular text-sm font-medium">{count}</span>}
        />
        <SettingsRow
          title="Contributed to date"
          description="The figure your tier standing is measured against"
          control={<span className="tabular text-sm font-medium">{money(snap.contributed)}</span>}
        />
        <SettingsRow
          title="Portfolio value"
          description="Deployed capital, pending rewards and available cash"
          control={
            <span className="tabular text-sm font-medium">{money(snap.portfolioValue)}</span>
          }
        />
      </SettingsGroup>

      <SettingsGroup icon={Download} name="Export" descriptor="Local file">
        <SettingsBlock>
          <p className="text-sm font-medium text-[var(--text-hi)]">Download a copy</p>
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-low)]">
            The file is built in this browser and saved straight to your device. Nothing is
            uploaded. JSON keeps the full event log with a summary, CSV opens directly in a
            spreadsheet.
          </p>
          <div className="mt-3.5 flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={exportJson}
              disabled={count === 0}
              className="btn btn-secondary flex-1"
            >
              <Download className="h-4 w-4" /> Export JSON
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={count === 0}
              className="btn btn-outline flex-1"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>
          {count === 0 && (
            <p className="mt-2.5 text-xs text-[var(--text-low)]">
              There is nothing to export yet. Open a vault and the log starts recording.
            </p>
          )}
        </SettingsBlock>
      </SettingsGroup>

      <SettingsNote>
        This build keeps your ledger in this browser under a single key. An export is the only copy
        that survives clearing site data or moving to another device.
      </SettingsNote>

      <SettingsGroup icon={TriangleAlert} name="Reset account" descriptor="Permanent" tone="danger">
        <SettingsBlock>
          <p className="text-sm leading-relaxed text-[var(--text)]">
            Erases {count} recorded events and {money(snap.portfolioValue)} of position data. Every
            vault, claim and withdrawal goes with it. This cannot be undone, so export first if you
            want a copy.
          </p>
          <button
            type="button"
            onClick={requestReset}
            aria-label={armed ? "Confirm account reset" : "Reset account"}
            className="btn btn-danger mt-3.5"
          >
            <Trash2 className="h-4 w-4" />
            {armed ? "Tap again to erase everything" : "Reset account"}
          </button>
          {armed && (
            <p className="mt-2 text-xs text-[var(--loss)]" aria-live="assertive">
              Waiting for a second tap. Do nothing for a moment to cancel.
            </p>
          )}
        </SettingsBlock>
      </SettingsGroup>
    </div>
  );
}
