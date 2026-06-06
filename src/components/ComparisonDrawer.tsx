import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, X, Check } from "lucide-react";
import { PACKAGES } from "@/lib/site-config";
import { useLocale, formatLocal } from "@/hooks/useLocale";

export function ComparisonDrawer() {
  const [open, setOpen] = useState(false);
  const loc = useLocale();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="pill-luxury fixed bottom-24 right-4 z-30 text-xs text-primary"
        aria-label="Compare tiers"
      >
        <ChevronUp className="h-3.5 w-3.5" /> Compare
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-end bg-black/70 backdrop-blur-md"
            onClick={() => setOpen(false)}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 600 }}
              animate={{ y: 0 }}
              exit={{ y: 600 }}
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
              className="glass-luxury max-h-[80vh] w-full overflow-auto rounded-t-3xl p-5 pb-10"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-2xl">
                  Compare <em className="not-italic text-gradient-gold">Tiers</em>
                </h3>
                <button
                  onClick={() => setOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-full border border-border/60 text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px] border-separate border-spacing-y-2 text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="text-left font-normal">Tier</th>
                      <th className="text-right font-normal">Price</th>
                      <th className="text-right font-normal">Daily</th>
                      <th className="text-right font-normal">Spots</th>
                      <th className="text-right font-normal">Local</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PACKAGES.map((p) => {
                      const full = p.taken >= p.spots;
                      return (
                        <tr key={p.name} className="rounded-xl bg-black/30">
                          <td className="rounded-l-xl px-3 py-3">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-primary" />
                              {p.name}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right font-display">
                            ${p.price.toLocaleString()}
                          </td>
                          <td className="px-3 py-3 text-right text-success">
                            ${p.daily.toLocaleString()}
                          </td>
                          <td className="px-3 py-3 text-right">
                            {full ? (
                              <span className="text-red-400">Full</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-success">
                                <Check className="h-3 w-3" /> Open
                              </span>
                            )}
                          </td>
                          <td className="rounded-r-xl px-3 py-3 text-right text-xs text-muted-foreground">
                            {formatLocal(p.price, loc)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
