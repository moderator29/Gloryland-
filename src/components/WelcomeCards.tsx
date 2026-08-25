import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown,
  Clapperboard,
  Gem,
  Wallet2,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
} from "lucide-react";
import { BRAND_FULL } from "@/lib/site-config";

const STORAGE_KEY = "hal_welcome_seen_v1";

type Card = {
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  eyebrow: string;
  title: React.ReactNode;
  body: string;
};

const CARDS: Card[] = [
  {
    Icon: Crown,
    eyebrow: "Welcome",
    title: (
      <>
        Step into <em className="not-italic text-gradient-gold">{BRAND_FULL}</em>
      </>
    ),
    body: "An invitation only portal where members earn alongside a working music catalogue.",
  },
  {
    Icon: Clapperboard,
    eyebrow: "Revenue",
    title: (
      <>
        Real Revenue. <em className="not-italic text-gradient-gold">Real Returns.</em>
      </>
    ),
    body: "Your share of touring, streaming, royalties, publishing and brand partnerships.",
  },
  {
    Icon: Gem,
    eyebrow: "Packages",
    title: (
      <>
        Seven <em className="not-italic text-gradient-gold">Curated Tiers</em>
      </>
    ),
    body: "From Starter to Platinum. Daily rewards scaled to your investment, with limited seats per tier.",
  },
  {
    Icon: Wallet2,
    eyebrow: "Portal",
    title: (
      <>
        Deposit. Earn. <em className="not-italic text-gradient-gold">Withdraw.</em>
      </>
    ),
    body: "Fund with Bitcoin in seconds. Withdraw any time in USD or BTC straight to your wallet.",
  },
  {
    Icon: Sparkles,
    eyebrow: "Ready",
    title: (
      <>
        No Account. <em className="not-italic text-gradient-gold">No Friction.</em>
      </>
    ),
    body: "Skip the paperwork. Choose a tier, send a deposit, start earning today.",
  },
];

export function WelcomeCards() {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
  }, []);

  const close = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };
  const next = () => {
    if (i < CARDS.length - 1) {
      setDir(1);
      setI(i + 1);
    } else {
      close();
    }
  };
  const prev = () => {
    if (i > 0) {
      setDir(-1);
      setI(i - 1);
    }
  };

  const card = CARDS[i];
  const isLast = i === CARDS.length - 1;
  const Icon = card.Icon;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl"
        >
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -left-32 top-1/4 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,_rgba(201,162,39,0.35),_transparent_60%)] blur-3xl"
            animate={{ x: [0, 60, 0], y: [0, 40, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -right-32 bottom-10 h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle,_rgba(244,227,172,0.22),_transparent_60%)] blur-3xl"
            animate={{ x: [0, -50, 0], y: [0, -30, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          />

          <button
            onClick={close}
            className="absolute right-5 top-5 z-10 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-black/50 px-3.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            Skip <X className="h-3 w-3" />
          </button>

          <div className="relative z-10 mx-5 w-full max-w-md">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={i}
                custom={dir}
                initial={{ opacity: 0, x: dir > 0 ? 40 : -40, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: dir > 0 ? -40 : 40, scale: 0.98 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -80) next();
                  else if (info.offset.x > 80) prev();
                }}
                className="card-luxury relative overflow-hidden p-7"
              >
                <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent" />

                <div className="flex items-center justify-between">
                  <span className="chip">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {card.eyebrow}
                  </span>
                  <span className="font-display text-xs text-muted-foreground">
                    {String(i + 1).padStart(2, "0")} / {String(CARDS.length).padStart(2, "0")}
                  </span>
                </div>

                <motion.div
                  initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="mt-6 grid h-20 w-20 place-items-center rounded-2xl bg-gradient-to-br from-[#B3902F]/30 via-[#F4E3AC]/15 to-[#A07C22]/30 ring-1 ring-primary/40"
                >
                  <Icon className="h-9 w-9 text-primary" strokeWidth={1.6} />
                </motion.div>

                <h2 className="mt-6 font-display text-3xl leading-tight">{card.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{card.body}</p>

                <div className="mt-7 flex items-center gap-2">
                  {CARDS.map((_, idx) => (
                    <motion.span
                      key={idx}
                      onClick={() => {
                        setDir(idx > i ? 1 : -1);
                        setI(idx);
                      }}
                      className={`h-1.5 cursor-pointer rounded-full transition-colors ${
                        idx === i ? "bg-primary" : "bg-border"
                      }`}
                      animate={{ width: idx === i ? 28 : 8 }}
                      transition={{ type: "spring", stiffness: 300, damping: 24 }}
                    />
                  ))}
                </div>

                <div className="mt-6 flex items-center gap-2">
                  <button
                    onClick={prev}
                    disabled={i === 0}
                    className="grid h-11 w-11 place-items-center rounded-full border border-border/60 bg-black/40 text-muted-foreground transition-all hover:text-primary disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={next}
                    className="btn-gold flex flex-1 items-center justify-center gap-2 py-3 text-sm"
                  >
                    {isLast ? "Enter Portal" : "Continue"}
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
