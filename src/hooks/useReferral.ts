import { useEffect, useState } from "react";

const KEY = "hal_referral_v1";

export function useReferral() {
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const ref = url.searchParams.get("ref");
    if (ref) {
      try {
        localStorage.setItem(KEY, ref);
      } catch {
        /* ignore */
      }
      setCode(ref);
      return;
    }
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) setCode(stored);
    } catch {
      /* ignore */
    }
  }, []);

  return code;
}

export function generateReferralLink(): string {
  if (typeof window === "undefined") return "";
  let code = "";
  try {
    code = localStorage.getItem("hal_my_ref") || "";
  } catch {
    /* ignore */
  }
  if (!code) {
    code = Math.random().toString(36).slice(2, 8).toUpperCase();
    try {
      localStorage.setItem("hal_my_ref", code);
    } catch {
      /* ignore */
    }
  }
  const url = new URL(window.location.origin);
  url.searchParams.set("ref", code);
  return url.toString();
}
