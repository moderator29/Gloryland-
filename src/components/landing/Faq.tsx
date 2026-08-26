import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { LifeBuoy, Mail, Plus } from "lucide-react";
import { TIERS, WITHDRAW_INTERVAL_DAYS, dailyReward, rewardOver } from "@/domain/tiers";
import { money } from "@/components/system/format";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { DAY_RATE, FIRST_TIER, TOP_TIER, WINDOW_RATE } from "./figures";

/**
 * Questions, answered at the length the answer actually needs.
 *
 * Built by hand rather than on <details>, because a native disclosure cannot
 * animate its own height and the page wants that motion. Everything the
 * native element gave away for free is put back explicitly: a real button
 * carrying aria-expanded, a region named by that button, and no interactive
 * content left reachable while a panel is closed. Under reduced motion the
 * panel simply appears, with no height animation at all.
 *
 * The answers are deliberately specific. A question worth asking about money
 * is not answered by a sentence of reassurance.
 *
 * The first group was called "The term" and described a thirty day commitment
 * that closed at a maturity. There is no term any more, so it describes what
 * actually happens instead: daily accrual with no end date, and a withdrawal
 * window that comes round on its own clock.
 */

/** A worked figure the accrual answer leans on, so the arithmetic is visible. */
const SAMPLE = TIERS[1].entry;

type Item = { q: string; a: ReactNode };
type Group = { title: string; items: Item[] };

const legalLink =
  "text-[var(--accent-hi)] underline underline-offset-2 hover:text-[var(--accent-soft)]";

const GROUPS: Group[] = [
  {
    title: "How a position runs",
    items: [
      {
        q: "What is a vault?",
        a: (
          <>
            Capital you place, held in a position that accrues every day it stays there. There is no
            term and no maturity date: a position opened today and left alone for four months
            accrues for four months. Opening one writes your principal and the day it opened, and
            neither can move afterwards.
          </>
        ),
      },
      {
        q: "How does accrual actually work?",
        a: (
          <>
            Linearly, against your original principal. Each day credits {DAY_RATE} of principal, and
            nothing folds back in on its own, so ten days is ten times one day rather than a
            compounded figure. On a {money(SAMPLE)} position that is {money(dailyReward(SAMPLE), 2)}{" "}
            a day, {money(rewardOver(SAMPLE, WITHDRAW_INTERVAL_DAYS))} by the first withdrawal
            window and {money(rewardOver(SAMPLE, 30))} after thirty days. Multiply, and you have the
            same number the portal will show you.
          </>
        ),
      },
      {
        q: "When can I withdraw?",
        a: (
          <>
            Every {WITHDRAW_INTERVAL_DAYS} days. The window measures the gap after a withdrawal
            request, so your first one is available immediately and each one after it opens{" "}
            {WITHDRAW_INTERVAL_DAYS} days later. By each window a position has accrued {WINDOW_RATE}{" "}
            of principal. Requesting a withdrawal does not close the position: what stays in place
            carries on accruing at the same rate.
          </>
        ),
      },
      {
        q: "Does the rate ever change?",
        a: (
          <>
            It is one published constant, the same at every rung of the ladder, and it is the same
            number on the first day of a position as on the hundredth. If the published rate for new
            positions ever changes, that change appears on the change log the day it ships.
          </>
        ),
      },
      {
        q: "Is a rate like this sustainable?",
        a: (
          <>
            It is a target, not a guarantee, and it is a high one. A published return says something
            about the risk carried to produce it, and this one says a great deal. Capital is at
            risk. Place what you can afford to lose.
          </>
        ),
      },
    ],
  },
  {
    title: "Money in, money out",
    items: [
      {
        q: "What does a tier actually change?",
        a: (
          <>
            The settlement target, and nothing about the rate. The ladder runs from{" "}
            {FIRST_TIER.name} at {money(FIRST_TIER.entry)} to {TOP_TIER.name} at{" "}
            {money(TOP_TIER.entry)}, every rung earns the same {DAY_RATE} a day, and climbing
            shortens the published target from {FIRST_TIER.settlementHours} hours at{" "}
            {FIRST_TIER.name} to {TOP_TIER.settlementHours} hours at {TOP_TIER.name}.{" "}
            <strong>Nothing in the portal is gated by tier today.</strong> Every surface, chart and
            assistant is open at every rung, including to a member with no standing at all, so where
            a rung describes a benefit beyond the target, treat it as what the ladder is for rather
            than as something you are currently missing.
          </>
        ),
      },
      {
        q: "What does settlement mean?",
        a: (
          <>
            Settlement is the moment value leaves the platform and lands at your address. Until
            then, an accrued figure is an entry against your position rather than money in your
            hands. Settlement targets are measured from an approved withdrawal request, and they are
            targets the desk works to rather than guarantees. Network conditions and review checks
            can extend them, and a target starts when a request is approved rather than when it is
            filed.
          </>
        ),
      },
      {
        q: "What is the difference between claiming and settling?",
        a: (
          <>
            Claiming moves accrued reward out of a position and into your available balance inside
            the platform. Settling moves an available balance out of the platform, to an address you
            own. Claiming is internal bookkeeping. Settling is an external transfer, and it takes as
            long as the queue, the checks and the network take.
          </>
        ),
      },
      {
        q: "What happens if I do nothing?",
        a: (
          <>
            The position carries on accruing, which is the design. It does not reallocate and it
            does not close itself. Reward that has accrued sits outside the principal until you act
            on it, and reward outside the principal earns nothing, so leaving it there is a decision
            with a cost you can measure.
            <br />
            <br />A <strong>relay</strong> is the instruction that removes that cost, and it only
            exists on a position where you armed one. It folds the accrued reward back into the
            principal so the larger principal starts earning, then arms itself again, as a single
            write to your ledger and without asking a second time. It says so on the panel before
            you arm it. It runs the next time you open Rigel, not while you are away, and it is
            never backdated, so a day it did not run is a day that earns nothing and the ledger says
            so. Disarm it at any point and nothing further folds.
          </>
        ),
      },
      {
        q: "How do referrals work?",
        a: (
          <>
            <Link to="/app/circle" className={legalLink}>
              Circle
            </Link>{" "}
            issues a code derived from your member name, so it is stable and never needs looking up,
            plus a link that carries it. A browser arriving on that link remembers the code.
            Attribution past that point, and any reward attached to it, needs the production
            backend, so Circle shows the code and the link and does not show a count or a balance it
            cannot stand behind.
          </>
        ),
      },
    ],
  },
  {
    title: "The record, the risk and the help",
    items: [
      {
        q: "Where does the ledger live today?",
        a: (
          <>
            In your browser. This build records events in local storage on the device you are using,
            so the record is real and every figure can be reconstructed from it, but it does not
            follow you to another device and clearing site data clears it. That is a stated
            constraint of the current build rather than a design goal: storage is isolated behind
            two functions, so moving the ledger to a server replaces those and nothing else.
          </>
        ),
      },
      {
        q: "What risk am I carrying?",
        a: (
          <>
            All of it. Capital placed in a vault can be lost in part or in full. The published rate
            is a target rather than a promise, no deposit protection or compensation scheme sits
            behind it, the platform is not a bank, and a return of this size implies risk of the
            same size. The{" "}
            <Link to="/legal/risk" className={legalLink}>
              risk disclosure
            </Link>{" "}
            sets out counterparty, lock up, network, security and regulatory risk in full. Read it
            before anything else on this site.
          </>
        ),
      },
      {
        q: "Is any of this financial advice?",
        a: (
          <>
            No. Rigel does not assess whether this product suits your circumstances, objectives or
            tolerance for loss. Nothing here, including anything either assistant says, is
            investment, tax or legal advice, and none of it is a recommendation to place capital. If
            the amount is material to you, take independent professional advice first.
          </>
        ),
      },
      {
        q: "What can the assistants do, and what can they not?",
        a: (
          <>
            <Link to="/app/copilot" className={legalLink}>
              Copilot
            </Link>{" "}
            is an analyst for your own position: it reads the figures derived from your ledger, when
            you allow that in settings, and explains what they mean.{" "}
            <Link to="/app/support" className={legalLink}>
              Support
            </Link>{" "}
            is practical help with using the product. Neither advises, neither can move capital, and
            both can be wrong. Verify anything that would change what you place or when you settle.
          </>
        ),
      },
      {
        q: "How do I get help?",
        a: (
          <>
            For a person, use{" "}
            <Link to="/contact" className={legalLink}>
              contact
            </Link>
            . It is a public route, it does not require you to be signed in, and it is the right
            channel for anything about money, a figure that looks wrong, or a decision you are about
            to make. For everything else,{" "}
            <Link to="/app/support" className={legalLink}>
              Support
            </Link>{" "}
            inside the portal is an assistant that explains how the product works, and the{" "}
            <Link to="/app/glossary" className={legalLink}>
              glossary
            </Link>{" "}
            defines every term with the arithmetic behind it. If a screen does not match what you
            expected, ask before you act on it rather than after.
          </>
        ),
      },
      {
        q: "What does Rigel not claim?",
        a: (
          <>
            Licences, insurance cover, audit certificates, regulatory registrations, custody
            partners, press coverage, awards, member counts and assets under management. None of
            them appear on this site, because none of them has been published as a document you
            could read and check. Where a platform genuinely holds such things, they should be
            verifiable documents rather than badges in a footer. Treat any platform that does the
            opposite with suspicion, this one included.
          </>
        ),
      },
    ],
  },
];

const EASE = [0.22, 1, 0.36, 1] as const;

function Row({
  id,
  item,
  open,
  onToggle,
}: {
  id: string;
  item: Item;
  open: boolean;
  onToggle: () => void;
}) {
  const reduce = useReducedMotion();
  const body = (
    <div className="max-w-2xl pb-5 pr-1 text-sm leading-relaxed text-[var(--text-mid)] sm:pr-10">
      {item.a}
    </div>
  );

  return (
    <li className="border-b border-[var(--line)] last:border-b-0">
      <h4>
        <button
          type="button"
          id={`${id}-q`}
          aria-expanded={open}
          aria-controls={`${id}-a`}
          onClick={onToggle}
          className="group flex w-full items-start gap-4 py-4 text-left"
        >
          <span
            className={`min-w-0 flex-1 text-[15px] font-medium transition-colors ${
              open ? "text-[var(--accent-hi)]" : "text-[var(--text-hi)]"
            } group-hover:text-[var(--accent-hi)]`}
          >
            {item.q}
          </span>
          <span
            aria-hidden="true"
            className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg border text-[var(--accent-hi)] transition-transform duration-200 ${
              open
                ? "rotate-45 border-[rgba(46,139,255,0.45)] bg-[rgba(46,139,255,0.14)]"
                : "border-[var(--line)] bg-[rgba(46,139,255,0.07)]"
            }`}
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
          </span>
        </button>
      </h4>

      {/* The region stays mounted so aria-controls always resolves; only its
          contents come and go, so nothing inside a closed panel is focusable. */}
      <div id={`${id}-a`} role="region" aria-labelledby={`${id}-q`}>
        {reduce ? (
          open && body
        ) : (
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                key="body"
                className="overflow-hidden"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.32, ease: EASE }}
              >
                {body}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </li>
  );
}

export function Faq() {
  const [open, setOpen] = useState<string[]>([]);

  const toggle = (id: string) =>
    setOpen((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="space-y-10 sm:space-y-12">
      {GROUPS.map((group, gi) => {
        const groupId = `faq-group-${gi}`;
        return (
          <section key={group.title} aria-labelledby={groupId}>
            <div className="band-head">
              <h3 id={groupId} className="band-title">
                {group.title}
              </h3>
              <span aria-hidden="true" className="hairline" />
              <p aria-hidden="true" className="metric shrink-0 text-xs text-[var(--text-low)]">
                {String(group.items.length).padStart(2, "0")}
              </p>
            </div>

            <ul className="mt-2">
              {group.items.map((item, qi) => {
                const id = `faq-${gi}-${qi}`;
                return (
                  <Row
                    key={id}
                    id={id}
                    item={item}
                    open={open.includes(id)}
                    onToggle={() => toggle(id)}
                  />
                );
              })}
            </ul>
          </section>
        );
      })}

      <div className="panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-[var(--text-hi)]">
            Still unclear about something?
          </p>
          <p className="mt-1 text-sm text-[var(--text-mid)]">
            Ask before you place capital, not after. Contact reaches a person; Support is an
            assistant that explains the product.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/contact" className="btn btn-secondary">
            <Mail className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
            Contact us
          </Link>
          <Link to="/app/support" className="btn btn-outline">
            <LifeBuoy className="h-4 w-4" strokeWidth={1.9} aria-hidden="true" />
            Open Support
          </Link>
        </div>
      </div>
    </div>
  );
}
