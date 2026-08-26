import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  LifeBuoy,
  Mail,
  MessageSquare,
  ShieldQuestion,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Wordmark } from "@/components/brand/Mark";
import { useUser } from "@/context/UserContext";
import { useLedger } from "@/hooks/useLedger";
import { money } from "@/components/system/format";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * How to reach a person.
 *
 * This route exists because the product asks people to think about money and
 * had no human channel anywhere in it, while the privacy policy pointed at a
 * contact route that did not exist. It sits outside the Gate on purpose:
 * someone who cannot get in is exactly the person who most needs to write.
 *
 * The channel itself is configuration, not code. `VITE_CONTACT_EMAIL` is the
 * one variable, and until it is set the page says plainly that the channel is
 * not open rather than printing an address nobody reads. What the page can do
 * either way is compose the message: it assembles the subject, the member
 * reference and a short factual summary of the account, so whoever answers has
 * what they need on the first reply instead of the third.
 */

const CONTACT_EMAIL = (() => {
  try {
    const v = (import.meta.env.VITE_CONTACT_EMAIL ?? "").trim();
    return v.includes("@") ? v : null;
  } catch {
    return null;
  }
})();

type Topic = {
  id: string;
  label: string;
  icon: typeof Mail;
  subject: string;
  /** What the member should include, so the first reply can be the answer. */
  prompt: string;
};

const TOPICS: Topic[] = [
  {
    id: "account",
    label: "My account or a figure",
    icon: ShieldQuestion,
    subject: "Account question",
    prompt:
      "Which figure looks wrong, what you expected it to be, and what you did just before it changed.",
  },
  {
    id: "funding",
    label: "Funding or withdrawing",
    icon: LifeBuoy,
    subject: "Funding or withdrawal",
    prompt:
      "The asset and network, the amount, and any reference you were given. Never send a private key or a recovery phrase.",
  },
  {
    id: "privacy",
    label: "Privacy or my data",
    icon: ShieldQuestion,
    subject: "Privacy request",
    prompt: "Which right you are exercising, and the member reference below so we can find you.",
  },
  {
    id: "problem",
    label: "Something is broken",
    icon: AlertTriangle,
    subject: "Bug report",
    prompt:
      "What you were doing, what happened, and what you expected instead. A screenshot helps.",
  },
  {
    id: "other",
    label: "Something else",
    icon: MessageSquare,
    subject: "Enquiry",
    prompt: "Whatever you need. There is no wrong way to open this.",
  },
];

export default function Contact() {
  const { member, ref } = useUser();
  const snap = useLedger(60_000);
  const reduce = useReducedMotion();
  const [topicId, setTopicId] = useState<string>(TOPICS[0].id);
  const [body, setBody] = useState("");
  const [copied, setCopied] = useState(false);

  const topic = TOPICS.find((t) => t.id === topicId) ?? TOPICS[0];

  // The account summary is short and factual on purpose. Enough to find the
  // member and understand the state, and nothing that would be a problem in a
  // mailbox: no address, no balance the member did not already see.
  const composed = useMemo(() => {
    const lines: string[] = [];
    lines.push(body.trim() || `[what you would like to say]`);
    lines.push("");
    lines.push("---");
    if (member) {
      lines.push(`Member: ${member.displayName} (@${member.username})`);
      lines.push(`Reference: ${ref}`);
      lines.push(`Standing: ${money(snap.standing)}`);
      lines.push(`Open positions: ${snap.activePositions.length}`);
    } else {
      lines.push("Not signed in on this device.");
    }
    lines.push(`Sent from: ${typeof window === "undefined" ? "" : window.location.origin}`);
    return lines.join("\n");
  }, [body, member, ref, snap.standing, snap.activePositions.length]);

  const mailto = CONTACT_EMAIL
    ? `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Rigel: ${topic.subject}`)}&body=${encodeURIComponent(composed)}`
    : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(composed);
      setCopied(true);
      toast.success("Message copied", { description: "Paste it wherever you write to us." });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy. Select the text and copy it manually.");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--ink-000)] text-[var(--text)]">
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[rgba(8,11,22,0.82)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-4 px-5 sm:px-6">
          <Link to="/" className="rounded-lg" aria-label="Rigel, home">
            <Wordmark size={24} />
          </Link>
          <Link to="/" className="btn btn-ghost !text-[13px]">
            <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-24 pt-10 sm:px-6 sm:pt-14">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="eyebrow">Contact</p>
          <h1 className="display mt-1.5 text-3xl sm:text-4xl">Reach a person</h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--text-mid)]">
            The assistants inside the product answer questions about how it works. This page is for
            everything else, and for anything where you want a human to have read it.
          </p>
        </motion.div>

        {/* What the channel actually is, stated before anything is asked of the
            reader, because an unanswered message is worse than no channel. */}
        <section className="glass mt-8 p-5 sm:p-6">
          {CONTACT_EMAIL ? (
            <>
              <p className="eyebrow">Write to</p>
              <p className="machine mt-2 text-base text-[var(--text-hi)]">{CONTACT_EMAIL}</p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-low)]">
                Messages are read by the desk. There is no published response time yet, so we will
                not promise one. Include the reference below and you will not be asked for it.
              </p>
            </>
          ) : (
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--line-hi)] bg-[rgba(251,191,36,0.1)]">
                <AlertTriangle
                  className="h-4 w-4 text-[var(--warn)]"
                  strokeWidth={1.9}
                  aria-hidden="true"
                />
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-[var(--text-hi)]">
                  The channel is not open yet
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-low)]">
                  There is no monitored address behind this page today, and printing one that nobody
                  reads would be worse than saying so. Compose your message below and keep it: the
                  moment a channel is published it appears here, and this page will not have moved.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-low)]">
                  If your question is about how the product works, the{" "}
                  <Link to="/app/support" className="text-[var(--accent-hi)] underline">
                    Support assistant
                  </Link>{" "}
                  can answer it now, and{" "}
                  <Link to="/app/glossary" className="text-[var(--accent-hi)] underline">
                    the glossary
                  </Link>{" "}
                  explains every figure the product shows.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Composer */}
        <section className="mt-8">
          <div className="band-head">
            <h2 className="band-title">Compose</h2>
            <span className="hairline" aria-hidden="true" />
          </div>

          <p className="eyebrow mt-5" id="topic-label">
            What is this about
          </p>
          <div
            role="radiogroup"
            aria-labelledby="topic-label"
            className="mt-2 grid gap-2 sm:grid-cols-2"
          >
            {TOPICS.map((t) => {
              const Icon = t.icon;
              const active = t.id === topicId;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setTopicId(t.id)}
                  className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                    active
                      ? "border-[var(--accent)] bg-[rgba(46,139,255,0.1)]"
                      : "border-[var(--line)] bg-[rgba(5,7,15,0.45)] hover:border-[var(--line-hi)]"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${active ? "text-[var(--accent-hi)]" : "text-[var(--text-low)]"}`}
                    strokeWidth={1.9}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-medium text-[var(--text-hi)]">{t.label}</span>
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-xs leading-relaxed text-[var(--text-low)]">{topic.prompt}</p>

          <label htmlFor="message" className="eyebrow mt-6 block">
            Your message
          </label>
          <textarea
            id="message"
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 4000))}
            rows={7}
            placeholder="Tell us what happened, in your own words."
            className="mt-2 w-full resize-y rounded-xl border border-[var(--line-hi)] bg-[rgba(5,7,15,0.62)] px-4 py-3 text-sm leading-relaxed text-[var(--text-hi)] outline-none transition-colors focus:border-[var(--accent)] placeholder:text-[var(--text-low)]"
          />

          <div className="inset mt-4 p-3.5">
            <p className="eyebrow">Appended automatically</p>
            <pre className="machine mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-[var(--text-low)]">
              {composed.split("---")[1]?.trim() ?? ""}
            </pre>
            <p className="mt-2.5 text-[11px] leading-relaxed text-[var(--text-low)]">
              Nothing here leaves your device until you send it. No address, no key and no balance
              you have not already seen on your own screens is included.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {mailto && (
              <a href={mailto} className="btn btn-primary min-h-[48px] flex-1">
                <Mail className="h-4 w-4" aria-hidden="true" />
                Open in your mail app
              </a>
            )}
            <button
              type="button"
              onClick={copy}
              className={`btn min-h-[48px] ${mailto ? "btn-outline" : "btn-primary flex-1"}`}
            >
              {copied ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              {copied ? "Copied" : "Copy the message"}
            </button>
          </div>
        </section>

        {/* Safety, stated where someone in trouble will actually read it. */}
        <section className="panel mt-8 flex items-start gap-3 p-5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[var(--line-hi)] bg-[rgba(46,139,255,0.08)]">
            <Sparkles
              className="h-4 w-4 text-[var(--accent-hi)]"
              strokeWidth={1.9}
              aria-hidden="true"
            />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text-hi)]">
              Nobody here will ever ask you for a key
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-low)]">
              Not a private key, not a recovery phrase, not a password, and not remote access to
              your device. Anyone who does is not us, whatever address they write from. This build
              has no password of yours to lose, because it never asked for one.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
