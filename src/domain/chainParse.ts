/**
 * Turning a chain's answer into a transfer.
 *
 * Split out of `api/chain/verify.ts` so that everything which can be wrong
 * without a network is testable without one. What is left in the handler is
 * the fetching; what is here is every decision made about the bytes that come
 * back, which is where the mistakes actually live: a decimal place, a base
 * unit, which log is the one that matters, and off by one in a confirmation
 * count.
 *
 * The shapes below are what the endpoints actually return. Bitcoin is
 * Blockstream's Esplora API, and the two EVM chains and Solana are plain JSON
 * RPC. Anything absent from a response is treated as absent rather than as
 * zero where the difference matters.
 */

export type Parsed = {
  /** The address this transfer paid, as the chain records it. */
  to: string;
  /** Units of the asset itself, scaled out of base units. */
  amount: number;
  confirmations: number;
  /** Milliseconds since the epoch, or null when the chain does not say. */
  at: number | null;
};

/** `Transfer(address,address,uint256)`, the topic every ERC-20 emits. */
export const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

/** USDT on Ethereum, and its six decimals rather than the usual eighteen. */
export const USDT_CONTRACT = "0xdac17f958d2ee523a2206206994597c13d831ec7";
export const USDT_DECIMALS = 6;

export const hexToBig = (h: string | undefined) => (h && h !== "0x" ? BigInt(h) : 0n);
export const scale = (v: bigint, decimals: number) => Number(v) / 10 ** decimals;
/** A 32 byte log topic back to the 20 byte address inside it. */
export const topicToAddress = (t: string | undefined) => (t ? `0x${t.slice(-40)}` : "");

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/* --------------------------------------------------------------- bitcoin */

export type EsploraTx = {
  vout?: { scriptpubkey_address?: string; value?: number }[];
  status?: { confirmed?: boolean; block_height?: number; block_time?: number };
};

export function parseBitcoin(tx: EsploraTx, ours: string, tipHeight: number | null): Parsed {
  // Every output paying us, summed. A transaction can pay one address more
  // than once and taking the first would undercount the transfer.
  const sats = (tx.vout ?? [])
    .filter((o) => o.scriptpubkey_address && same(o.scriptpubkey_address, ours))
    .reduce((s, o) => s + (o.value ?? 0), 0);

  let confirmations = 0;
  if (tx.status?.confirmed && typeof tx.status.block_height === "number" && tipHeight !== null) {
    // The block a transaction is in counts as its first confirmation, so a
    // transaction in the tip block reads 1 and not 0.
    confirmations = Math.max(0, tipHeight - tx.status.block_height + 1);
  }

  return {
    to: sats > 0 ? ours : ((tx.vout ?? [])[0]?.scriptpubkey_address ?? ""),
    amount: sats / 1e8,
    confirmations,
    at: tx.status?.block_time ? tx.status.block_time * 1000 : null,
  };
}

/* ------------------------------------------------------------------- evm */

export type EvmTx = { to?: string; value?: string; blockNumber?: string | null };
export type EvmReceipt = {
  status?: string;
  logs?: { address?: string; topics?: string[]; data?: string }[];
};

export function evmConfirmations(tipHex: string, minedHex: string | null | undefined): number {
  if (!minedHex) return 0;
  const tip = hexToBig(tipHex);
  const mined = hexToBig(minedHex);
  return tip >= mined ? Number(tip - mined) + 1 : 0;
}

/** A native ETH or BNB transfer: the transaction's own recipient and value. */
export function parseEvmNative(
  tx: EvmTx,
  ours: string,
  confirmations: number,
  at: number | null,
): Parsed {
  const to = tx.to ?? "";
  if (!same(to, ours)) return { to, amount: 0, confirmations, at };
  return { to: ours, amount: scale(hexToBig(tx.value), 18), confirmations, at };
}

/**
 * A USDT transfer, which is a log rather than the transaction's own value.
 *
 * The transaction's `to` is the token contract, not the recipient, so reading
 * `value` here would report zero on every real transfer. What matters is a
 * `Transfer` log emitted by the USDT contract whose second indexed topic is
 * our address, and there can be more than one in a batched send.
 */
export function parseEvmToken(
  receipt: EvmReceipt,
  ours: string,
  confirmations: number,
  at: number | null,
  contract: string = USDT_CONTRACT,
  decimals: number = USDT_DECIMALS,
): Parsed {
  const logs = receipt.logs ?? [];
  const mine = logs.filter(
    (l) =>
      l.address !== undefined &&
      same(l.address, contract) &&
      (l.topics ?? [])[0] !== undefined &&
      same((l.topics ?? [])[0] as string, TRANSFER_TOPIC) &&
      same(topicToAddress((l.topics ?? [])[2]), ours),
  );
  const total = mine.reduce((s, l) => s + hexToBig(l.data), 0n);

  if (total === 0n) {
    // Nothing for us. Report where it did go, so the interface can say the
    // transfer was real but paid somewhere else rather than saying it failed.
    const other = logs.find(
      (l) =>
        (l.topics ?? [])[0] !== undefined && same((l.topics ?? [])[0] as string, TRANSFER_TOPIC),
    );
    return { to: topicToAddress((other?.topics ?? [])[2]), amount: 0, confirmations, at };
  }
  return { to: ours, amount: scale(total, decimals), confirmations, at };
}

/* ---------------------------------------------------------------- solana */

export type SolanaTx = {
  slot?: number;
  blockTime?: number | null;
  meta?: { err?: unknown; preBalances?: number[]; postBalances?: number[] };
  transaction?: { message?: { accountKeys?: (string | { pubkey?: string })[] } };
};

/**
 * Solana reports balances rather than transfers, so the amount is our own
 * account's balance change. That is right whether the lamports arrived from a
 * plain system transfer or out of a program, which a transfer instruction
 * walk would miss.
 */
export function parseSolana(tx: SolanaTx, ours: string, finalizedSlot: number | null): Parsed {
  const keys = (tx.transaction?.message?.accountKeys ?? []).map((k) =>
    typeof k === "string" ? k : (k.pubkey ?? ""),
  );
  const index = keys.indexOf(ours);
  if (index === -1) {
    return { to: keys[0] ?? "", amount: 0, confirmations: 0, at: null };
  }

  const before = tx.meta?.preBalances?.[index] ?? 0;
  const after = tx.meta?.postBalances?.[index] ?? 0;
  const lamports = Math.max(0, after - before);

  const confirmations =
    typeof tx.slot === "number" && finalizedSlot !== null
      ? Math.max(0, finalizedSlot - tx.slot)
      : 0;

  return {
    to: ours,
    amount: lamports / 1e9,
    confirmations,
    at: tx.blockTime ? tx.blockTime * 1000 : null,
  };
}
