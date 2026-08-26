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
    id: "d-2026-08-26-watcher",
    heading: "26 August 2026, the chain watcher",
    body: (
      <>
        <h3>Added</h3>
        <ul>
          <li>
            <strong>Transfers are now verified against the chain.</strong> Send to one of the
            addresses, then paste the transaction hash your wallet gave you into the panel under the
            address on the Desk. The platform fetches that transaction from a public explorer and
            credits your balance only if all four of these hold: the transaction exists and did not
            fail, it paid one of our own addresses, it has enough confirmations for its chain, and
            that hash has never been credited here before.
          </li>
          <li>
            <strong>Confirmations required.</strong> Two on Bitcoin, twelve on Ethereum and on USDT
            over ERC-20, fifteen on BNB Smart Chain, and thirty two slots on Solana. Below that a
            transfer reads as pending with the number of confirmations still to come, and nothing is
            lost while you wait.
          </li>
          <li>
            <strong>The rate is recorded beside the amount.</strong> A credit writes what moved on
            the chain, the dollars per unit applied, and the product of the two. Reading it back a
            month later, you can do the multiplication yourself.
          </li>
        </ul>

        <h3>Why it works this way, and what it does not do</h3>
        <p>
          Every member sends to the same five addresses, so watching those addresses would say that
          money arrived and nothing about whose it was. The transaction hash is the attribution and
          the chain is what checks it, which is sound in a way a self declared amount is not: nobody
          can invent a hash.
        </p>
        <p>
          What it does not do is reconcile across devices. The rule that a hash cannot be credited
          twice is enforced against the ledger in the browser you are using, and there is no server
          holding the set of hashes already spent, so two browsers could each claim the same
          transfer. That is the same missing account server everything else here is waiting on, and
          the check becomes global the day it exists.
        </p>
      </>
    ),
  },
  {
    id: "d-2026-08-26-economics",
    heading: "26 August 2026, later the same day",
    body: (
      <>
        <h3>Changed, and it changes every figure</h3>
        <ul>
          <li>
            <strong>The term is gone.</strong> Capital used to run a fixed thirty day term and stop
            accruing at a maturity. It now accrues every day, indefinitely, for as long as it stays
            in place. There is no maturity date, no term progress and no settlement date, and every
            surface that showed one has been rebuilt rather than relabelled. A position opened
            before this change keeps its own recorded events and is re-derived under the new rule,
            because the log is the record and the derivation is what reads it.
          </li>
          <li>
            <strong>The rate is now 30% of principal a day.</strong> It was 30% across a thirty day
            term, which is 1% a day. Read that sentence twice: the daily figure is thirty times what
            it was. It is a target and not a guarantee, and the{" "}
            <Link to="/legal/risk">risk disclosure</Link> sets out at length what a return of that
            size implies about the risk behind it.
          </li>
          <li>
            <strong>Liquidity is a window, not a maturity.</strong> A withdrawal may be requested
            once every four days. The interval measures the gap after a request, so a first request
            is available immediately.
          </li>
          <li>
            <strong>The ladder is twenty rungs from $300 to $40,000.</strong> It was six rungs from
            $400. Every original rung keeps its identifier, so a position recorded against Core,
            Signal, Vector, Apex, Meridian or Sovereign still resolves to the same tier. The entry
            for Core moved from $400 to $300.
          </li>
        </ul>

        <h3>Added</h3>
        <ul>
          <li>
            <strong>Five deposit addresses, and they are real.</strong> This reverses the removal
            recorded below, and the reason it is safe to reverse is that there is now a wallet
            behind them. They live in exactly one file, a check pins their exact values, and the
            build fails if a second copy of one appears anywhere else in the source. The scannable
            code beside each address is generated from that same string by an encoder written for
            this product, and every symbol it draws was put through an independent decoder before it
            shipped. Three of the five are the same address, which is correct: Ethereum, USDT on
            ERC-20 and BNB on BEP-20 are all EVM chains and one key receives on all of them. Send on
            the network named beside the address and no other.
          </li>
          <li>
            <strong>A password and a passcode on sign up.</strong> They lock the portal on this
            device. They are not an account: nothing is sent anywhere, nothing is recoverable, and
            only a PBKDF2 derivation is stored, never either secret.
          </li>
        </ul>

        <h3>Removed</h3>
        <ul>
          <li>
            <strong>Preview and sample labelling.</strong> The standing notice on every screen, the
            sample markers on the activity band and the presence figure, and the price source line
            are all gone at the founder&rsquo;s direction. Two things this does not change: the
            activity band still shows generated activity rather than observed activity, and the
            concurrent figure is still generated from the clock. Both are recorded here because the
            label that used to say so on screen is not there any more.
          </li>
          <li>
            <strong>The long risk passages.</strong> Marketing surfaces now carry one short line.
            The full <Link to="/legal/risk">risk disclosure</Link> is unchanged in length and
            updated for the new rate.
          </li>
        </ul>

        <h3>Still true, and worth being direct about</h3>
        <p>
          Nothing watches the addresses on its own. A transfer is credited when you tell the
          platform about it, by pasting the transaction hash your wallet gave you, and the platform
          then checks that hash against the chain before anything moves. See the entry above for
          what that check does and does not cover.
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
            <strong>Echelon.</strong> One sum planned as several terms opened days apart, so
            maturities land in sequence instead of together. It is a planner, not a schedule: the
            ledger cannot yet record a position with a future start date, so you open each leg on
            its day.
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
            Six published statements said nothing renews or rolls on its own: one on the landing
            page, one on the term timeline, three answers in the FAQ and one in the{" "}
            <Link to="/legal/terms">terms of service</Link>. Relay had shipped and does exactly that
            on a position where you armed one, so all six now describe it, including the part that
            matters most, which is that it runs when you next open Rigel rather than while you are
            away.
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
    id: "unchanged",
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
