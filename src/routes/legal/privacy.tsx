import { Link } from "react-router-dom";
import { LegalPage, ReviewNote, type LegalSection } from "@/components/landing/LegalLayout";

const UPDATED = "25 August 2026";

const SECTIONS: LegalSection[] = [
  {
    id: "scope",
    heading: "Who this policy covers",
    body: (
      <>
        <p>
          This policy describes how Rigel (&ldquo;Rigel&rdquo;, &ldquo;we&rdquo;) handles personal
          information when you visit this site, create a member account, or use the vault platform.
          It applies to every part of the service unless a separate notice is presented to you at
          the point of collection.
        </p>
        <p>
          Using the service means you have read this policy. If you disagree with any part of it,
          the correct response is not to use the platform.
        </p>
        <ReviewNote>
          The identity of the legal entity that acts as data controller, and the jurisdiction it is
          established in, must be inserted here before publication. That determines which privacy
          regime governs this document.
        </ReviewNote>
      </>
    ),
  },
  {
    id: "collect",
    heading: "Information we collect",
    body: (
      <>
        <p>We collect only what the service needs in order to function and to stay accountable.</p>
        <h3>Information you give us</h3>
        <ul>
          <li>
            <strong>Account details.</strong> The name, email address and contact details you supply
            when registering.
          </li>
          <li>
            <strong>Identity information.</strong> Documents and details supplied when verifying who
            you are, where verification is required of us.
          </li>
          <li>
            <strong>Financial instructions.</strong> Deposit references, withdrawal destinations you
            register, and the positions you open.
          </li>
          <li>
            <strong>Correspondence.</strong> Messages you send to support, including anything you
            attach to them.
          </li>
        </ul>
        <h3>Information collected automatically</h3>
        <ul>
          <li>
            <strong>Device and session data.</strong> Device type, browser, operating system and the
            approximate location derived from your IP address.
          </li>
          <li>
            <strong>Usage data.</strong> Pages viewed, actions taken in the portal, and timestamps ,
            used for security, debugging and product decisions.
          </li>
          <li>
            <strong>Security telemetry.</strong> Authentication events, device enrolments and failed
            access attempts.
          </li>
        </ul>
        <ReviewNote>
          The exact identity-verification data set we are required to collect, and how long it must
          be retained, depends on the anti-money-laundering rules that apply to the operating
          entity. Confirm with counsel before listing specific document types.
        </ReviewNote>
      </>
    ),
  },
  {
    id: "use",
    heading: "How we use information",
    body: (
      <>
        <p>Each category of data is collected for a stated purpose and used for that purpose:</p>
        <ul>
          <li>To create and operate your account, and to authenticate you when you return.</li>
          <li>
            To open, track, mature and settle vault positions, and to keep the ledger correct.
          </li>
          <li>
            To detect fraud, unauthorised access and abuse, including reviewing unusual withdrawal
            patterns before value moves.
          </li>
          <li>To respond to your support requests and to notify you about your positions.</li>
          <li>To improve the platform, prioritise work and diagnose faults.</li>
          <li>To meet record-keeping and reporting obligations that apply to us.</li>
        </ul>
        <p>
          We do not sell personal information, and we do not share it with third parties for their
          own marketing.
        </p>
      </>
    ),
  },
  {
    id: "basis",
    heading: "Our basis for processing",
    body: (
      <>
        <p>
          Where a legal basis is required, we rely on one of the following: performance of our
          agreement with you, compliance with a legal obligation, our legitimate interest in running
          a secure platform, or your consent where we have asked for it.
        </p>
        <p>
          Where we rely on consent, for example for non-essential analytics, you can withdraw it at
          any time, and withdrawing it does not affect processing already carried out.
        </p>
        <ReviewNote>
          The lawful-basis framework above is written in the language of European-style data
          protection law. It must be re-drafted to match the regime that actually governs the
          operating entity.
        </ReviewNote>
      </>
    ),
  },
  {
    id: "sharing",
    heading: "When information is shared",
    body: (
      <>
        <p>Personal information leaves our systems in a small number of defined cases:</p>
        <ul>
          <li>
            <strong>Service providers.</strong> Infrastructure, communications and identity
            verification vendors who process data on our instructions and under contract.
          </li>
          <li>
            <strong>Legal process.</strong> Where we are compelled by a valid order, or where
            disclosure is necessary to establish or defend legal claims.
          </li>
          <li>
            <strong>Protecting people.</strong> Where disclosure is necessary to prevent fraud or
            harm, or to protect the rights and safety of members or the public.
          </li>
          <li>
            <strong>Corporate transactions.</strong> If the business is reorganised or transferred,
            data may move with it, subject to this policy continuing to apply.
          </li>
        </ul>
        <ReviewNote>
          The list of processors and sub-processors, and the countries they operate from, must be
          enumerated here once the vendor stack is finalised.
        </ReviewNote>
      </>
    ),
  },
  {
    id: "chain",
    heading: "Blockchain data is permanent",
    body: (
      <>
        <p>
          Transactions you make on a public blockchain are recorded on that network, not on our
          systems. We cannot edit, delete or reverse them, and neither can anyone else. Addresses
          and amounts are visible to anyone who looks, and analysis can sometimes link an address to
          a person.
        </p>
        <p>
          This is a property of the networks themselves. Any right you have to erasure under this
          policy applies to data we hold, it cannot extend to a public ledger.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    heading: "How long we keep it",
    body: (
      <>
        <p>
          Account and transaction records are retained for as long as your account is open and for a
          period afterwards, so that we can meet record-keeping obligations, resolve disputes and
          enforce our agreements. Security logs are kept for a shorter period. When a retention
          period ends, data is deleted or irreversibly anonymised.
        </p>
        <ReviewNote>
          Specific retention periods must be set per data category, driven by the record-keeping
          rules that apply to the operating entity.
        </ReviewNote>
      </>
    ),
  },
  {
    id: "security",
    heading: "How we protect it",
    body: (
      <>
        <p>
          Access to member data is restricted to the people who need it to do their work, and every
          access path requires authentication. Sensitive actions are bound to devices you have
          approved, and the systems that serve the application are separated from the systems that
          hold key material. Changes to records are written as new entries rather than edits, so the
          history of an account can be reconstructed.
        </p>
        <p>
          No system is perfectly secure. If a breach affects your information, we will tell you and
          any regulator we are required to notify, within the timeframes that apply to us.
        </p>
      </>
    ),
  },
  {
    id: "rights",
    heading: "Your rights and choices",
    body: (
      <>
        <p>Depending on where you live, you may have the right to:</p>
        <ul>
          <li>Ask what personal information we hold about you, and get a copy of it.</li>
          <li>Correct information that is inaccurate or incomplete.</li>
          <li>Ask us to delete information, where we are not required to keep it.</li>
          <li>Object to or restrict certain processing.</li>
          <li>Receive your data in a portable format.</li>
          <li>Complain to your local data protection authority.</li>
        </ul>
        <p>
          To exercise any of these, contact us through the channel listed in your account. We may
          need to verify your identity first, precisely because we should not hand your data to
          somebody claiming to be you.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    heading: "Cookies and local storage",
    body: (
      <>
        <p>
          We use cookies and browser storage for things the platform cannot work without, keeping
          you signed in, remembering your interface preferences, and protecting against cross-site
          request forgery. Where we use anything beyond that, such as product analytics, we ask
          first and you can decline without losing access to the service.
        </p>
      </>
    ),
  },
  {
    id: "transfers",
    heading: "International transfers",
    body: (
      <>
        <p>
          Our infrastructure and our vendors may process data in countries other than the one you
          live in. Where that happens, we require appropriate contractual protections before data
          moves.
        </p>
        <ReviewNote>
          The transfer mechanisms relied on, standard contractual clauses, adequacy decisions or
          equivalents, must be specified once hosting regions and vendors are fixed.
        </ReviewNote>
      </>
    ),
  },
  {
    id: "children",
    heading: "Children",
    body: (
      <p>
        The platform is not for children. We do not knowingly collect information from anyone under
        the age of majority in their jurisdiction, and we will delete such information if we learn
        we have it.
      </p>
    ),
  },
  {
    id: "changes",
    heading: "Changes and contact",
    body: (
      <>
        <p>
          When this policy changes materially, we will update the date at the top of the page and
          notify account holders through the platform before the change takes effect. Continuing to
          use the service after that point means the revised policy applies to you.
        </p>
        <p>
          Questions about this policy, or about the data we hold, should be raised through the
          support channel in your account. Related documents:{" "}
          <Link to="/legal/terms">Terms of Service</Link> and{" "}
          <Link to="/legal/risk">Risk Disclosure</Link>.
        </p>
        <ReviewNote>
          A published contact route for privacy enquiries, and, where required, a named data
          protection representative, must be added here. Do not publish a postal address until the
          operating entity and its registered office are confirmed.
        </ReviewNote>
      </>
    ),
  },
];

export default function PrivacyPolicy() {
  return (
    <LegalPage
      kicker="Legal"
      title="Privacy Policy"
      updated={UPDATED}
      summary={
        <>
          We collect what the platform needs to run and to stay accountable: your account details,
          the positions you open, and the security signals that keep the account yours. We do not
          sell personal information. Transactions you make on a public blockchain are outside our
          control and permanent.
        </>
      }
      sections={SECTIONS}
    />
  );
}
