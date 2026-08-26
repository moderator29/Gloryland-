import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Gauge, Layers, Palette, Volume2 } from "lucide-react";
import { useMotionLevel, type MotionLevel } from "@/context/MotionContext";
import { useLedger } from "@/hooks/useLedger";
import { DAILY_RATE } from "@/domain/tiers";
import { money } from "@/components/system/format";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { isAmbientOn, isMuted, playTap, setMuted, startAmbient, stopAmbient } from "@/lib/sound";
import {
  SegmentedControl,
  SettingsBlock,
  SettingsGroup,
  SettingsNote,
  SettingsRow,
} from "@/components/system/SettingsUI";
import { Switch, useDisplayPrefs, type Density, type Transparency } from "@/features/profile";

/**
 * Appearance: four controls, each of which changes the page you are looking at
 * the moment it is set.
 *
 * Motion and sound were already real. Density and transparency are applied the
 * same way motion is, by stamping an attribute on the document, so the preview
 * below is not a mock up of the effect: it is the effect, on the same surfaces
 * the rest of the product is built from.
 */

const MOTION_OPTIONS: { value: MotionLevel; label: string; hint: string }[] = [
  { value: "solo", label: "Solo", hint: "Still" },
  { value: "vibe", label: "Vibe", hint: "Balanced" },
  { value: "cinema", label: "Cinema", hint: "Full" },
];

const MOTION_COPY: Record<MotionLevel, string> = {
  solo: "Animation is suppressed across the app. Figures update instantly, nothing slides or fades.",
  vibe: "The default. Transitions carry meaning, and decorative movement stays restrained.",
  cinema: "Every transition and ambient flourish runs at full length.",
};

const DENSITY_OPTIONS: { value: Density; label: string; hint: string }[] = [
  { value: "comfortable", label: "Comfortable", hint: "Default" },
  { value: "compact", label: "Compact", hint: "Tighter rows" },
];

const DENSITY_COPY: Record<Density, string> = {
  comfortable: "Rows keep their full height, and sections keep the space between them.",
  compact:
    "Ledger rows and section gaps tighten, so more of a list fits on screen. Rows stay at 48 pixels, which is still a target a thumb can hit.",
};

const TRANSPARENCY_COPY: Record<Transparency, string> = {
  full: "Floating surfaces stay translucent and blurred, which is the material the product is designed in.",
  reduced:
    "Blur is dropped and the floating surfaces are painted solid. Text sits on a flat background, and the app gets noticeably faster on an older phone.",
};

export default function SettingsAppearance() {
  const { level, setLevel } = useMotionLevel();
  // The preview shows the member's own figures rather than a sample account.
  // A settings screen is the last place a fabricated number should appear.
  const snap = useLedger();
  const reduce = useReducedMotion();
  const [display, setDisplay] = useDisplayPrefs();
  const [muted, setMutedState] = useState(isMuted);
  const [ambient, setAmbient] = useState(isAmbientOn);

  // useReducedMotion combines the OS preference with this control, so motion
  // being suppressed on any level other than Solo means the OS is asking.
  const osForcing = reduce && level !== "solo";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link to="/app/settings" className="btn btn-ghost -ml-2 !py-1.5 !text-xs">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Settings
      </Link>

      <header>
        <p className="eyebrow">Settings</p>
        <h1 className="display mt-1 text-2xl sm:text-3xl">Appearance</h1>
        <p className="mt-2 max-w-prose text-sm text-[var(--text-low)]">
          How much the interface moves, how tightly it packs, and whether it makes a sound. Every
          control here takes effect immediately.
        </p>
      </header>

      {/* ── Live preview ────────────────────────────────────────────────── */}
      <section className="glass p-4 sm:p-5" aria-label="Preview of the current settings">
        <div className="band-head">
          <h2 className="band-title">Preview</h2>
          <span className="hairline" aria-hidden="true" />
          <span className="chip chip-accent shrink-0">
            {display.density === "compact" ? "Compact" : "Comfortable"}
          </span>
        </div>

        <p className="mt-2 text-xs text-[var(--text-low)]">
          The same surfaces the rest of the product uses, reacting to the settings below.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="panel p-4">
            <p className="tag-micro">Portfolio value</p>
            <p className="figure-mid mt-2">{money(snap.portfolioValue)}</p>
            <div className="ledger mt-3">
              <div className="rail-row">
                <span className="min-w-0 flex-1 text-sm text-[var(--text)]">Open vaults</span>
                <span className="tabular text-xs text-[var(--text-mid)]">
                  {snap.activePositions.length} open at {(DAILY_RATE * 100).toFixed(0)}% a day
                </span>
              </div>
              <div className="rail-row rail-row-gain">
                <span className="min-w-0 flex-1 text-sm text-[var(--text)]">Accrued so far</span>
                <span className="tabular text-xs text-[var(--gain)]">
                  {money(snap.rewardsAccrued, 2)}
                </span>
              </div>
            </div>
          </div>

          <div className="raised p-4">
            <p className="tag-micro">A floating surface</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text)]">
              {display.transparency === "reduced"
                ? "Painted solid, with the blur switched off."
                : "Translucent, with the ground showing through."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="chip chip-gain">Accruing</span>
              <span className="chip chip-warn">Matured</span>
            </div>
            {/* A short sweep, so the motion level is visible rather than described. */}
            <div className="inset mt-3 h-2 overflow-hidden p-0">
              <motion.div
                key={`${level}-${reduce}`}
                className="h-full rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, var(--accent-deep), var(--accent), var(--accent-soft))",
                }}
                initial={reduce ? { width: "100%" } : { width: "8%" }}
                animate={{ width: "100%" }}
                transition={
                  reduce
                    ? { duration: 0 }
                    : {
                        duration: level === "cinema" ? 1.8 : 0.9,
                        ease: [0.22, 1, 0.36, 1],
                        repeat: Infinity,
                        repeatType: "reverse",
                      }
                }
              />
            </div>
            <p className="mt-2 text-[11px] text-[var(--text-low)]">
              {reduce
                ? "Still, because motion is suppressed."
                : level === "cinema"
                  ? "Running at full length."
                  : "Running at the restrained length."}
            </p>
          </div>
        </div>
      </section>

      {/* ── Motion ──────────────────────────────────────────────────────── */}
      <SettingsGroup icon={Palette} name="Motion" descriptor={level.toUpperCase()}>
        <SettingsBlock>
          <p className="text-sm font-medium text-[var(--text-hi)]">Motion level</p>
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-low)]">
            Applies to every animated surface in the app, charts and page transitions included.
          </p>
          <div className="mt-3">
            <SegmentedControl
              label="Motion level"
              value={level}
              onChange={setLevel}
              options={MOTION_OPTIONS}
            />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-[var(--text-mid)]" aria-live="polite">
            {MOTION_COPY[level]}
          </p>
        </SettingsBlock>
      </SettingsGroup>

      {osForcing && (
        <SettingsNote>
          Your system is set to reduce motion, so animation stays suppressed no matter which level
          is chosen here. Change it in your operating system settings to see Vibe or Cinema.
        </SettingsNote>
      )}

      {/* ── Density and transparency ────────────────────────────────────── */}
      <SettingsGroup
        icon={Gauge}
        name="Layout"
        descriptor={display.density === "compact" ? "COMPACT" : "COMFORTABLE"}
      >
        <SettingsBlock>
          <p className="text-sm font-medium text-[var(--text-hi)]">Density</p>
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-low)]">
            How much room rows and sections take across the whole product.
          </p>
          <div className="mt-3">
            <SegmentedControl
              label="Density"
              value={display.density}
              onChange={(density) => setDisplay({ density })}
              options={DENSITY_OPTIONS}
            />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-[var(--text-mid)]" aria-live="polite">
            {DENSITY_COPY[display.density]}
          </p>
        </SettingsBlock>

        <SettingsRow
          title="Reduced transparency"
          description="Drops the blur on floating surfaces and paints them solid"
          controlId="reduced-transparency"
          control={
            <Switch
              id="reduced-transparency"
              checked={display.transparency === "reduced"}
              label="Reduced transparency"
              onChange={(on) => setDisplay({ transparency: on ? "reduced" : "full" })}
            />
          }
        />

        <SettingsBlock>
          <p className="text-xs leading-relaxed text-[var(--text-mid)]" aria-live="polite">
            {TRANSPARENCY_COPY[display.transparency]}
          </p>
        </SettingsBlock>
      </SettingsGroup>

      {/* ── Sound ───────────────────────────────────────────────────────── */}
      <SettingsGroup icon={Volume2} name="Sound" descriptor={muted ? "OFF" : "ON"}>
        <SettingsRow
          title="Interface sound"
          description="Short tones on confirmations and taps. Nothing plays in the background."
          controlId="interface-sound"
          control={
            <Switch
              id="interface-sound"
              checked={!muted}
              label="Interface sound"
              onChange={(on) => {
                setMuted(!on);
                setMutedState(!on);
                if (!on) setAmbient(false);
                if (on) playTap();
              }}
            />
          }
        />
        <SettingsRow
          title="Ambient tone"
          description={
            muted
              ? "Turn interface sound on first. A muted app plays nothing at all."
              : "A slow chord under the app. It starts on your next tap and fades out when switched off."
          }
          controlId="ambient-tone"
          control={
            <Switch
              id="ambient-tone"
              checked={ambient}
              disabled={muted}
              label="Ambient tone"
              onChange={(on) => {
                if (on) startAmbient();
                else stopAmbient();
                setAmbient(isAmbientOn());
              }}
            />
          }
        />
      </SettingsGroup>

      <SettingsGroup icon={Layers} name="Where this is kept" descriptor="This browser">
        <SettingsBlock>
          <ul className="space-y-2 text-xs leading-relaxed text-[var(--text-mid)]">
            <li className="flex items-start gap-2">
              <Check
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent-hi)]"
                aria-hidden="true"
              />
              <span>
                Motion under <span className="machine">rgl_motion_v1</span>, density and
                transparency under <span className="machine">rgl_display_v1</span>, sound under{" "}
                <span className="machine">rgl_muted</span> and{" "}
                <span className="machine">rgl_ambient</span>.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Check
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent-hi)]"
                aria-hidden="true"
              />
              <span>
                None of it is sent anywhere, and none of it follows you to another browser or
                device.
              </span>
            </li>
          </ul>
        </SettingsBlock>
      </SettingsGroup>

      <SettingsNote>
        Sound needs one tap anywhere on the page before a browser will let it play, which is a rule
        of the browser rather than a setting here.
      </SettingsNote>
    </div>
  );
}
