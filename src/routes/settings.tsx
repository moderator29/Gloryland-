import { useState } from "react";
import { Settings as SettingsIcon, Save, LogOut, Volume2, Smile } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { RouteShell } from "@/components/RouteShell";
import { Stagger, StaggerItem } from "@/components/Stagger";
import { useUser } from "@/context/UserContext";
import { useMotionLevel, type MotionLevel } from "@/context/MotionContext";
import { isMuted, setMuted, startAmbient, stopAmbient, isAmbientOn } from "@/lib/sound";
import { playTap } from "@/lib/sound";
import { tap as hapticTap } from "@/lib/haptic";

const MOTION_OPTIONS: { value: MotionLevel; label: string; hint: string }[] = [
  { value: "solo", label: "Solo", hint: "Quiet. Minimal motion." },
  { value: "vibe", label: "Vibe", hint: "Default. Balanced." },
  { value: "cinema", label: "Cinema", hint: "Maximal. Full theatre." },
];

const CURRENCIES = ["USD", "EUR", "GBP", "BRL", "NGN", "INR", "JPY"];

const CURRENCY_KEY = "hal_currency_override_v1";

export default function Settings() {
  const { username, setUsername, logout } = useUser();
  const { level, setLevel } = useMotionLevel();
  const [name, setName] = useState(username ?? "");
  const [muted, setMutedState] = useState(isMuted());
  const [ambient, setAmbient] = useState(isAmbientOn());
  const [currency, setCurrency] = useState<string>(() => {
    try {
      return localStorage.getItem(CURRENCY_KEY) ?? "AUTO";
    } catch {
      return "AUTO";
    }
  });

  const save = () => {
    if (name.trim()) setUsername(name.trim());
    try {
      if (currency === "AUTO") localStorage.removeItem(CURRENCY_KEY);
      else localStorage.setItem(CURRENCY_KEY, currency);
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: CURRENCY_KEY,
          newValue: currency === "AUTO" ? null : currency,
        }),
      );
    } catch {
      /* ignore */
    }
    playTap();
    hapticTap();
    toast.success("Settings saved.", { duration: 1500 });
  };

  return (
    <RouteShell>
      <div className="min-h-screen pb-28">
        <SiteHeader />

        <main className="mx-auto max-w-2xl space-y-6 px-5 py-6">
          <Stagger className="space-y-6">
            <StaggerItem>
              <header>
                <span className="chip">
                  <SettingsIcon className="h-3 w-3 text-primary" />
                  Settings
                </span>
                <h1 className="mt-3 font-display text-4xl">
                  Make it <em className="not-italic text-gradient-gold">yours</em>
                </h1>
              </header>
            </StaggerItem>

            <StaggerItem>
              <section className="glass-luxury p-5">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Profile</p>
                <label className="mt-3 block">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Display name
                  </span>
                  <div className="coin-slot mt-1 flex items-center gap-3 px-4 py-3">
                    <Smile className="h-4 w-4 text-muted-foreground" />
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={28}
                      className="flex-1 bg-transparent text-base outline-none"
                    />
                  </div>
                </label>
              </section>
            </StaggerItem>

            <StaggerItem>
              <section className="glass-luxury p-5">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Motion intensity
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {MOTION_OPTIONS.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => {
                        setLevel(m.value);
                        playTap();
                        hapticTap();
                      }}
                      className={`rounded-2xl border px-3 py-2.5 text-left transition-colors ${
                        level === m.value
                          ? "border-primary/60 bg-primary/10 text-primary"
                          : "border-border/60 bg-black/30 text-muted-foreground hover:text-white"
                      }`}
                    >
                      <p className="text-sm font-medium">{m.label}</p>
                      <p className="text-[10px] opacity-80">{m.hint}</p>
                    </button>
                  ))}
                </div>
              </section>
            </StaggerItem>

            <StaggerItem>
              <section className="glass-luxury p-5">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Sound</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      const next = !muted;
                      setMuted(next);
                      setMutedState(next);
                      if (next) {
                        stopAmbient();
                        setAmbient(false);
                      }
                    }}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition-colors ${
                      muted
                        ? "border-border/60 bg-black/30 text-muted-foreground"
                        : "border-primary/60 bg-primary/10 text-primary"
                    }`}
                  >
                    Effects
                    <Volume2 className="h-4 w-4" />
                  </button>
                  <button
                    disabled={muted}
                    onClick={() => {
                      if (ambient) {
                        stopAmbient();
                        setAmbient(false);
                      } else {
                        startAmbient();
                        setAmbient(isAmbientOn());
                      }
                    }}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition-colors disabled:opacity-40 ${
                      ambient
                        ? "border-primary/60 bg-primary/10 text-primary"
                        : "border-border/60 bg-black/30 text-muted-foreground"
                    }`}
                  >
                    Ambient pad
                    <span className="text-[10px] opacity-80">{ambient ? "On" : "Off"}</span>
                  </button>
                </div>
              </section>
            </StaggerItem>

            <StaggerItem>
              <section className="glass-luxury p-5">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Currency</p>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {["AUTO", ...CURRENCIES].map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setCurrency(c);
                        playTap();
                        hapticTap();
                      }}
                      className={`font-numeric rounded-2xl border px-3 py-2 text-sm transition-colors ${
                        currency === c
                          ? "border-primary/60 bg-primary/10 text-primary"
                          : "border-border/60 bg-black/30 text-muted-foreground hover:text-white"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground/70">
                  AUTO uses your IP. Change to lock a currency.
                </p>
              </section>
            </StaggerItem>

            <StaggerItem>
              <div className="flex items-center gap-2">
                <button
                  onClick={save}
                  className="btn-foil flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm"
                >
                  <Save className="h-4 w-4" /> Save Changes
                </button>
                <button
                  onClick={() => {
                    playTap();
                    hapticTap();
                    logout();
                  }}
                  className="btn-press-through inline-flex items-center gap-2 px-5 py-2.5 text-sm"
                >
                  <LogOut className="h-4 w-4" /> Log out
                </button>
              </div>
            </StaggerItem>
          </Stagger>
        </main>
      </div>
    </RouteShell>
  );
}
