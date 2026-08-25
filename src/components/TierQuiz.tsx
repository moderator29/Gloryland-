import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wand2, X, ChevronRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { PACKAGES } from "@/lib/site-config";
import { playTap, playTierChord } from "@/lib/sound";
import { tap as hapticTap, success as hapticSuccess } from "@/lib/haptic";

type Q = {
  q: string;
  opts: { label: string; weight: number }[];
};

const QUESTIONS: Q[] = [
  {
    q: "How much capital are you comfortable allocating right now?",
    opts: [
      { label: "Under $3,000", weight: 1 },
      { label: "$3,000 — $10,000", weight: 2 },
      { label: "$10,000 — $30,000", weight: 3 },
      { label: "$30,000 — $60,000+", weight: 4 },
    ],
  },
  {
    q: "How long are you parking the capital?",
    opts: [
      { label: "Weeks", weight: 1 },
      { label: "Months", weight: 2 },
      { label: "A year or more", weight: 3 },
      { label: "Indefinitely", weight: 4 },
    ],
  },
  {
    q: "What matters most?",
    opts: [
      { label: "Test the waters", weight: 1 },
      { label: "Steady daily yield", weight: 2 },
      { label: "Compounding fast", weight: 3 },
      { label: "Top tier status", weight: 4 },
    ],
  },
];

function recommend(score: number) {
  if (score <= 4) return PACKAGES[0];
  if (score <= 6) return PACKAGES[1];
  if (score <= 7) return PACKAGES[2];
  if (score <= 8) return PACKAGES[3];
  if (score <= 9) return PACKAGES[4];
  if (score <= 10) return PACKAGES[5];
  return PACKAGES[6];
}

export function TierQuiz() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);

  const start = () => {
    setStep(0);
    setScore(0);
    setOpen(true);
    playTap();
    hapticTap();
  };

  const pick = (w: number) => {
    playTap();
    hapticTap();
    const nextScore = score + w;
    setScore(nextScore);
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      const rec = recommend(nextScore);
      playTierChord(rec.name);
      hapticSuccess();
      setStep(QUESTIONS.length);
    }
  };

  const rec = step >= QUESTIONS.length ? recommend(score) : null;

  return (
    <>
      <button
        onClick={start}
        className="btn-aurora-outline inline-flex items-center gap-1.5 px-5 py-2.5 text-xs"
      >
        <Wand2 className="h-3.5 w-3.5" />
        Find my tier
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[90] flex items-end bg-black/80 backdrop-blur-xl md:items-center md:justify-center"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 600 }}
              animate={{ y: 0 }}
              exit={{ y: 600 }}
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
              className="glass-luxury aurora-border relative max-h-[88vh] w-full max-w-md overflow-auto rounded-t-3xl p-6 pb-10 md:rounded-3xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="chip">
                  <Sparkles className="h-3 w-3 text-primary" />
                  Tier Match
                </span>
                <button
                  onClick={() => setOpen(false)}
                  className="grid h-9 w-9 place-items-center rounded-full border border-border/60 text-muted-foreground hover:text-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {rec ? (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                    Your match
                  </p>
                  <h2 className="mt-2 font-display text-4xl">
                    <em className="not-italic text-gradient-gold">
                      {rec.name.replace(" Plan", "")}
                    </em>
                  </h2>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Based on your answers, this tier fits your appetite and pace. Daily reward:{" "}
                    <span className="font-numeric text-success">
                      ${rec.daily.toLocaleString()}/day
                    </span>
                    .
                  </p>
                  <Link
                    to={`/portal?amount=${rec.price}&plan=${encodeURIComponent(rec.name)}`}
                    onClick={() => setOpen(false)}
                    className="btn-foil mt-6 flex w-full items-center justify-center gap-2 px-4 py-3 text-sm"
                  >
                    Take Position <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                    Question {step + 1} of {QUESTIONS.length}
                  </p>
                  <h3 className="mt-2 font-display text-2xl leading-snug">{QUESTIONS[step].q}</h3>
                  <div className="mt-5 space-y-2">
                    {QUESTIONS[step].opts.map((o) => (
                      <button
                        key={o.label}
                        onClick={() => pick(o.weight)}
                        className="flex w-full items-center justify-between rounded-2xl border border-border/60 bg-black/30 px-4 py-3 text-left text-sm transition-colors hover:border-primary/50 hover:text-primary"
                      >
                        {o.label}
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
