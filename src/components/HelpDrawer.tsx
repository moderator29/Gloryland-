import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X } from "lucide-react";
import { playTap } from "@/lib/sound";
import { tap as hapticTap } from "@/lib/haptic";

const FAQ = [
  {
    q: "Do I need to register or do KYC?",
    a: "No. The portal is invite only and stays private. Enter your name and you are in.",
  },
  {
    q: "How are daily rewards calculated?",
    a: "Each tier earns a fixed daily share of the catalogue's music revenue, with a limited number of seats per tier.",
  },
  {
    q: "Which crypto can I send?",
    a: "Bitcoin, Tether (TRC20), Ethereum (ERC20), and Solana. The portal converts in real time.",
  },
  {
    q: "How fast are withdrawals?",
    a: "Withdrawals are queued the moment you confirm and broadcast to the network in under a minute.",
  },
  {
    q: "Is the live price real?",
    a: "Yes. The Bitcoin chart pulls from CoinGecko and refreshes every sixty seconds.",
  },
];

export function HelpDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => {
          setOpen(true);
          playTap();
          hapticTap();
        }}
        title="Help"
        className="pill-luxury fixed bottom-24 right-4 z-30 h-10 w-10 justify-center !p-0 text-primary"
      >
        <HelpCircle className="h-4 w-4" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-end bg-black/75 backdrop-blur-md"
            onClick={() => setOpen(false)}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 600 }}
              animate={{ y: 0 }}
              exit={{ y: 600 }}
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
              className="glass-luxury aurora-border max-h-[80vh] w-full overflow-auto rounded-t-3xl p-5 pb-10"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-2xl">
                  How can we <em className="not-italic text-gradient-gold">help</em>?
                </h3>
                <button
                  onClick={() => setOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-full border border-border/60 text-muted-foreground hover:text-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <ul className="space-y-3">
                {FAQ.map((f) => (
                  <li key={f.q} className="rounded-2xl border border-border/60 bg-black/30 p-4">
                    <p className="text-sm font-medium text-white">{f.q}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.a}</p>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
