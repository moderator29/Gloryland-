import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X } from "lucide-react";
import { BRAND_FULL } from "@/lib/site-config";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "hal_pwa_dismissed_v1";

export function PwaInstall() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(DISMISS_KEY)) {
      setHidden(true);
      return;
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const install = async () => {
    if (!evt) return;
    await evt.prompt();
    await evt.userChoice;
    setEvt(null);
  };
  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setHidden(true);
  };

  const show = evt && !hidden;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className="fixed inset-x-4 bottom-24 z-30 mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-primary/40 bg-black/70 p-3 pl-4 backdrop-blur-xl"
        >
          <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/15">
            <Download className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Install {BRAND_FULL}</p>
            <p className="text-[11px] text-muted-foreground">
              One tap. Native feel. Offline ready.
            </p>
          </div>
          <button onClick={install} className="btn-gold px-3 py-1.5 text-xs">
            Install
          </button>
          <button
            onClick={dismiss}
            className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:text-primary"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
