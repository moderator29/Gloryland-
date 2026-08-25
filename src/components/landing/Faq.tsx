import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { CYCLE_DAYS, CYCLE_RETURN, DAILY_RATE, TIERS } from "@/domain/tiers";
import { money, pct } from "@/components/system/format";
import { Stagger, StaggerItem } from "./Reveal";

/**
 * Frequently asked questions.
 *
 * Built on native <details>/<summary>, which gives correct keyboard and
 * screen-reader behaviour for free — expanded state, Enter/Space toggling
 * and in-page find — without a single line of state management.
 */

const ITEMS: { q: string; a: ReactNode }[] = [
  {
    q: "What is a vault term?",
    a: (
      <>
        A vault term is a fixed {CYCLE_DAYS}-day commitment of capital. When you open a vault your
        principal is recorded as a discrete position with a start date and a maturity date. It
        accrues from day one and settles at the end of the term. Terms do not roll automatically —
        at maturity you choose to withdraw or open a new one.
      </>
    ),
  },
  {
    q: `How is the ${pct(CYCLE_RETURN, 0)} calculated?`,
    a: (
      <>
        Linearly, against your original principal. Each day of the term accrues {pct(DAILY_RATE, 2)}{" "}
        of principal, so a full {CYCLE_DAYS}-day term accrues {pct(CYCLE_RETURN, 0)}. There is no
        compounding inside a term and no performance fee that changes the figure — the number you
        see on day one is the number you see at maturity.
      </>
    ),
  },
  {
    q: "What determines my tier?",
    a: (
      <>
        Total capital placed. Tiers begin at {money(TIERS[0].entry)} for {TIERS[0].name} and run to{" "}
        {money(TIERS[TIERS.length - 1].entry)} for {TIERS[TIERS.length - 1].name}. Critically, tiers
        do not change your rate — every tier earns the same {pct(CYCLE_RETURN, 0)} term. What
        changes is access: analytics depth, queue priority, settlement targets and coverage.
      </>
    ),
  },
  {
    q: "Can I withdraw before maturity?",
    a: (
      <>
        A term is a commitment, so capital inside an open vault is not available on demand. Accrual
        is calculated for completed terms; an early exit request is handled by the desk as an
        exception and forfeits accrual on the unfinished term. If you may need the capital inside{" "}
        {CYCLE_DAYS} days, do not place it.
      </>
    ),
  },
  {
    q: "How fast are withdrawals settled?",
    a: (
      <>
        Settlement targets are set by tier, from {TIERS[0].settlementHours} hours at {TIERS[0].name}{" "}
        down to {TIERS[TIERS.length - 1].settlementHours} hours at {TIERS[TIERS.length - 1].name}.
        These are targets the desk works to, not contractual guarantees — network conditions and
        review checks can extend them.
      </>
    ),
  },
  {
    q: "What are the risks?",
    a: (
      <>
        Real, and worth reading in full. Capital placed in a vault can be lost, in part or entirely.
        Published term rates are targets rather than promises, the platform is not a bank, and
        deposits carry no government or scheme protection. Before committing anything, read the{" "}
        <Link
          to="/legal/risk"
          className="text-[var(--accent-hi)] underline underline-offset-2 hover:text-[var(--accent-soft)]"
        >
          risk disclosure
        </Link>
        .
      </>
    ),
  },
];

export function Faq() {
  return (
    <Stagger className="space-y-2.5">
      {ITEMS.map((item) => (
        <StaggerItem key={item.q}>
          <details className="panel group overflow-hidden transition-colors open:border-[var(--line-hi)] hover:border-[var(--line-hi)]">
            <summary className="flex cursor-pointer list-none items-start gap-4 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
              <h3 className="min-w-0 flex-1 text-[15px] font-medium text-[var(--text-hi)]">
                {item.q}
              </h3>
              <span
                aria-hidden="true"
                className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg border border-[var(--line)] bg-[rgba(46,139,255,0.07)] text-[var(--accent-hi)] transition-transform duration-200 group-open:rotate-45"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
              </span>
            </summary>
            <div className="px-4 pb-5 sm:px-5">
              <p className="max-w-2xl border-t border-[var(--line)] pt-4 text-sm leading-relaxed text-[var(--text-mid)]">
                {item.a}
              </p>
            </div>
          </details>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
