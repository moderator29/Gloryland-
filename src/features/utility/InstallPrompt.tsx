import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { Mark } from "@/components/brand/Mark";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Install prompt.
 *
 * Two entirely different mechanisms wear one face here. Chromium fires
 * `beforeinstallprompt`, which we capture and replay on a real click. iOS
 * Safari never fires it and never will, so the only honest thing to offer
 * there is the manual route through the Share sheet. Detecting the browser is
 * usually a smell; in this one case the platforms genuinely differ.
 *
 * Dismissal is permanent. Someone who said no to installing an app does not
 * want to be asked again next week.
 */

export const INSTALL_DISMISSED_KEY = "rgl_install_dismissed";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function alreadyInstalled(): boolean {
  if (typeof window === "undefined") return true;
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return standalone || iosStandalone === true;
}

/** iOS Safari, which supports home screen apps but never offers the event. */
function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (!ios) return false;
  // Chrome and Firefox on iOS cannot add to the home screen from their own menus.
  return !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}

function wasDismissed(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(INSTALL_DISMISSED_KEY) !== null;
  } catch {
    return false;
  }
}

export type InstallPromptProps = {
  className?: string;
};

export function InstallPrompt({ className = "" }: InstallPromptProps) {
  const reduce = useReducedMotion();
  const [deferred, setDeferred] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [gone, setGone] = useState(() => wasDismissed() || alreadyInstalled());

  useEffect(() => {
    if (gone) return;

    const onBeforeInstall = (e: Event) => {
      // Suppress the browser's own mini bar so ours is the only ask.
      e.preventDefault();
      setDeferred(e as InstallEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setGone(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // iOS gets the manual card, and only after a beat so it does not collide
    // with whatever the member opened the page to do.
    let timer = 0;
    if (isIosSafari()) timer = window.setTimeout(() => setIos(true), 2500);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      window.clearTimeout(timer);
    };
  }, [gone]);

  const dismiss = () => {
    try {
      localStorage.setItem(INSTALL_DISMISSED_KEY, String(Date.now()));
    } catch {
      /* a blocked store only means the card returns next visit */
    }
    setGone(true);
  };

  const install = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      /* the member closed the browser sheet, which is not an error */
    }
    setDeferred(null);
    setGone(true);
  };

  const show = !gone && (deferred !== null || ios);
  const manual = deferred === null;

  return (
    <AnimatePresence>
      {show && (
        <motion.aside
          aria-label="Install Rigel"
          className={`raised fixed bottom-24 left-3 right-[4.5rem] z-40 rounded-2xl p-4 sm:bottom-6 sm:left-6 sm:right-auto sm:w-[22rem] ${className}`}
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: 16 }}
          transition={{ duration: reduce ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-start gap-3">
            <Mark size={34} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--text-hi)]">Install Rigel</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-mid)]">
                {manual
                  ? "Add it to your home screen for a full screen view and faster access."
                  : "Install the app for a full screen view, faster launches and offline shell."}
              </p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss install prompt"
              className="btn btn-ghost -mr-1.5 -mt-1.5 shrink-0 px-2 py-2"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {manual ? (
            <ol className="mt-3.5 space-y-2">
              <li className="inset flex items-center gap-2.5 px-3 py-2.5 text-xs text-[var(--text)]">
                <Share className="h-4 w-4 shrink-0 text-[var(--accent-hi)]" aria-hidden="true" />
                <span>
                  Tap <span className="font-semibold text-[var(--text-hi)]">Share</span> in the
                  Safari toolbar
                </span>
              </li>
              <li className="inset flex items-center gap-2.5 px-3 py-2.5 text-xs text-[var(--text)]">
                <SquarePlus
                  className="h-4 w-4 shrink-0 text-[var(--accent-hi)]"
                  aria-hidden="true"
                />
                <span>
                  Choose{" "}
                  <span className="font-semibold text-[var(--text-hi)]">Add to Home Screen</span>
                </span>
              </li>
            </ol>
          ) : (
            <div className="mt-3.5 flex items-center gap-2.5">
              <button type="button" onClick={install} className="btn btn-primary flex-1">
                <Download className="h-4 w-4" /> Install
              </button>
              <button type="button" onClick={dismiss} className="btn btn-ghost">
                Not now
              </button>
            </div>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
