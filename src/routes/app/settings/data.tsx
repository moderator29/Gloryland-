import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  ClipboardCopy,
  Database,
  Download,
  FileJson,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { clearLedger, loadEvents } from "@/domain/ledger";
import { useLedger } from "@/hooks/useLedger";
import { useArmedAction } from "@/hooks/useArmedAction";
import {
  SegmentedControl,
  SettingsBlock,
  SettingsGroup,
  SettingsNote,
  SettingsRow,
} from "@/components/system/SettingsUI";
import { fullDate, money } from "@/components/system/format";
import {
  ConfirmErase,
  applyLedgerFile,
  buildLedgerFile,
  downloadFile,
  fileStamp,
  formatBytes,
  inspectLedgerFile,
  measureStorage,
  toCsv,
  type ImportMode,
  type InspectResult,
} from "@/features/profile";

/**
 * Data: the ledger as a file, in both directions.
 *
 * Export is the only copy of this account that survives clearing site data, so
 * it is the first thing on the page. Import is the harder half: a file is read,
 * checked event by event, and reported back before a single thing is written.
 * The member sees what the file holds and what was refused, and only then is
 * there a button to apply it.
 */

const MODES: { value: ImportMode; label: string; hint: string }[] = [
  { value: "merge", label: "Merge", hint: "Add to what is here" },
  { value: "replace", label: "Replace", hint: "Erase, then import" },
];

export default function SettingsData() {
  const snap = useLedger();
  const count = snap.events.length;

  // Measured on arrival and after every write, rather than on each render: the
  // ledger tick re-renders this page every few seconds and reading the whole
  // store that often would cost more than the figure is worth.
  const [storage, setStorage] = useState(measureStorage);
  useEffect(() => {
    setStorage(measureStorage());
  }, [count]);
  const ledgerKey = storage.keys.find((k) => k.key === "rgl_ledger_v1");

  const fileInput = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [report, setReport] = useState<InspectResult | null>(null);
  const [mode, setMode] = useState<ImportMode>("merge");

  const exportJson = () => {
    const events = loadEvents();
    const payload = buildLedgerFile(snap, events);
    downloadFile(
      `rigel-ledger-${fileStamp()}.json`,
      "application/json",
      JSON.stringify(payload, null, 2),
    );
    toast.success(`Exported ${events.length} events as JSON`);
  };

  const exportCsv = () => {
    const events = loadEvents();
    downloadFile(`rigel-ledger-${fileStamp()}.csv`, "text/csv;charset=utf-8", toCsv(events));
    toast.success(`Exported ${events.length} events as CSV`);
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(buildLedgerFile(snap, loadEvents())));
      toast.success("Ledger copied to the clipboard as JSON");
    } catch {
      toast.error("This browser would not allow the copy. Use the download instead.");
    }
  };

  const chooseFile = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    try {
      const text = await file.text();
      const result = inspectLedgerFile(text);
      setReport(result);
      if (!result.ok) toast.error("Nothing in that file could be applied");
    } catch {
      setReport(null);
      toast.error("That file could not be read");
    }
  };

  const runImport = () => {
    if (!report?.ok) return;
    const written = applyLedgerFile(report.events, mode);
    toast.success(
      mode === "replace"
        ? `Ledger replaced with ${written} events from the file`
        : `${written} events added to your ledger`,
    );
    setReport(null);
    setFileName(null);
    if (fileInput.current) fileInput.current.value = "";
  };

  // Replacing erases what is already here, so it takes a second deliberate tap.
  // Merging adds, and does not.
  const [replaceArmed, requestReplace] = useArmedAction(runImport);
  const apply = () => {
    if (mode === "replace" && count > 0) requestReplace();
    else runImport();
  };

  const erase = () => {
    clearLedger();
    toast.success("Ledger erased. Every event is gone from this browser.");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link to="/app/settings" className="btn btn-ghost -ml-2 !py-1.5 !text-xs">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Settings
      </Link>

      <header>
        <p className="eyebrow">Settings</p>
        <h1 className="display mt-1 text-2xl sm:text-3xl">Data</h1>
        <p className="mt-2 max-w-prose text-sm text-[var(--text-low)]">
          Take a copy of your ledger, restore one, or erase it. Everything on this page happens in
          this browser.
        </p>
      </header>

      {/* ── What is here ────────────────────────────────────────────────── */}
      <SettingsGroup icon={Database} name="Your ledger" descriptor={`${count} events`}>
        <SettingsRow
          title="Recorded events"
          description="Every vault opened, reward claimed, position closed and withdrawal made"
          control={<span className="tabular text-sm font-medium">{count}</span>}
        />
        <SettingsRow
          title="Capital brought in"
          description="External capital only. Anything re-placed from your balance is not counted twice."
          control={<span className="tabular text-sm font-medium">{money(snap.contributed)}</span>}
        />
        <SettingsRow
          title="Standing"
          description="The greater of capital brought in and the most ever deployed at once"
          control={<span className="tabular text-sm font-medium">{money(snap.standing)}</span>}
        />
        <SettingsRow
          title="Portfolio value"
          description="Deployed capital, pending rewards and available cash"
          control={
            <span className="tabular text-sm font-medium">{money(snap.portfolioValue)}</span>
          }
        />
        <SettingsRow
          title="Size on this device"
          description="Measured from the key the ledger is written to"
          control={
            <span className="tabular text-sm font-medium">
              {ledgerKey ? formatBytes(ledgerKey.bytes) : "0 B"}
            </span>
          }
        />
      </SettingsGroup>

      {/* ── Export ──────────────────────────────────────────────────────── */}
      <SettingsGroup icon={Download} name="Export" descriptor="Local file">
        <SettingsBlock>
          <p className="text-sm font-medium text-[var(--text-hi)]">Download a copy</p>
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-low)]">
            The file is built in this browser and saved straight to your device. Nothing is
            uploaded. JSON keeps the full event log and can be imported back. CSV opens in a
            spreadsheet and is for reading, not restoring.
          </p>
          <div className="mt-3.5 flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={exportJson}
              disabled={count === 0}
              className="btn btn-secondary min-h-[44px] flex-1"
            >
              <FileJson className="h-4 w-4" aria-hidden="true" /> Export JSON
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={count === 0}
              className="btn btn-outline min-h-[44px] flex-1"
            >
              <Download className="h-4 w-4" aria-hidden="true" /> Export CSV
            </button>
            <button
              type="button"
              onClick={() => void copyJson()}
              disabled={count === 0}
              className="btn btn-ghost min-h-[44px] flex-1"
            >
              <ClipboardCopy className="h-4 w-4" aria-hidden="true" /> Copy JSON
            </button>
          </div>
          {count === 0 && (
            <p className="mt-2.5 text-xs text-[var(--text-low)]">
              There is nothing to export yet. Open a vault and the log starts recording.
            </p>
          )}
        </SettingsBlock>
      </SettingsGroup>

      {/* ── Import ──────────────────────────────────────────────────────── */}
      <SettingsGroup icon={Upload} name="Import" descriptor="Checked first">
        <SettingsBlock>
          <label htmlFor="ledger-file" className="text-sm font-medium text-[var(--text-hi)]">
            Restore from an export
          </label>
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-low)]">
            Choose a JSON file exported from Rigel. It is read and checked here, and nothing is
            written until you apply it.
          </p>
          <input
            id="ledger-file"
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            onChange={(e) => void chooseFile(e.target.files?.[0])}
            className="mt-3 block w-full text-xs text-[var(--text-mid)] file:mr-3 file:min-h-[44px] file:cursor-pointer file:rounded-xl file:border file:border-[rgba(46,139,255,0.34)] file:bg-[rgba(46,139,255,0.1)] file:px-4 file:py-3 file:text-sm file:font-semibold file:text-[var(--accent-hi)]"
          />

          {report && (
            <div className="mt-4" aria-live="polite">
              <div className="inset p-3.5">
                <p className="tag-micro">{fileName ?? "Selected file"}</p>
                {report.ok ? (
                  <>
                    <p className="metric mt-2 text-lg">
                      {report.events.length} {report.events.length === 1 ? "event" : "events"} ready
                    </p>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
                      {Object.entries(report.counts).map(([kind, n]) => (
                        <div key={kind} className="flex items-baseline justify-between gap-2">
                          <dt className="truncate text-[var(--text-low)]">{kind}</dt>
                          <dd className="tabular text-[var(--text-hi)]">{n}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="mt-3 text-xs leading-relaxed text-[var(--text-mid)]">
                      {report.earliest !== null && report.latest !== null
                        ? `Covering ${fullDate(report.earliest)} to ${fullDate(report.latest)}. `
                        : ""}
                      Capital brought in across the file: {money(report.contributed)}.
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-[var(--loss)]">
                    Nothing in this file can be applied.
                  </p>
                )}

                {report.problems.length > 0 && (
                  <ul className="mt-3 space-y-1.5 border-t border-[var(--line)] pt-3">
                    {report.problems.slice(0, 6).map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-[var(--warn)]">
                        <TriangleAlert
                          className="mt-0.5 h-3 w-3 shrink-0"
                          aria-hidden="true"
                          strokeWidth={2}
                        />
                        <span>{p}</span>
                      </li>
                    ))}
                    {report.problems.length > 6 && (
                      <li className="text-xs text-[var(--text-low)]">
                        and {report.problems.length - 6} more
                      </li>
                    )}
                  </ul>
                )}
              </div>

              {report.ok && (
                <>
                  <div className="mt-3.5">
                    <SegmentedControl
                      label="How to apply the file"
                      value={mode}
                      onChange={setMode}
                      options={MODES}
                    />
                  </div>
                  <p className="mt-2.5 text-xs leading-relaxed text-[var(--text-mid)]">
                    {mode === "merge"
                      ? `Merge adds these events alongside the ${count} already here. Importing the same file twice would record everything twice.`
                      : `Replace erases the ${count} events in this browser first, then imports the file. There is no undo.`}
                  </p>
                  <button
                    type="button"
                    onClick={apply}
                    className={`btn mt-3 min-h-[44px] w-full ${
                      mode === "replace" ? "btn-danger" : "btn-primary"
                    }`}
                  >
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    {mode === "replace"
                      ? replaceArmed
                        ? "Tap again to erase and import"
                        : `Replace ${count} events with ${report.events.length}`
                      : `Add ${report.events.length} events`}
                  </button>
                  {replaceArmed && (
                    <p className="mt-2 text-xs text-[var(--loss)]" role="alert">
                      Waiting for a second tap. Do nothing for a moment to cancel.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </SettingsBlock>
      </SettingsGroup>

      <SettingsNote>
        Claims and closes point at the position they belong to. An import rewrites those links as it
        writes, so a restored ledger derives exactly the figures the original did. Anything pointing
        at a position the file does not contain is left out and counted in the report above.
      </SettingsNote>

      {/* ── Erase ───────────────────────────────────────────────────────── */}
      <SettingsGroup
        icon={TriangleAlert}
        name="Erase the ledger"
        descriptor="Permanent"
        tone="danger"
      >
        <SettingsBlock>
          <ConfirmErase
            phrase="ERASE"
            actionLabel="Erase ledger"
            onConfirm={erase}
            disabled={count === 0}
            disabledNote="Your ledger is already empty, so there is nothing to erase."
          >
            <p>
              This removes {count} recorded {count === 1 ? "event" : "events"} and{" "}
              {money(snap.portfolioValue)} of position data. Every vault, claim, close and
              withdrawal goes with it, and every figure in the product is derived from those events,
              so all of them return to zero.
            </p>
            <p className="mt-2">
              Export first if you want a copy. Your name, handle and preferences are left alone.
            </p>
          </ConfirmErase>
        </SettingsBlock>
      </SettingsGroup>

      <p className="pb-2 text-center text-[11px] leading-relaxed text-[var(--text-low)]">
        Your ledger lives under <span className="machine">rgl_ledger_v1</span> in this browser.{" "}
        <Link to="/app/security" className="underline underline-offset-2">
          Security
        </Link>{" "}
        lists every other key alongside it.
      </p>
    </div>
  );
}
