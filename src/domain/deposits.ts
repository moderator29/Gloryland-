import type { AssetId } from "@/features/market/assets";
import type { LedgerEvent } from "@/domain/ledger";

/**
 * Deposits, verified against the chain.
 *
 * THE PROBLEM THIS SOLVES, AND THE ONE IT DOES NOT
 *
 * The platform publishes five addresses and every member sends to the same
 * five. That means watching those addresses cannot, on its own, tell you whose
 * money arrived: a hundred members and one address produce a hundred transfers
 * and no way to attribute any of them. Per member addresses would fix that,
 * and they need a wallet that can derive them, which this does not have.
 *
 * So attribution comes from the member instead, and the chain is what checks
 * it. A member who has sent funds gives the transaction hash their wallet
 * showed them. That hash is fetched from a public explorer and has to satisfy
 * every one of the following before a cent is credited:
 *
 *  1. The transaction exists and did not fail.
 *  2. It pays one of the platform's own addresses. Paying anything else, or
 *     paying an address that merely looks similar, is refused.
 *  3. It has enough confirmations for the chain it is on.
 *  4. The hash has never been claimed in this ledger before.
 *
 * A hash is a fact about the chain, not a claim about a person, which is what
 * makes it a sound attribution: nobody can invent one, and a member who pastes
 * a stranger's transfer gets credited for money that did in fact arrive.
 *
 * WHAT IS STILL MISSING, STATED PLAINLY
 *
 * Rule 4 is per ledger, and a ledger lives in one browser. Two browsers can
 * each claim the same hash, because there is no server to hold the set of
 * hashes already spent. That is not a flaw in this design, it is the same
 * missing server that everything else in this product is waiting on, and the
 * check moves from local to global the day it exists without the rest of this
 * file changing at all. Until then a deposit is verified, not reconciled, and
 * the interface says so.
 */

/** Confirmations before a transfer counts, chosen per chain's finality. */
export const CONFIRMATIONS: Record<AssetId, number> = {
  // Roughly twenty minutes. Two blocks is the usual floor for a sum this size.
  btc: 2,
  // About two and a half minutes, and past any reorg depth seen in practice.
  eth: 12,
  // USDT rides Ethereum, so it inherits Ethereum's answer.
  usdt: 12,
  // Three quarter blocks, which on BNB Smart Chain is well under a minute.
  bnb: 15,
  // Solana calls a slot finalised at 31 confirmations. One past it.
  sol: 32,
};

/**
 * What a transaction hash looks like on each chain.
 *
 * Checked before anything is fetched, so a malformed value never reaches an
 * upstream URL. That is the same class of defect that was found in the country
 * lookup, where an attacker controlled header was interpolated into a request:
 * a string from a member is not a value until it has been through a shape it
 * had to match.
 */
export const TXID_SHAPE: Record<AssetId, RegExp> = {
  btc: /^[a-fA-F0-9]{64}$/,
  eth: /^0x[a-fA-F0-9]{64}$/,
  usdt: /^0x[a-fA-F0-9]{64}$/,
  bnb: /^0x[a-fA-F0-9]{64}$/,
  // Solana signatures are base58 and vary in length around 87 characters.
  sol: /^[1-9A-HJ-NP-Za-km-z]{64,90}$/,
};

export function validTxid(asset: AssetId, txid: string): boolean {
  return TXID_SHAPE[asset].test(txid.trim());
}

/** A transfer as the verifier reports it, whatever chain it came from. */
export type Transfer = {
  asset: AssetId;
  txid: string;
  /** The address it paid, as the chain records it. */
  to: string;
  /** Amount in the asset's own units, already scaled out of its base units. */
  amount: number;
  /** Confirmations right now. Zero means it is in a block but only just. */
  confirmations: number;
  /** Seconds since the epoch, or null when the chain does not say. */
  at: number | null;
};

export type Verdict =
  | { state: "verified"; transfer: Transfer }
  | { state: "pending"; transfer: Transfer; needs: number }
  | { state: "claimed"; transfer: Transfer; at: number }
  | { state: "elsewhere"; transfer: Transfer }
  | { state: "failed"; reason: string }
  | { state: "missing" };

/**
 * The whole decision, as one pure function.
 *
 * Everything that decides whether money is credited lives here rather than in
 * a component, so it can be asserted directly and so no surface can reach a
 * different answer than another surface.
 */
export function judge(
  transfer: Transfer | null,
  ourAddress: string,
  events: LedgerEvent[],
): Verdict {
  if (!transfer) return { state: "missing" };

  // Addresses compare case insensitively: EVM chains hand back mixed case
  // checksummed forms and a member's wallet may show either. Bitcoin bech32 is
  // lower case by construction, and Solana base58 is case significant but is
  // never re-cased by an explorer.
  if (transfer.to.toLowerCase() !== ourAddress.toLowerCase()) {
    return { state: "elsewhere", transfer };
  }

  const already = findClaim(events, transfer.txid);
  if (already !== null) return { state: "claimed", transfer, at: already };

  const needed = CONFIRMATIONS[transfer.asset];
  if (transfer.confirmations < needed) {
    return { state: "pending", transfer, needs: needed - transfer.confirmations };
  }

  return { state: "verified", transfer };
}

/** When this hash was credited in this ledger, or null if it never was. */
export function findClaim(events: LedgerEvent[], txid: string): number | null {
  const wanted = txid.trim().toLowerCase();
  for (const e of events) {
    if (e.kind === "deposit" && e.txid.toLowerCase() === wanted) return e.at;
  }
  return null;
}

/**
 * What a verified transfer is worth, in the dollars the ledger counts in.
 *
 * The rate used is recorded on the event beside the amount, never only the
 * product. A member who comes back in a month and finds a different price has
 * to be able to see which one was applied and check the multiplication, and a
 * figure that cannot be checked is the kind this product does not print.
 */
export function creditFor(amount: number, unitPrice: number): number {
  if (!Number.isFinite(amount) || !Number.isFinite(unitPrice)) return 0;
  if (amount <= 0 || unitPrice <= 0) return 0;
  // Rounded to the cent, because that is the resolution the ledger reports in
  // and carrying more would show a total nobody can reconcile against.
  return Math.round(amount * unitPrice * 100) / 100;
}

/** A link a member can open to see the transfer for themselves. */
export function explorerUrl(asset: AssetId, txid: string): string {
  switch (asset) {
    case "btc":
      return `https://blockstream.info/tx/${txid}`;
    case "sol":
      return `https://solscan.io/tx/${txid}`;
    case "bnb":
      return `https://bscscan.com/tx/${txid}`;
    default:
      return `https://etherscan.io/tx/${txid}`;
  }
}
