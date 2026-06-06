import { useState } from "react";
import { Volume2, VolumeX, Waves } from "lucide-react";
import { isMuted, setMuted, startAmbient, stopAmbient, isAmbientOn } from "@/lib/sound";

export function SoundToggle() {
  const [muted, setMutedState] = useState(isMuted());
  const [ambient, setAmbient] = useState(isAmbientOn());

  return (
    <div className="flex items-center gap-1">
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
        title={muted ? "Unmute" : "Mute"}
        className="grid h-7 w-7 place-items-center rounded-full border border-border/50 text-muted-foreground transition-colors hover:text-primary"
      >
        {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
      </button>
      <button
        onClick={() => {
          if (ambient) {
            stopAmbient();
            setAmbient(false);
          } else {
            startAmbient();
            setAmbient(isAmbientOn());
          }
        }}
        disabled={muted}
        title={ambient ? "Stop ambient pad" : "Play ambient pad"}
        className={`grid h-7 w-7 place-items-center rounded-full border border-border/50 transition-colors disabled:opacity-30 ${
          ambient
            ? "text-primary ring-1 ring-primary/40"
            : "text-muted-foreground hover:text-primary"
        }`}
      >
        <Waves className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
