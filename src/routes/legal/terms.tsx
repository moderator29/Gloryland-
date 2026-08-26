import { Link } from "react-router-dom";
import { CYCLE_DAYS, CYCLE_RETURN, DAILY_RATE, TIERS } from "@/domain/tiers";
import { money, pct } from "@/components/system/format";
import { LegalPage, ReviewNote, type LegalSection } from "@/components/landing/LegalLayout";

const UPDATED = "26 August 2026";
const FIRST = TIERS[0];
const LAST = TIERS[TIERS.length - 1];

const SECTIONS: LegalSection[] = [
  {
    id: "agreement",
    heading: "Agreement to these terms",
    body: (
      <>
        <p>
          These terms govern your use of the Rigel platform, including this website and the member
          portal. By creating an account, funding a vault or otherwise using the service, you agree
          to them. If you do not agree, do not use the platform.
        </p>
        <p>
          Read these terms alongside the <Link to="/legal/risk">Risk Disclosure</Link> and the{" "}
          <Link to="/legal/privacy">Privacy Policy</Link>. Together they form the agreement between
          you and us.
        </p>
        <p>
          <strong>Some clauses below describe capability this build does not yet have.</strong>{" "}
          There is no custody, no settlement and no account server today: no deposit address is
          issued, no withdrawal can leave, and your record is held in your own browser rather than
          on ours. Where a clause governs something that is not built, it takes effect when that
          thing ships, and the day it ships is written on the{" "}
          <Link to="/legal/changes">change log</Link>. Nothing in these terms should be read as a
          claim that a facility already exists.
        </p>
        <ReviewNote>
          The legal entity that contracts with members, and the jurisdiction of incorporation, must
          be named here. Every clause below depends on that answer.
        </ReviewNote>
      </>
    ),
  },
  {
    id: "eligibility",
    heading: "Eligibility",
    body: (
      <>
        <p>To open an account you confirm that you:</p>
        <ul>
          <li>
            Are of legal age in the place you live, and have capacity to enter this agreement.
          </li>
          <li>Are acting for yourself, with funds you legally own and control.</li>
          <li>
            Are not barred from using the service under any law or sanctions programme that applies
            to you or to us.
          </li>
          <li>Will provide accurate information and keep it current.</li>
        </ul>
        <p>
          We may decline an application, or close an account, where we cannot satisfy ourselves on
          any of the above.
        </p>
        <ReviewNote>
          Restricted territories and any sanctions-screening obligations must be enumerated here
          once the operating jurisdiction is confirmed.
        </ReviewNote>
      </>
    ),
  },
  {
    id: "accounts",
    heading: "Your account and its security",
    body: (
      <>
        <p>
          Your account is personal to you. In this build it is a member name and an event log held
          in the browser you are using. <strong>There is no password and no credential</strong>,
          nothing is enrolled, and no verification step exists, so anyone with access to that
          browser profile has your account. You are responsible for the device, and for everything
          done through it.
        </p>
        <ul>
          <li>
            Treat the device as the credential, because it is the only one. A shared or unlocked
            machine is a shared account.
          </li>
          <li>
            Keep your own copy. Settings exports the complete event log, and clearing site data
            destroys the original with no recovery on our side.
          </li>
          <li>
            The <Link to="/app/security">security page</Link> states exactly what is and is not
            protected. Read it before you rely on the account for anything.
          </li>
        </ul>
        <p>
          Once identity, credentials or device enrolment exist, this section is rewritten to
          describe them and the change is dated on the change log. We may require additional
          verification before acting on an instruction, and may decline or delay an instruction we
          reasonably believe to be unauthorised, fraudulent or unlawful.
        </p>
      </>
    ),
  },
  {
    id: "vaults",
    heading: "Vault terms",
    body: (
      <>
        <p>
          A vault is a fixed commitment of capital for {CYCLE_DAYS} days. When you open one, the
          position is recorded with its principal, its opening timestamp and its maturity timestamp.
        </p>
        <ul>
          <li>
            <strong>Accrual.</strong> The published structure accrues {pct(DAILY_RATE, 2)} of
            original principal per day, reaching {pct(CYCLE_RETURN, 0)} over a complete {CYCLE_DAYS}
            -day term. Accrual is linear and does not compound within a term.
          </li>
          <li>
            <strong>Maturity.</strong> A term does not renew by itself. At maturity you may request
            settlement or open a new one. The single exception is a relay: where you armed one on a
            position, the platform claims, closes and reopens that term with what it carried and
            arms the next, without asking again. It does that the next time you open Rigel after
            maturity, never before and never with a backdated timestamp, and it can be disarmed at
            any point before it runs.
          </li>
          <li>
            <strong>Early exit.</strong> Capital in an open term is not available on demand. A
            request to exit early is handled as an exception at our discretion and forfeits accrual
            on the unfinished term.
          </li>
        </ul>
        <p>
          <strong>
            Published rates describe the structure of the product. They are targets, not a promise
            of payment, and they are not guaranteed.
          </strong>{" "}
          Your capital is at risk and can be lost. See the{" "}
          <Link to="/legal/risk">Risk Disclosure</Link>.
        </p>
        <ReviewNote>
          Whether a fixed-return product of this shape constitutes a regulated investment,
          collective investment scheme or deposit-taking activity in the operating jurisdiction is
          the single most important legal question for this business. It must be resolved before the
          product is offered.
        </ReviewNote>
      </>
    ),
  },
  {
    id: "funding",
    heading: "Deposits and withdrawals",
    body: (
      <>
        <p>
          <strong>Funding is not open.</strong> This build issues no deposit address, holds no
          custody and cannot settle a withdrawal, so no value can enter or leave it. The two
          paragraphs that follow describe how deposits and withdrawals work once that exists, and
          they govern nothing until then.
        </p>
        <p>
          Deposits will be credited once the network confirms them to the threshold we apply.
          Sending to an address other than the one issued for your position, or sending an asset the
          position does not accept, may result in permanent loss that we cannot reverse.
        </p>
        <p>
          Withdrawal destinations, any registration or hold window applied to a new one, and the
          review we apply to unusual requests are all to be defined with the settlement mechanism
          itself. Until they are, this agreement makes no claim that a destination you enter is
          checked, held or screened.
        </p>
        <p>
          Settlement targets vary by tier, from {FIRST.settlementHours} hours at {FIRST.name} to{" "}
          {LAST.settlementHours} hours at {LAST.name}. These are operational targets measured from
          approval of a request. They are not contractual deadlines, and network conditions or
          review checks may extend them.
        </p>
      </>
    ),
  },
  {
    id: "tiers",
    heading: "Tiers",
    body: (
      <>
        <p>
          Tiers are determined by your standing, which is the greater of the capital you have
          brought in and the most you have ever had deployed at one time, beginning at{" "}
          {money(FIRST.entry)} for {FIRST.name} and running to {money(LAST.entry)} for {LAST.name}.
          No tier changes the term rate, which is identical at every rung.
        </p>
        <p>
          <strong>
            The published settlement target is the only benefit that differs by rung in this build.
          </strong>{" "}
          Nothing in the portal is gated by tier today: every surface, chart and assistant is
          available at every rung, including to a member with no standing at all. Where a tier
          description elsewhere in the product implies otherwise, this clause governs.
        </p>
        <p>
          We may adjust tier thresholds and the benefits attached to them on notice. Existing open
          positions keep the term structure they were opened under.
        </p>
      </>
    ),
  },
  {
    id: "fees",
    heading: "Fees",
    body: (
      <>
        <p>
          Fees that apply to your account are disclosed in the portal before you confirm an action.
          Network transaction costs are separate and are borne by the sending party as disclosed at
          the time.
        </p>
        <ReviewNote>
          The full fee schedule, deposit, withdrawal, early-exit and any administrative charges ,
          must be defined and disclosed here, and must match what the portal charges.
        </ReviewNote>
      </>
    ),
  },
  {
    id: "noadvice",
    heading: "No advice, no fiduciary relationship",
    body: (
      <>
        <p>
          Nothing on the platform is investment, financial, tax or legal advice, and nothing on it
          is a recommendation to place capital. We do not assess whether the product is suitable for
          you or appropriate for your circumstances. You decide, and you bear the outcome.
        </p>
        <p>
          Using the platform does not create a fiduciary, advisory, agency or trust relationship
          between you and us, except where a law that applies to us says otherwise.
        </p>
      </>
    ),
  },
  {
    id: "conduct",
    heading: "Acceptable use",
    body: (
      <>
        <p>You agree not to:</p>
        <ul>
          <li>Use the platform for money laundering, sanctions evasion or any unlawful purpose.</li>
          <li>Use funds that are not lawfully yours, or that came from criminal activity.</li>
          <li>Impersonate anyone, or open an account for someone else without disclosing it.</li>
          <li>
            Probe, scrape, overload or interfere with the platform, or attempt to gain access to
            areas or accounts that are not yours.
          </li>
          <li>Reverse engineer the service, or use it to build a competing product.</li>
        </ul>
      </>
    ),
  },
  {
    id: "suspension",
    heading: "Suspension and closure",
    body: (
      <>
        <p>
          We may suspend or close an account, or decline an instruction, where we reasonably believe
          it is necessary to comply with law, to protect members or the platform, or where these
          terms have been breached. Where we can lawfully tell you why, we will.
        </p>
        <p>
          You may close your account at any time once no positions are open. Closure does not
          extinguish obligations either side has already incurred.
        </p>
      </>
    ),
  },
  {
    id: "disclaimers",
    heading: "Disclaimers and limits on liability",
    body: (
      <>
        <p>
          The platform is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis.
          We do not warrant that it will be uninterrupted, error-free, or that figures displayed
          will always be current, and we do not warrant the performance of any blockchain network we
          rely on.
        </p>
        <p>
          To the maximum extent the law allows, we are not liable for indirect, incidental,
          consequential or punitive loss, for lost profits, or for loss arising from your own
          errors, including sending assets to a wrong address, or losing access to the browser your
          record is held in.
        </p>
        <ReviewNote>
          Liability caps, carve-outs and any consumer-protection rights that cannot be excluded must
          be drafted by counsel for the governing jurisdiction. The paragraph above is a placeholder
          and is not enforceable as drafted.
        </ReviewNote>
      </>
    ),
  },
  {
    id: "indemnity",
    heading: "Indemnity",
    body: (
      <p>
        You agree to cover losses, claims and reasonable costs we incur that arise from your breach
        of these terms, your misuse of the platform, or your violation of any law or third-party
        right, except to the extent they result from our own breach or negligence.
      </p>
    ),
  },
  {
    id: "changes",
    heading: "Changes to the service and to these terms",
    body: (
      <p>
        We may change the platform, and we may change these terms. Material changes are written up
        on the <Link to="/legal/changes">change log</Link> and the date at the top of this page is
        updated. There is no mailing list to notify, because we hold no address to notify it at.
        Continuing to use the service after that point means you accept the revised terms. If you do
        not, close your account once your positions have matured.
      </p>
    ),
  },
  {
    id: "law",
    heading: "Governing law and disputes",
    body: (
      <>
        <p>
          Before starting formal proceedings, both sides agree to raise the issue through{" "}
          <Link to="/contact">contact</Link> and attempt to resolve it in good faith.
        </p>
        <ReviewNote>
          Governing law, forum, dispute-resolution mechanism and any arbitration or class-action
          provisions are deliberately left blank. They must be drafted by counsel once the operating
          entity and its jurisdiction are established. Do not publish this page with placeholders in
          place of a real forum clause.
        </ReviewNote>
      </>
    ),
  },
  {
    id: "general",
    heading: "General",
    body: (
      <>
        <p>
          These terms, together with the <Link to="/legal/privacy">Privacy Policy</Link> and the{" "}
          <Link to="/legal/risk">Risk Disclosure</Link>, are the whole agreement between you and us
          on this subject. If any clause is held unenforceable, the rest continues to apply. Our not
          enforcing a right on one occasion does not waive it. You may not transfer your rights
          under this agreement without our consent; we may transfer ours as part of a corporate
          transaction.
        </p>
        <p>
          Questions about these terms go through <Link to="/contact">contact</Link>, which is a
          public route and does not require you to be signed in. Changes to the product are dated on
          the <Link to="/legal/changes">change log</Link>.
        </p>
      </>
    ),
  },
];

export default function TermsOfService() {
  return (
    <LegalPage
      kicker="Legal"
      title="Terms of Service"
      updated={UPDATED}
      summary={
        <>
          A vault is a {CYCLE_DAYS}-day commitment: capital is not available on demand once a term
          is open, and the published {pct(CYCLE_RETURN, 0)} structure is a target rather than a
          guaranteed payment. Funding is not open in this build, there is no password on your
          account, and your record lives in your own browser. Nothing here is advice.
        </>
      }
      sections={SECTIONS}
    />
  );
}
