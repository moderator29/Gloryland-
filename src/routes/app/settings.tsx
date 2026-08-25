import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Save, Trash2, Volume2, VolumeX, Zap, FileText, ShieldCheck } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { useLedger } from "@/hooks/useLedger";
import { clearLedger } from "@/domain/ledger";
import { useArmedAction } from "@/hooks/useArmedAction";
import { useMotionLevel } from "@/context/MotionContext";
import { isMuted, setMuted } from "@/lib/sound";
import { SectionHeader, NavRow } from "@/components/system/ui";
import { money } from "@/components/system/format";

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? "bg-[var(--accent)]" : "bg-[var(--ink-300)]"
      }`}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
        style={{ left: 2, transform: `translateX(${checked ? 20 : 0}px)` }}
      />
    </button>
  );
}

export default function Settings() {
  const { username, setUsername } = useUser();
  const snap = useLedger();
  const [name, setName] = useState(username ?? "");
  const [muted, setMutedState] = useState(isMuted);
  const { level, setLevel } = useMotionLevel();

  const [resetArmed, requestReset] = useArmedAction(() => {
    clearLedger();
    toast.success("Ledger cleared. Your account is back to a clean slate.");
  });

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setUsername(trimmed);
    toast.success("Profile updated");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="eyebrow">Account</p>
        <h1 className="display mt-1 text-2xl sm:text-3xl">Settings</h1>
      </div>

      <section className="panel p-5">
        <SectionHeader title="Profile" />
        <label htmlFor="name" className="eyebrow">
          Display name
        </label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-[var(--line-hi)] bg-[rgba(5,7,15,0.6)] px-3.5 py-3 text-sm outline-none focus:border-[var(--accent)]"
        />
        <button onClick={save} disabled={!name.trim()} className="btn btn-primary mt-3">
          <Save className="h-4 w-4" /> Save
        </button>
      </section>

      <section className="panel p-5">
        <SectionHeader title="Preferences" />
        <div className="space-y-1">
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-[rgba(46,139,255,0.07)]">
              {muted ? (
                <VolumeX className="h-4 w-4 text-[var(--text-low)]" />
              ) : (
                <Volume2 className="h-4 w-4 text-[var(--accent-hi)]" />
              )}
            </span>
            <span className="flex-1">
              <span className="block text-sm font-medium text-[var(--text-hi)]">
                Interface sound
              </span>
              <span className="block text-xs text-[var(--text-low)]">
                Subtle feedback on actions
              </span>
            </span>
            <Toggle
              checked={!muted}
              label="Interface sound"
              onChange={(v) => {
                setMuted(!v);
                setMutedState(!v);
              }}
            />
          </div>

          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--line)] bg-[rgba(46,139,255,0.07)]">
              <Zap className="h-4 w-4 text-[var(--accent-hi)]" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-medium text-[var(--text-hi)]">
                Reduced motion
              </span>
              <span className="block text-xs text-[var(--text-low)]">
                Minimise animation across the app
              </span>
            </span>
            <Toggle
              checked={level === "solo"}
              label="Reduced motion"
              onChange={(v) => setLevel(v ? "solo" : "vibe")}
            />
          </div>
        </div>
      </section>

      <section className="panel p-5">
        <SectionHeader title="Legal" />
        <div className="space-y-1">
          <NavRow icon={ShieldCheck} title="Privacy Policy" to="/legal/privacy" />
          <NavRow icon={FileText} title="Terms of Service" to="/legal/terms" />
          <NavRow icon={FileText} title="Risk Disclosure" to="/legal/risk" />
        </div>
      </section>

      <section className="panel border-[rgba(248,113,113,0.28)] p-5">
        <SectionHeader
          title="Reset account"
          hint={`Clears ${snap.events.length} recorded events and ${money(snap.portfolioValue)} of position data`}
        />
        <p className="mb-3 text-xs leading-relaxed text-[var(--text-low)]">
          This build stores your ledger in this browser. Resetting removes every vault, claim and
          withdrawal permanently. It cannot be undone.
        </p>
        <button onClick={requestReset} className="btn btn-danger">
          <Trash2 className="h-4 w-4" />
          {resetArmed ? "Tap again to erase everything" : "Reset account"}
        </button>
      </section>

      <p className="pb-2 text-center text-[11px] text-[var(--text-low)]">
        <Link to="/" className="underline-offset-2 hover:underline">
          Return to the public site
        </Link>
      </p>
    </div>
  );
}
