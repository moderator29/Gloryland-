import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Check, Save, User } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { useLedger } from "@/hooks/useLedger";
import {
  SettingsBlock,
  SettingsGroup,
  SettingsNote,
  SettingsRow,
} from "@/components/system/SettingsUI";
import { fullDate, money } from "@/components/system/format";

export default function SettingsProfile() {
  const { username, setUsername } = useUser();
  const snap = useLedger();
  const [name, setName] = useState(username ?? "");
  const [saved, setSaved] = useState(false);
  const timer = useRef<number>(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const trimmed = name.trim();
  const dirty = trimmed !== (username ?? "") && trimmed.length > 0;

  const save = () => {
    if (!dirty) return;
    setUsername(trimmed);
    setSaved(true);
    toast.success("Display name updated");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSaved(false), 2600);
  };

  const firstEvent = snap.events.length ? snap.events[snap.events.length - 1] : null;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link to="/app/settings" className="btn btn-ghost -ml-2 !py-1.5 !text-xs">
        <ArrowLeft className="h-4 w-4" /> Settings
      </Link>

      <header>
        <p className="eyebrow">Settings</p>
        <h1 className="display mt-1 text-2xl sm:text-3xl">Profile</h1>
        <p className="mt-2 text-sm text-[var(--text-low)]">How you are addressed across the app.</p>
      </header>

      <SettingsGroup icon={User} name="Identity" descriptor="This browser">
        <SettingsBlock>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <label htmlFor="display-name" className="eyebrow">
              Display name
            </label>
            <div className="mt-2 flex flex-col gap-2.5 sm:flex-row">
              <input
                id="display-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (saved) setSaved(false);
                }}
                maxLength={40}
                autoComplete="nickname"
                aria-describedby="display-name-help"
                className="min-w-0 flex-1 rounded-xl border border-[var(--line-hi)] bg-[rgba(5,7,15,0.6)] px-3.5 py-3 text-sm text-[var(--text-hi)] outline-none transition-colors focus:border-[var(--accent)]"
              />
              <button
                type="submit"
                disabled={!dirty}
                className={`btn shrink-0 ${saved && !dirty ? "btn-secondary" : "btn-primary"}`}
              >
                {saved && !dirty ? (
                  <>
                    <Check className="h-4 w-4" /> Saved
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" /> Save name
                  </>
                )}
              </button>
            </div>
            <p id="display-name-help" className="mt-2 text-xs text-[var(--text-low)]">
              {dirty
                ? `Press save to change from "${username ?? "no name set"}" to "${trimmed}".`
                : saved
                  ? "Saved. The new name is in use across the app."
                  : "Up to 40 characters. Shown in the sidebar and on the desk."}
            </p>
          </form>
        </SettingsBlock>

        <SettingsRow
          title="Current name"
          description="What the app calls you right now"
          control={
            <span className="max-w-[10rem] truncate text-sm font-medium text-[var(--text-hi)]">
              {username ?? "Not set"}
            </span>
          }
        />
        <SettingsRow
          title="Contributed to date"
          description={
            snap.tier ? `Standing at ${snap.tier.name}` : "No position opened yet on this browser"
          }
          control={<span className="tabular text-sm font-medium">{money(snap.contributed)}</span>}
        />
        <SettingsRow
          title="First recorded event"
          description="The earliest entry in your local ledger"
          control={
            <span className="text-sm font-medium text-[var(--text-mid)]">
              {firstEvent ? fullDate(firstEvent.at) : "None yet"}
            </span>
          }
        />
      </SettingsGroup>

      <SettingsNote>
        Your name is kept in this browser only. It is not sent anywhere, and clearing site data will
        remove it along with the rest of your ledger.
      </SettingsNote>
    </div>
  );
}
