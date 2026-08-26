import { Link } from "react-router-dom";
import { LegalPage, type LegalSection } from "@/components/landing/LegalLayout";

/**
 * The platform's own change log.
 *
 * Rigel asks to be trusted on the grounds that a member's record is append
 * only and every figure replays from it. That argument is weaker than it
 * looks while the platform's own changes are invisible: standing changed
 * basis on 26 August and nothing in the product said so. This page extends
 * the same discipline from the member's ledger to the product.
 *
 * Two rules for anything added here. Write the change, not the intention,
 * and name the surface a reader can check it on. An entry that cannot be
 * verified against the running product does not belong on the page.
 */

const UPDATED = "26 August 2026";

const SECTIONS: LegalSection[] = [
  {
    id: "how",
    heading: "How this log works",
    body: (
      <>
        <p>
          Every change that alters what a figure means, what the product does without being asked,
          or what it claims about itself is written here on the day it ships. Entries are added,
          never edited away. When something on this page turns out to be wrong, the correction is a
          new entry underneath it rather than a quiet rewrite, which is the same rule the event log
          behind your own account follows.
        </p>
        <p>
          The log starts on the day it was published. Changes made before that are not reconstructed
          here, because the product kept no record of them to reconstruct from, and inventing dates
          for them would be the first untrue thing on the page.
        </p>
      </>
    ),
  },
  {
    id: "d-2026-08-26",
    heading: "26 August 2026",
    body: (
      <>
        <h3>Changed, and worth reading before you check a figure</h3>
        <ul>
          <li>
            <strong>Tier standing changed basis.</strong> Standing used to be your lifetime
            contribution alone. It is now the greater of your lifetime contribution and the most
            capital you have ever had deployed at one time. The reason is that a member who rolls a
            matured term into a new one brings in no new capital and used to stop climbing, while
            the old rule could also be walked up by moving the same money in a circle. Neither is
            true now. The full derivation, step by step, is on the{" "}
            <Link to="/app/glossary#standing">glossary</Link>.
          </li>
          <li>
            <strong>Capital placed from your account balance no longer counts twice.</strong> A
            placement funded from money already inside the account is recorded as such: your
            available balance is debited and your lifetime contribution does not move, because that
            money was counted when it first arrived. Before this, rolling one thousand dollars once
            showed a portfolio of two thousand six hundred against a real one thousand three
            hundred.
          </li>
        </ul>

        <h3>Added</h3>
        <ul>
          <li>
            <strong>Relay.</strong> A standing instruction on one open position. Arm it and when the
            term matures it claims, closes and reopens with what it carried, then arms itself again.
            It writes to your ledger without asking a second time, and it runs the next time you
            open Rigel after maturity, never before and never backdated.
          </li>
          <li>
            <strong>Course.</strong> A schedule of placements you fill by hand. Rigel cannot take
            money from you, so a leg you do not fill visibly slips rather than being collected.
          </li>
          <li>
            <strong>Echelon.</strong> One sum planned as several terms that start days apart, so
            maturities land in sequence instead of together.
          </li>
          <li>
            <strong>A way to reach a person.</strong> <Link to="/contact">Contact</Link> is a public
            route outside the portal, because somebody who cannot get in is exactly the person who
            most needs to write.
          </li>
          <li>
            <strong>This log.</strong>
          </li>
        </ul>

        <h3>Corrected</h3>
        <ul>
          <li>
            The landing page and three answers in the FAQ said nothing renews or rolls on its own.
            Relay had shipped and does exactly that on a position where you armed one. All of them
            now say so.
          </li>
          <li>
            The relay panel showed its disclosure once per browser, ever, so a second relay was
            armed with no statement of what it would do. The disclosure is now permanent, on the
            panel, armed or not.
          </li>
          <li>
            The members viewing figure on Home is generated rather than measured, and said so only
            to a screen reader. It now carries the word Sample in visible text.
          </li>
          <li>
            The <Link to="/legal/privacy">privacy policy</Link> named none of the third parties the
            product actually talks to, and described collecting an email address, identity documents
            and device enrolments, none of which happens. It now names what is real and drops what
            is not.
          </li>
          <li>
            The deposit receipt printed its one honest sentence at nine pixels in a grey that failed
            contrast, on an image built to be shared. It now states on its face that no transfer
            took place.
          </li>
          <li>
            Explain and Provenance still described standing as lifetime contribution hours after the
            derivation changed. They now show the arithmetic the ledger actually performs.
          </li>
        </ul>

        <h3>Removed</h3>
        <ul>
          <li>
            <strong>Five deposit addresses.</strong> They were real, valid and copyable, three of
            the five were the same widely circulated documentation example, and no wallet stood
            behind any of them. There is no custody in this build, so the funding surfaces now say
            funding is not open instead of printing a destination. Anyone who sent funds to one of
            those addresses cannot recover them, and that was reachable from the interface until
            this change.
          </li>
          <li>
            <strong>The predecessor product&rsquo;s rate card.</strong> Dead code in the repository
            still held seven plans paying different daily rates by size, with invented scarcity
            counts. Rigel publishes one rate on every rung and that file is gone.
          </li>
          <li>
            The generated member activity on Home is no longer mixed indistinguishably with your own
            events. Each generated item now carries a Sample marker.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "standing",
    heading: "What has not changed",
    body: (
      <>
        <p>
          The published term structure has never moved: one rate, the same on every rung, fixed when
          a position is written and unable to reach back into a term already running. If it ever
          does move, the change appears here on the day it happens and applies only to positions
          opened afterwards.
        </p>
        <p>
          Nor has the constraint under all of it. This build has no custody, no settlement and no
          account server, your record lives in this browser alone, and the{" "}
          <Link to="/legal/risk">risk disclosure</Link> sets out what that means for capital you
          place.
        </p>
      </>
    ),
  },
];

export default function Changes() {
  return (
    <LegalPage
      kicker="The record"
      title="Change log"
      updated={UPDATED}
      summary={
        <>
          What changed in the product, dated, in the order it happened. Entries are appended and
          never edited away, which is the rule the ledger behind your own account follows. The log
          starts on the day it was published rather than guessing at what came before.
        </>
      }
      sections={SECTIONS}
      footnote={
        <>
          This page is a record rather than an agreement. Nothing on it varies the{" "}
          <Link to="/legal/terms">terms of service</Link>, and where a dated entry and a legal
          document disagree, the legal document governs. If an entry does not match what you can see
          in the product, that is a defect worth reporting through{" "}
          <Link to="/contact">contact</Link>.
        </>
      }
    />
  );
}
