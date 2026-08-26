import { DAY_RATE, FIRST_TIER, TOP_TIER } from "./figures";
import { Mark } from "@/components/brand/Mark";
import { DrawRule } from "./DrawRule";
import { Reveal } from "./Reveal";

/**
 * Words from the desk.
 *
 * Deliberately unsigned by a person. There is no named executive, no
 * photograph, no biography and no track record behind this product yet, and
 * inventing one would be the first thing on the page a visitor could not
 * check. What the statement can stand behind is why the product is shaped the
 * way it is, so that is all it claims.
 */

const PARAGRAPHS = [
  {
    heading: "One rate, and no negotiation",
    body: `We were asked early to pay more on larger positions. We did not. A rate that moves with the size of a balance is a negotiation, and a negotiation is a thing you can lose without ever being told you were in one. So the rate is written into the product as a constant: ${DAY_RATE} of principal a day, every day it stays in place, identical at ${FIRST_TIER.name} and at ${TOP_TIER.name}. What a larger position buys is a shorter settlement target, and today that is the only column on the ladder that moves. The ladder says exactly that, on the ladder, not in a footnote.`,
  },
  {
    heading: "Every figure comes from your own ledger",
    body: "Nothing on a Rigel screen is a house average or a borrowed curve. Projections, countdowns, tier standing and charts are derived from a member's own positions and their own recorded events. Place nothing and the product shows nothing, because there is nothing yet to show. That makes for a quiet first day. It also means the number a member reads is a number they can reconstruct from the record that produced it.",
  },
  {
    heading: "The risk goes at the top",
    body: "The published rate is a target, not a promise. Capital placed in a vault can be lost in part or in full, no deposit protection sits behind it, and a return of this size implies risk of the same size. That belongs on the first page a visitor sees rather than at the bottom of a legal shelf, because a person who reads only one page should still have read it.",
  },
];

export function DeskStatement() {
  return (
    <div className="glass relative p-6 sm:p-9 lg:p-12">
      <div className="grid gap-9 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-14">
        <Reveal>
          <blockquote>
            <p className="display text-[clamp(1.5rem,4.6vw,2.4rem)] text-balance">
              The product is built so that the smallest position and the largest one are quoted the
              same number.
            </p>
          </blockquote>

          <p className="mt-6 max-w-md text-sm leading-relaxed text-[var(--text-mid)]">
            That sentence is either the most reassuring thing on this page or the most suspicious
            one, depending on what you already think about products like this. The three notes
            beside it explain which, and why.
          </p>

          {/* The signature block. A mark and a desk, because there is no person
              to sign for and pretending otherwise would be the one unverifiable
              thing on the page. */}
          <div className="mt-9 max-w-xs">
            <DrawRule delay={0.15} />
            <div className="mt-4 flex items-center gap-3">
              <Mark size={30} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-hi)]">The desk</p>
                <p className="machine mt-0.5 break-normal text-[11px] text-[var(--text-low)]">
                  RIGEL &middot; no individual signs for this
                </p>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="min-w-0">
          {PARAGRAPHS.map((p, i) => (
            <Reveal
              key={p.heading}
              as="article"
              delay={0.06 * i}
              className="border-t border-[var(--line)] py-6 first:border-0 first:pt-0 lg:py-7"
            >
              <div className="flex items-baseline gap-3">
                <span aria-hidden="true" className="metric text-sm text-[var(--accent)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="text-[15px] font-semibold text-[var(--text-hi)] sm:text-base">
                  {p.heading}
                </h3>
              </div>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--text-mid)]">{p.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
