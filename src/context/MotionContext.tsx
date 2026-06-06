import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type MotionLevel = "solo" | "vibe" | "cinema";

const KEY = "ec_motion_level_v1";

type Ctx = {
  level: MotionLevel;
  setLevel: (v: MotionLevel) => void;
};

const MotionCtx = createContext<Ctx | null>(null);

function read(): MotionLevel {
  if (typeof window === "undefined") return "vibe";
  try {
    const raw = localStorage.getItem(KEY) as MotionLevel | null;
    if (raw === "solo" || raw === "vibe" || raw === "cinema") return raw;
  } catch {
    /* ignore */
  }
  return "vibe";
}

export function MotionProvider({ children }: { children: ReactNode }) {
  const [level, setLevelState] = useState<MotionLevel>(read);

  useEffect(() => {
    document.documentElement.dataset.motion = level;
    try {
      localStorage.setItem(KEY, level);
    } catch {
      /* ignore */
    }
  }, [level]);

  return (
    <MotionCtx.Provider value={{ level, setLevel: setLevelState }}>{children}</MotionCtx.Provider>
  );
}

export function useMotionLevel() {
  const ctx = useContext(MotionCtx);
  if (!ctx) throw new Error("useMotionLevel must be used inside MotionProvider");
  return ctx;
}
