import { Link } from "react-router-dom";
import { CYCLE_DAYS, CYCLE_RETURN, DAILY_RATE, TIERS } from "@/domain/tiers";
import { money, pct } from "@/components/system/format";
import { LegalPage, ReviewNote, type LegalSection } from "@/components/landing/LegalLayout";

const UPDATED = "26 August 2026";

/**
 * What repeated rolling actually compounds to.
 *
 * Derived from the published constants rather than typed, so this cannot drift
 * from the rate the product offers, and quoted from a real ladder entry rather
 * than an invented starting sum. The relay panel links here, because a member
 * arming a standing instruction is the one person who needs the series in
 * front of them.
 */
const BASE = TIERS[1].entry;
const GROWTH = 1 + CYCLE_RETURN;
const compounded = (terms: number) => BASE * GROWTH ** terms;

/** Terms in a calendar year, and the annual rate that repeating them implies. */
const TERMS_PER_YEAR = 365 / CYCLE_DAYS;
const ANNUALISED = GROWTH ** TERMS_PER_YEAR - 1;
const ANNUALISED_TEXT = `${Math.round(ANNUALISED * 100).toLocaleString("en-US")}%`;
const YEAR_TERMS = Math.floor(TERMS_PER_YEAR);

const SECTIONS: LegalSection[] = [
  {
    id: "loss",
    heading: "You can lose everything you place",
    body: (
      <>
        <p>
          <strong>
            Capital placed in a Rigel vault is at risk. You may lose part of it. You may lose all of
            it.
          </strong>{" "}
          That is not a formality at the bottom of a page, it is the single most important fact
          about this product, and everything else in this document explains how it could happen.
        </p>
        <p>
          Only commit money you can lose entirely without it changing how you live. Do not use
          borrowed money. Do not use money you need for housing, healthcare, dependants, debt
          repayment or retirement. Do not use money you may need inside the next {CYCLE_DAYS} days.
        </p>
      </>
    ),
  },
  {
    id: "target",
    heading: "The published return is a target, not a promise",
    body: (
      <>
        <p>
          The platform publishes a term structure of {pct(DAILY_RATE, 2)} per day reaching{" "}
          {pct(CYCLE_RETURN, 0)} over {CYCLE_DAYS} days. That figure describes how the product is
          designed to accrue. It is not a guarantee that the amount will be paid, and it is not
          secured by any asset, guarantor or protection scheme.
        </p>
        <p>
          Accrual displayed in the portal is an accounting entry against your position. It becomes
          money only when a withdrawal settles. Between those two points sits every risk described
          below.
        </p>
      </>
    ),
  },
  {
    id: "magnitude",
    heading: "Understand what a return of this size implies",
    body: (
      <>
        <p>
          A {pct(CYCLE_RETURN, 0)} return every {CYCLE_DAYS} days is very far above what established
          markets produce. Sustained and reinvested it compounds, and the compounding is worth
          seeing written out rather than described. Starting from {money(BASE)} and rolling the
          whole balance into the next term each time:
        </p>
        <ul>
          <li>
            After one term, {money(compounded(1))}. After three, {money(compounded(3))}.
          </li>
          <li>
            After six terms, {money(compounded(6), 2)}. After {YEAR_TERMS}, which is roughly a
            calendar year, {money(compounded(YEAR_TERMS), 2)}.
          </li>
          <li>
            Repeated for a full year that is an annualised rate of about {ANNUALISED_TEXT}, against
            a long run figure in the high single digits for a broad equity index.
          </li>
        </ul>
        <p>
          <strong>
            That series is arithmetic, not a forecast, and it is not a projection of what you will
            receive.
          </strong>{" "}
          It is what the published rate produces if every term completes and pays in full, which is
          exactly the assumption this document exists to challenge. No conventional asset class,
          lending market or treasury strategy delivers a rate of that order reliably, and the longer
          a chain of terms runs the more times the same risk has to not happen.
        </p>
        <p>
          <strong>
            Returns and risk do not decouple. A product offering returns of this magnitude is, by
            definition, carrying risk of a matching magnitude
          </strong>
          , whether that risk sits in market exposure, leverage, counterparty concentration, or in
          the continued solvency and honesty of the operator. If you cannot articulate where the
          return comes from and what would make it stop, treat that as a reason not to place
          capital.
        </p>
        <p>
          Be especially sceptical of any platform, including this one, that presents a high fixed
          return as though it were low risk, or that describes payment as &ldquo;guaranteed&rdquo;,
          &ldquo;insured&rdquo; or &ldquo;risk-free&rdquo;. Ask for the underlying strategy and the
          documents that evidence it.
        </p>
        <ReviewNote>
          The source of return must be described accurately and specifically on this page, together
          with any disclosure required of the operating entity. A high fixed-return offering
          attracts intense regulatory scrutiny in most jurisdictions, and this section is where that
          scrutiny will land.
        </ReviewNote>
      </>
    ),
  },
  {
    id: "protection",
    heading: "There is no deposit protection",
    body: (
      <>
        <p>
          Rigel is not a bank. Capital placed here is not a deposit, and it is not covered by any
          government deposit-insurance scheme, investor-compensation fund or similar arrangement. If
          the platform fails, there is no scheme that reimburses you.
        </p>
        <p>
          Rigel does not claim any licence, insurance policy, audit certification or custody
          partnership on this site. Absence of such a claim is honest, it is not a substitute for
          protection you do not have.
        </p>
      </>
    ),
  },
  {
    id: "lockup",
    heading: "Lock-up and liquidity risk",
    body: (
      <>
        <p>
          A term is a commitment. Once a vault is open, the capital inside it is not available on
          demand for {CYCLE_DAYS} days. An early-exit request is an exception handled at the
          platform&rsquo;s discretion, forfeits accrual on the unfinished term, and may not be
          granted at all.
        </p>
        <p>
          Circumstances can change quickly. If there is a realistic chance you will need this money
          before maturity, an emergency, a bill, a margin call elsewhere, do not place it.
        </p>
      </>
    ),
  },
  {
    id: "counterparty",
    heading: "Platform and counterparty risk",
    body: (
      <>
        <p>
          When you place capital in a vault, you are relying on Rigel&rsquo;s continued operation,
          solvency and integrity. That reliance is the dominant risk in this product.
        </p>
        <ul>
          <li>The platform could become insolvent and be unable to meet withdrawal requests.</li>
          <li>A counterparty the platform relies on could fail, taking value with it.</li>
          <li>
            The platform could suspend withdrawals during stress, the point at which you would most
            want them.
          </li>
          <li>
            Operators could act dishonestly. Fraud in this sector is common and has cost
            participants substantial sums.
          </li>
        </ul>
        <p>
          You have no security interest in any specific asset, and no priority over other creditors,
          unless a document expressly gives you one.
        </p>
      </>
    ),
  },
  {
    id: "assets",
    heading: "Digital asset and network risk",
    body: (
      <>
        <p>
          Digital assets are volatile and can lose a large share of their value in a short period.
          Markets trade continuously, liquidity can disappear without warning, and prices can gap
          through the level you expected to exit at.
        </p>
        <p>
          The networks themselves carry risk: congestion and fee spikes can delay transfers, chains
          can fork, protocols can contain defects, and a transaction sent to the wrong address or on
          the wrong network is generally unrecoverable by anyone.
        </p>
      </>
    ),
  },
  {
    id: "security",
    heading: "Security risk and irreversibility",
    body: (
      <>
        <p>
          Transfers of digital assets are final. There is no chargeback, no reversal and no central
          authority to appeal to. If your credentials or devices are compromised, an attacker may be
          able to move value out of your account, and recovery may be impossible.
        </p>
        <p>
          Platforms are attacked constantly. Controls reduce the probability of a successful attack;
          they do not eliminate it. A breach at Rigel, at a vendor, or on your own device could
          result in permanent loss.
        </p>
      </>
    ),
  },
  {
    id: "regulatory",
    heading: "Regulatory and legal risk",
    body: (
      <>
        <p>
          The rules governing digital assets and fixed-return products are unsettled and change
          quickly. A change in law, a regulatory action, or a determination that a product must be
          authorised could force the platform to suspend services, restrict your jurisdiction,
          freeze balances, or wind down, with or without notice.
        </p>
        <p>
          You are responsible for the tax consequences of anything you do here, and for determining
          whether participation is lawful where you live.
        </p>
        <ReviewNote>
          Jurisdiction-specific warnings, restricted-territory lists and any prescribed risk-warning
          wording mandated by an applicable regulator must be added before this page is published.
        </ReviewNote>
      </>
    ),
  },
  {
    id: "operational",
    heading: "Operational risk",
    body: (
      <p>
        Software fails, vendors have outages, and processes have errors. Displayed figures may be
        delayed or wrong, settlement targets may be missed, and access to the portal may be
        interrupted. Where an error is found in a ledger entry it will be corrected, and a
        correction may move a balance against you.
      </p>
    ),
  },
  {
    id: "suitability",
    heading: "Suitability is your decision",
    body: (
      <>
        <p>
          Rigel does not assess whether this product suits your circumstances, objectives or
          tolerance for loss. Nothing on this platform is investment, tax or legal advice, and no
          communication from us should be read as a recommendation to place capital.
        </p>
        <p>
          Before committing anything, consider taking independent professional advice, particularly
          if the amount is material to you.
        </p>
      </>
    ),
  },
  {
    id: "acknowledge",
    heading: "What you are acknowledging",
    body: (
      <>
        <p>By opening a vault, you confirm that you have read this disclosure and accept that:</p>
        <ul>
          <li>You may lose some or all of the capital you place.</li>
          <li>Published rates are targets and are not guaranteed.</li>
          <li>There is no deposit protection or compensation scheme behind this product.</li>
          <li>
            Capital is locked for the length of the term and may be unavailable even after it.
          </li>
          <li>You are relying on the platform&rsquo;s continued solvency and integrity.</li>
          <li>You are placing only capital you can afford to lose entirely.</li>
        </ul>
        <p>
          Read this alongside the <Link to="/legal/terms">Terms of Service</Link> and the{" "}
          <Link to="/legal/privacy">Privacy Policy</Link>. If any part of this document is unclear,
          ask through <Link to="/contact">contact</Link> before you place capital, not after.
        </p>
      </>
    ),
  },
];

export default function RiskDisclosure() {
  return (
    <LegalPage
      kicker="Legal"
      title="Risk Disclosure"
      updated={UPDATED}
      summary={
        <>
          Capital placed in a vault can be lost in part or in full. The published{" "}
          {pct(CYCLE_RETURN, 0)} term structure is a target, not a guarantee, and returns of that
          size carry risk of matching size. There is no deposit protection. Funds are locked for the
          length of the term. Place only what you can afford to lose entirely.
        </>
      }
      sections={SECTIONS}
    />
  );
}
