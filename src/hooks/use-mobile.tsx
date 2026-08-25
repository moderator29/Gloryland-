import { useEffect, useState } from "react";

const BREAKPOINT = 768;

/** True on viewports narrower than the tablet breakpoint. */
export function useIsMobile() {
  const [mobile, setMobile] = useState(() =>
    typeof window === "undefined" ? false : window.innerWidth < BREAKPOINT,
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${BREAKPOINT - 1}px)`);
    const onChange = () => setMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return mobile;
}
