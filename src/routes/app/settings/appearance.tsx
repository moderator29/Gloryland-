import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Palette, Volume2 } from "lucide-react";
import { useMotionLevel, type MotionLevel } from "@/context/MotionContext";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { isMuted, setMuted, playTap } from "@/lib/sound";
import {
  SegmentedControl,
  SettingsBlock,
  SettingsGroup,
  SettingsNote,
  SettingsRow,
  Toggle,
} from "@/components/system/SettingsUI";

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

export default function SettingsAppearance() {
  const { level, setLevel } = useMotionLevel();
  const reduce = useReducedMotion();
  const [muted, setMutedState] = useState(isMuted);

  // useReducedMotion combines the OS preference with this control, so motion
  // being suppressed on any level other than Solo means the OS is asking.
  const osForcing = reduce && level !== "solo";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link to="/app/settings" className="btn btn-ghost -ml-2 !py-1.5 !text-xs">
        <ArrowLeft className="h-4 w-4" /> Settings
      </Link>

      <header>
        <p className="eyebrow">Settings</p>
        <h1 className="display mt-1 text-2xl sm:text-3xl">Appearance</h1>
        <p className="mt-2 text-sm text-[var(--text-low)]">
          How much the interface moves, and whether it makes a sound.
        </p>
      </header>

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
          <p className="mt-3 text-xs leading-relaxed text-[var(--text-mid)]">
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

      <SettingsGroup icon={Volume2} name="Sound" descriptor={muted ? "OFF" : "ON"}>
        <SettingsRow
          title="Interface sound"
          description="Short tones on confirmations and taps. Nothing plays in the background."
          control={
            <Toggle
              checked={!muted}
              label="Interface sound"
              onChange={(v) => {
                setMuted(!v);
                setMutedState(!v);
                if (v) playTap();
              }}
            />
          }
        />
      </SettingsGroup>

      <SettingsNote>
        Both preferences are stored in this browser. Sound needs one tap anywhere on the page before
        a browser will let it play.
      </SettingsNote>
    </div>
  );
}
