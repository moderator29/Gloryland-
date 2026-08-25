import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Crown, BadgeCheck, Sparkles } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { Backdrop } from "@/components/Backdrop";
import { FrameLight } from "@/components/FrameLight";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { playTap, playTing } from "@/lib/sound";
import { tap as hapticTap, success as hapticSuccess } from "@/lib/haptic";
import { BRAND_FULL } from "@/lib/site-config";

export function LoginGate({ children }: { children: ReactNode }) {
  const { username, setUsername } = useUser();
  const [name, setName] = useState("");
  const [entering, setEntering] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    setName("");
  }, [username]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setEntering(true);
    playTap();
    hapticTap();
    window.setTimeout(() => {
      setUsername(trimmed);
      playTing();
      hapticSuccess();
    }, 700);
  };

  if (username) return <>{children}</>;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#080d16] text-white">
      <Backdrop />
      <FrameLight />

      <main className="relative z-10 flex min-h-screen items-center justify-center px-5 py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={entering ? "entering" : "gate"}
            initial={reduced ? false : { opacity: 0, y: 28, filter: "blur(8px)" }}
            animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={reduced ? { opacity: 1 } : { opacity: 0, y: -24, filter: "blur(8px)" }}
            transition={reduced ? { duration: 0 } : { duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md"
          >
            <div className="glass-luxury aurora-border relative overflow-hidden p-8">
              <div className="mb-5 flex items-center justify-between">
                <span className="chip">
                  <Sparkles className="h-3 w-3 text-primary" />
                  Private Access
                </span>
                <BadgeCheck className="h-4 w-4 fill-[#3b82f6] text-white" strokeWidth={2.5} />
              </div>

              <motion.div
                initial={reduced ? false : { scale: 0.6, opacity: 0, rotate: -8 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={
                  reduced
                    ? { duration: 0 }
                    : { delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }
                }
                className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[#E8C25C]/40 via-[#F6E7B4]/20 to-[#8A6A1E]/40 ring-1 ring-primary/40"
              >
                <Crown className="h-7 w-7 text-primary" strokeWidth={1.6} />
              </motion.div>

              <h1 className="mt-5 text-center font-display text-4xl leading-tight">
                Welcome to <em className="not-italic text-gradient-gold">{BRAND_FULL}</em>
              </h1>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                The investor portal that pays out daily from real music revenue.
              </p>

              <form onSubmit={submit} className="mt-6 space-y-4">
                <label className="block">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Your Name
                  </span>
                  <div className="mt-1.5 flex items-center gap-3 rounded-2xl border border-border/60 bg-black/40 px-4 py-3.5">
                    <input
                      autoFocus
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Marcus"
                      maxLength={28}
                      aria-label="Your Name"
                      className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/60"
                    />
                  </div>
                </label>

                <motion.button
                  type="submit"
                  disabled={!name.trim() || entering}
                  whileTap={{ scale: 0.97 }}
                  className="btn-foil flex w-full items-center justify-center gap-2 px-4 py-3.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {entering ? (
                    <>
                      Entering portal
                      <motion.span
                        animate={reduced ? { x: 0 } : { x: [0, 4, 0] }}
                        transition={reduced ? { duration: 0 } : { duration: 0.6, repeat: Infinity }}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </motion.span>
                    </>
                  ) : (
                    <>
                      Enter <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </motion.button>
              </form>

              <p className="mt-5 text-center text-[11px] text-muted-foreground/70">
                No registration. No KYC. Just enter and start.
              </p>
            </div>

            <p className="mt-4 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground/60">
              Member · Investor · Lifetime Access
            </p>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
