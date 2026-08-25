import { useEffect, useRef, useState } from "react";

/**
 * Two-tap guard for destructive actions: the first call arms for `windowMs`,
 * the second within the window fires. Returns [armed, trigger].
 */
export function useArmedAction(action: () => void, windowMs = 3000): [boolean, () => void] {
  const [armed, setArmed] = useState(false);
  const timer = useRef<number>(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const trigger = () => {
    if (armed) {
      window.clearTimeout(timer.current);
      setArmed(false);
      action();
      return;
    }
    setArmed(true);
    timer.current = window.setTimeout(() => setArmed(false), windowMs);
  };

  return [armed, trigger];
}
