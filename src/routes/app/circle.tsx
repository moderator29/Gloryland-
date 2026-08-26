import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Copy, Info, Link2, Share2, Users } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/context/UserContext";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { fullDate } from "@/components/system/format";
import { BandHead } from "@/components/system/ui";
import {
  inviteCode,
  inviteUrl,
  loadCircle,
  recordInbound,
  subscribe,
  type CircleState,
} from "@/domain/circle";

/**
 * Circle is the invite surface, and it is deliberately modest about itself.
 *
 * The code is real and stable, the link works, and the browser remembers a
 * code it arrived with. Everything past that point, attribution and any reward
 * for it, needs the production backend, so the page says so plainly instead of
 * showing a count or a balance it cannot stand behind.
 */

const STEPS = [
  {
    title: "Share your code",
    body: "Send the link or read the code out. It is derived from your name, so it never changes and never needs to be looked up.",
  },
  {
    title: "They open an account",
    body: "The link carries your code into their browser, where it is held until they place their first vault.",
  },
  {
    title: "Attribution comes later",
    body: "Matching a join back to you happens on the desk. Nothing is credited from this device.",
  },
];

export default function Circle() {
  const { username } = useUser();
  const reduce = useReducedMotion();
  const { search } = useLocation();
  const [state, setState] = useState<CircleState>(loadCircle);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const code = useMemo(() => inviteCode(username), [username]);
  const url = useMemo(() => inviteUrl(code), [code]);

  useEffect(() => subscribe(() => setState(loadCircle())), []);

  // A code carried in on the address bar is captured once, first touch wins.
  useEffect(() => {
    const ref = new URLSearchParams(search).get("ref");
    if (ref) setState(recordInbound(ref));
  }, [search]);

  const copy = async (text: string, what: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      toast.success(what === "code" ? "Invite code copied" : "Invite link copied");
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      toast.error("Could not copy. Select the text and copy it manually.");
    }
  };

  const share = async () => {
    const nav = typeof navigator === "undefined" ? undefined : navigator;
    if (nav?.share) {
      try {
        await nav.share({
          title: "Rigel",
          text: `Join me on Rigel with invite code ${code}.`,
          url,
        });
        return;
      } catch (err) {
        // A cancelled sheet is not a failure. Anything else falls through.
        if ((err as Error)?.name === "AbortError") return;
      }
    }
    await copy(url, "link");
  };

  const rise = (i: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 12 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.4, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as const },
        };

  return (
    <div className="space-y-6">
      <motion.div {...rise(0)}>
        <p className="eyebrow">Programme</p>
        <h1 className="display mt-1 text-2xl sm:text-3xl">Circle</h1>
        <p className="mt-2 max-w-prose text-sm text-[var(--text-low)]">
          Your own code for bringing people to Rigel, and an honest account of what it can do today.
        </p>
      </motion.div>

      {/* ── The code ── */}
      <motion.section {...rise(1)} className="panel-hi edge-light p-5 sm:p-6">
        <p className="eyebrow">Your invite code</p>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="metric inset px-4 py-3 text-2xl tracking-[0.18em] sm:text-4xl">
            <span aria-hidden="true">{code}</span>
            {/* Spelled out so a screen reader reads a code, not a word. */}
            <span className="sr-only">{`Your invite code is ${code.split("").join(" ")}`}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copy(code, "code")}
              className="btn btn-secondary"
            >
              {copied === "code" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied === "code" ? "Copied" : "Copy code"}
            </button>
            <button type="button" onClick={() => void share()} className="btn btn-primary">
              <Share2 className="h-4 w-4" /> Share invite
            </button>
          </div>
        </div>

        <div className="inset mt-4 flex items-center gap-3 p-3">
          <Link2 className="h-4 w-4 shrink-0 text-[var(--accent-hi)]" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-xs text-[var(--text-mid)]">{url}</span>
          <button
            type="button"
            onClick={() => void copy(url, "link")}
            aria-label="Copy invite link"
            className="btn btn-ghost shrink-0 !px-2 !py-2"
          >
            {copied === "link" ? (
              <Check className="h-4 w-4 text-[var(--gain)]" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
      </motion.section>

      {/* ── How it works ── */}
      <motion.section {...rise(2)} className="band" aria-labelledby="circle-how">
        <BandHead id="circle-how" title="How the programme works" />
        <ol className="space-y-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3.5">
              <span className="metric grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[var(--line-hi)] bg-[rgba(46,139,255,0.08)] text-xs text-[var(--accent-hi)]">
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-[var(--text-hi)]">
                  {step.title}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-[var(--text-low)]">
                  {step.body}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </motion.section>

      {/* ── Status ── */}
      <motion.section {...rise(3)} className="band" aria-labelledby="circle-status">
        <BandHead
          id="circle-status"
          title="Status"
          hint="What this device knows, and nothing more"
          action={<span className="chip chip-warn shrink-0">Not tracked yet</span>}
        />

        <div className="grid gap-2.5 sm:grid-cols-2">
          <div className="inset p-3.5">
            <p className="eyebrow">Inbound code</p>
            <p className="metric mt-1.5 text-lg">{state.inbound ?? "None"}</p>
            <p className="mt-1 text-[11px] text-[var(--text-low)]">
              {state.inbound && state.inboundAt
                ? `Captured ${fullDate(state.inboundAt)} from the link you arrived on.`
                : "You did not arrive through an invite link on this browser."}
            </p>
          </div>
          <div className="inset p-3.5">
            <p className="eyebrow">Joins recorded here</p>
            <p className="metric mt-1.5 text-lg">{state.joins.length}</p>
            <p className="mt-1 text-[11px] text-[var(--text-low)]">
              Only joins written to this browser appear here. Real attribution lives on the desk.
            </p>
          </div>
        </div>

        <div className="inset mt-2.5 flex gap-3 p-3.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warn)]" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-[var(--text-mid)]">
            Invites are not tracked server side in this build. Sharing your code does not credit a
            reward automatically, and no figure on this page counts anyone who joined. When the desk
            takes over attribution, your code stays exactly the same, so anything you share now
            still points at you.
          </p>
        </div>
      </motion.section>

      <motion.p {...rise(4)} className="flex items-center gap-2 text-[11px] text-[var(--text-low)]">
        <Users className="h-3.5 w-3.5" aria-hidden="true" />
        Codes use an alphabet without O, 0, I or 1, so a code read aloud cannot be mistyped.
      </motion.p>
    </div>
  );
}
