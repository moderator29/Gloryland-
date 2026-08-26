import { Link } from "react-router-dom";
import { LegalPage, ReviewNote, type LegalSection } from "@/components/landing/LegalLayout";

/**
 * Privacy policy for the product that exists.
 *
 * The version this replaced described a different platform: it said Rigel
 * collects an email address, identity documents, security telemetry and
 * device enrolments, none of which happens anywhere in the codebase, and it
 * named none of the third parties the browser genuinely talks to. A policy
 * that overstates collection is not a safe error. It trains a reader to skim,
 * and it hides the three real disclosures underneath four invented ones.
 *
 * Every processor named below was checked against the code on the day this
 * was written: CoinGecko in `src/hooks/useMarket.ts`, GitHub's raw host in
 * `src/features/market/assets.ts`, Anthropic in `api/ai/chat.ts`, and Vercel
 * in `src/main.tsx`. Nothing else opens a connection. Type is served from our
 * own origin, so no font host is contacted, which is why none is listed.
 *
 * Anything added here must name the file that proves it.
 */

const UPDATED = "26 August 2026";

const SECTIONS: LegalSection[] = [
  {
    id: "scope",
    heading: "Who this policy covers",
    body: (
      <>
        <p>
          This policy describes how Rigel (&ldquo;Rigel&rdquo;, &ldquo;we&rdquo;) handles personal
          information when you visit this site or use the portal. It applies to every part of the
          service unless a separate notice is presented to you at the point of collection.
        </p>
        <p>
          It describes the build that is running today, not the one that is planned. Where the
          product does not do something, this policy says so rather than reserving the right in
          advance. When that changes, the change is dated on the{" "}
          <Link to="/legal/changes">change log</Link>.
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
    heading: "What we collect, and where it is held",
    body: (
      <>
        <p>
          <strong>
            There is no Rigel account server, so there is no store of member records for us to hold.
          </strong>{" "}
          Everything the portal knows about you is written to storage in the browser you are using,
          under keys beginning <span className="machine">rgl_</span>. The{" "}
          <Link to="/app/security">security page</Link> reads those keys back and lists them, so you
          can check this rather than take it on trust.
        </p>
        <h3>Held in your browser, and nowhere else</h3>
        <ul>
          <li>
            <strong>Your member name and profile.</strong> The handle you chose, your display name
            and the approach you picked at sign up.
          </li>
          <li>
            <strong>Your event ledger.</strong> Every placement, claim, settlement and instruction,
            as an append only log. Every figure in the portal is replayed from it.
          </li>
          <li>
            <strong>Your preferences.</strong> Motion, density, sound, notification choices, the
            order of your Home sections and whether the sidebar is collapsed.
          </li>
          <li>
            <strong>Assistant conversations.</strong> Your message history with Copilot and Support.
          </li>
          <li>
            <strong>A referral code</strong> if you arrived on an invitation link, and a cache of
            the latest market prices.
          </li>
        </ul>
        <p>
          None of this is transmitted to us, backed up or recoverable. Clearing site data deletes
          all of it permanently, and it does not follow you to another device.
        </p>
        <h3>What we do not collect</h3>
        <ul>
          <li>
            <strong>No email address, phone number or postal address.</strong> Sign up never asks
            for one, and there is nowhere to send it.
          </li>
          <li>
            <strong>No identity documents.</strong> There is no verification step in this build.
          </li>
          <li>
            <strong>No password or credential.</strong> There is nothing to authenticate against, so
            nothing is set and nothing is stored.
          </li>
          <li>
            <strong>No payment details, card, bank account or custody.</strong> No deposit address
            is shown, because nothing behind the product could receive a transfer.
          </li>
        </ul>
        <ReviewNote>
          If identity verification is ever required of the operating entity, the data set collected
          and its retention period must be added here before that step ships, and the change dated
          on the change log.
        </ReviewNote>
      </>
    ),
  },
  {
    id: "third-parties",
    heading: "The third parties this product actually talks to",
    body: (
      <>
        <p>
          Four, and no others. Two are contacted directly by your browser, which means your IP
          address reaches them without passing through us and we have no record of the request.
        </p>
        <h3>Vercel</h3>
        <p>
          Serves this site. Every request for a page, a script or a font reaches Vercel&rsquo;s
          network, which sees your IP address, the URL requested, your user agent and the time, in
          the ordinary way any web host does. Vercel also runs the two serverless functions the
          product uses.
        </p>
        <p>
          In production only, and only on the deployed host, the site loads{" "}
          <strong>Vercel Web Analytics</strong>. It records page views and coarse referrer, device
          and country signals in aggregate. It sets no cookie, writes nothing to your browser
          storage, and does not build a profile of you or follow you to other sites. It does not run
          on a local or preview build. What it collects is described in the section on cookies
          below.
        </p>
        <h3>CoinGecko</h3>
        <p>
          Supplies the prices and the price history shown on Markets, on the header ticker and on
          the Desk. Your browser calls the CoinGecko public API directly, so your IP address and the
          fact that you requested prices reach CoinGecko. No account information is sent, because
          the request carries none: it asks for the price of five assets and nothing else.
        </p>
        <h3>GitHub</h3>
        <p>
          Serves the five asset logos, as static images from the Trust Wallet assets repository on{" "}
          <span className="machine">raw.githubusercontent.com</span>. Your browser requests those
          images directly, so your IP address reaches GitHub. Nothing else is sent, and a blocked
          request simply shows a lettered tile instead.
        </p>
        <h3>Anthropic</h3>
        <p>
          Answers questions put to <Link to="/app/copilot">Copilot</Link> and{" "}
          <Link to="/app/support">Support</Link>, and <strong>only</strong> when you send one.
          Opening either surface sends nothing. When you do send a message, it goes to our own
          server first and from there to Anthropic&rsquo;s API, so the credential never reaches your
          browser and your IP address never reaches Anthropic.
        </p>
        <p>
          What is sent is your message, the recent turns of that conversation, and a short factual
          summary of figures derived from your own ledger, capped in length. That summary carries no
          name, no handle and no address, only figures the product has already shown you.{" "}
          <strong>It is included by default.</strong> Turning off &ldquo;Share my position&rdquo;,
          which sits in the panel on the assistant&rsquo;s own screen, means the summary is never
          assembled and only your message is sent.
        </p>
        <ReviewNote>
          The contractual terms with each processor above, the countries they operate from, and
          whether Anthropic&rsquo;s enterprise retention terms apply to this key, must be confirmed
          and stated here before publication.
        </ReviewNote>
      </>
    ),
  },
  {
    id: "use",
    heading: "How information is used",
    body: (
      <>
        <p>
          The data in your browser is used to run the product in front of you: to derive every
          figure from your ledger, to keep the interface in the state you left it, and to answer a
          question you ask an assistant. It is read by code running on your own device.
        </p>
        <p>
          The aggregate analytics described above are used for one thing, which is knowing which
          pages people read. They are not used to identify you, to target you, or to make any
          decision about your account.
        </p>
        <p>
          We do not sell personal information. We do not share it with third parties for their own
          marketing. There is no advertising network, no tracking pixel and no data broker anywhere
          in this product.
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
          Where a legal basis is required, we rely on our legitimate interest in operating and
          improving a working platform, on the performance of any agreement with you, and on
          compliance with legal obligations that apply to us.
        </p>
        <p>
          We do not currently rely on consent for anything, because nothing in this build is gated
          behind a consent prompt. If a future feature needs one, it will ask before it runs and the
          change will be dated on the <Link to="/legal/changes">change log</Link>.
        </p>
        <ReviewNote>
          The lawful-basis framework above is written in the language of European-style data
          protection law, and whether legitimate interest is available for aggregate analytics
          depends on the regime that governs the operating entity. It must be re-drafted to match.
        </ReviewNote>
      </>
    ),
  },
  {
    id: "sharing",
    heading: "When information is shared",
    body: (
      <>
        <p>
          Beyond the four processors named above, personal information would leave our systems only
          in these cases:
        </p>
        <ul>
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
        <p>
          In practice, a demand for your account records could not be satisfied today, because the
          records are in your browser and we do not have a copy.
        </p>
      </>
    ),
  },
  {
    id: "chain",
    heading: "Blockchain data is permanent",
    body: (
      <>
        <p>
          This build shows no deposit address and has no custody, so it does not put a transaction
          on any public network on your behalf. Nothing here creates an on-chain record.
        </p>
        <p>
          If that changes, the following applies and applies permanently. Transactions on a public
          blockchain are recorded on that network, not on our systems. We cannot edit, delete or
          reverse them and neither can anyone else. Addresses and amounts are visible to anyone who
          looks, and analysis can sometimes link an address to a person. Any right you have to
          erasure covers data we hold, and it cannot extend to a public ledger.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    heading: "How long it is kept",
    body: (
      <>
        <p>
          Your ledger, your preferences and your assistant history stay in your browser until you
          erase them or clear site data. There is no expiry and no server side copy, so retention is
          entirely in your hands. Settings offers an export of the full event log, an import, and an
          erase behind a typed confirmation.
        </p>
        <p>
          Aggregate analytics are retained by Vercel under its own retention policy. Ordinary server
          request logs are retained by Vercel for a short period in the normal course of hosting.
        </p>
        <ReviewNote>
          Vercel&rsquo;s stated retention periods for analytics and request logs must be confirmed
          and quoted here, along with any retention obligation that applies to the operating entity
          once a server holds member records.
        </ReviewNote>
      </>
    ),
  },
  {
    id: "security",
    heading: "How it is protected, and how it is not",
    body: (
      <>
        <p>
          <strong>Nothing stored in your browser is encrypted by us.</strong> It is ordinary browser
          storage, readable by anything with access to that browser profile, including another
          person using the same unlocked device and any extension you have installed. There is no
          password on it, because there is no account to attach one to.
        </p>
        <p>
          Changes to your record are written as new entries rather than edits, so the history of an
          account can be reconstructed and a correction never erases what it corrects. Our server
          side credentials, which today means one API key for the assistants, are held in the server
          environment and never reach the browser.
        </p>
        <p>
          The <Link to="/app/security">security page</Link> sets this out in more detail and reads
          your browser&rsquo;s own storage back to you, key by key. Read it before you decide how
          much to put into this product. No system is perfectly secure. If a breach affects
          information we hold, we will tell you and any regulator we are required to notify, within
          the timeframes that apply to us.
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
          Most of these you can exercise yourself, immediately, without asking us. Access,
          portability and erasure all live in{" "}
          <Link to="/app/settings/data">Settings, under Data</Link>: export the complete event log
          as JSON or CSV, import it into another browser, or erase it. We could not perform any of
          those on your behalf today, because we do not hold the data.
        </p>
        <p>
          For anything else, including a question about this policy or about the aggregate analytics
          described above, use <Link to="/contact">contact</Link>. If you write to us about an
          account, we may need to establish that the account is yours, precisely because we should
          not hand anybody&rsquo;s data to somebody claiming to be them.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    heading: "Cookies and browser storage",
    body: (
      <>
        <p>
          <strong>This site sets no cookies.</strong> Not for sign in, not for preferences, not for
          analytics. What it uses instead is browser local storage, under the{" "}
          <span className="machine">rgl_</span> keys described above, which never leaves your device
          and is not transmitted with requests the way a cookie is.
        </p>
        <p>
          The one measurement script is Vercel Web Analytics, described in the third parties
          section. It is cookieless and storage-free by design, it records a page view rather than a
          person, and it runs only on the deployed production site.{" "}
          <strong>
            It is not currently gated behind a consent prompt, and this policy does not claim
            otherwise.
          </strong>{" "}
          If you would rather it did not run, a content blocker or your browser&rsquo;s tracking
          protection will stop it, and every part of the product will continue to work, because
          nothing depends on it.
        </p>
        <ReviewNote>
          Whether cookieless aggregate analytics require prior consent depends on the regime that
          governs the operating entity, and in some jurisdictions it does regardless of cookies. If
          consent is required, the script must be gated behind a prompt with a withdrawal control
          before launch, and this section rewritten to describe it.
        </ReviewNote>
      </>
    ),
  },
  {
    id: "transfers",
    heading: "International transfers",
    body: (
      <>
        <p>
          The processors named above operate globally, so a request from your browser may be served
          from, or processed in, a country other than the one you live in. Where we place data with
          a vendor, we require appropriate contractual protections before it moves.
        </p>
        <ReviewNote>
          The transfer mechanisms relied on, standard contractual clauses, adequacy decisions or
          equivalents, must be specified per processor once hosting regions are fixed.
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
          When this policy changes materially, the date at the top of the page is updated and the
          change is written up on the <Link to="/legal/changes">change log</Link>. There is no
          mailing list to notify, because we hold no address to notify it at. Continuing to use the
          service after a change means the revised policy applies to you.
        </p>
        <p>
          Questions about this policy, or about anything named in it, go through{" "}
          <Link to="/contact">contact</Link>, which is a public route and does not require you to be
          signed in. Related documents: <Link to="/legal/terms">Terms of Service</Link>,{" "}
          <Link to="/legal/risk">Risk Disclosure</Link> and the{" "}
          <Link to="/legal/changes">change log</Link>.
        </p>
        <ReviewNote>
          A named data protection representative, where one is required, must be added here. Do not
          publish a postal address until the operating entity and its registered office are
          confirmed.
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
          There is no Rigel account server, so we hold almost nothing. Your member name, your event
          ledger and your preferences live in this browser and nowhere else, we ask for no email
          address and no identity document, and this site sets no cookies. Four third parties are
          involved: Vercel serves the site and counts page views in aggregate, CoinGecko supplies
          prices, GitHub serves the asset logos, and Anthropic answers a question when you send one
          to an assistant.
        </>
      }
      sections={SECTIONS}
    />
  );
}
