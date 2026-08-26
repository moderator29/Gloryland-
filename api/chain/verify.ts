import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ASSETS, type AssetId } from "../../src/features/market/assets";
import { TXID_SHAPE } from "../../src/domain/deposits";
import {
  evmConfirmations,
  parseBitcoin,
  parseEvmNative,
  parseEvmToken,
  parseSolana,
  type EsploraTx,
  type EvmReceipt,
  type EvmTx,
  type SolanaTx,
} from "../../src/domain/chainParse";

/**
 * Read one transaction off a public chain and report what it paid us.
 *
 * This is the chain watcher, and it is a verifier rather than a listener on
 * purpose. Listening to five addresses that every member shares tells you
 * money arrived and nothing about whose it is. A member's own transaction hash
 * is the attribution, and this function is what checks it against the chain
 * rather than taking it on trust. The rules that decide whether a credit
 * follows are in `src/domain/deposits.ts`, kept out of here so they can be
 * asserted without a network.
 *
 * NO API KEY IS REQUIRED, WHICH IS A DESIGN CONSTRAINT AND NOT AN ACCIDENT.
 * Every endpoint below is a public one. A key would be one more thing that can
 * expire, one more thing a deploy needs, and one more reason funding stops
 * working on a Sunday. Where a keyed provider would give richer history, this
 * gives less history and keeps working.
 *
 * Everything a caller sends is validated into a shape before it is used. The
 * hash goes into a URL path on three of the five chains, and a value that
 * reaches a URL without passing a shape first is how the country lookup was
 * once made to fetch whatever an attacker wanted.
 */

/** Read timeout per upstream call. A slow explorer must not hang the request. */
const TIMEOUT_MS = 9000;

type Found = {
  found: true;
  to: string;
  /** Units of the asset itself, already scaled out of base units. */
  amount: number;
  confirmations: number;
  at: number | null;
};
type NotFound = { found: false; reason: string };
type Result = Found | NotFound;

async function getJson(url: string, init?: RequestInit): Promise<unknown> {
  const control = new AbortController();
  const timer = setTimeout(() => control.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { ...init, signal: control.signal });
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

async function rpc(url: string, method: string, params: unknown[]): Promise<unknown> {
  const body = await getJson(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const envelope = body as { result?: unknown; error?: { message?: string } };
  if (envelope.error) throw new Error(envelope.error.message ?? "rpc error");
  return envelope.result;
}

/* --------------------------------------------------------------- bitcoin */

async function bitcoin(txid: string, ours: string): Promise<Result> {
  const base = "https://blockstream.info/api";
  let tx: EsploraTx;
  try {
    tx = (await getJson(`${base}/tx/${txid}`)) as EsploraTx;
  } catch {
    return { found: false, reason: "No transaction with that hash on Bitcoin." };
  }

  let tip: number | null = null;
  if (tx.status?.confirmed) {
    const height = Number(await getJson(`${base}/blocks/tip/height`));
    if (Number.isFinite(height)) tip = height;
  }

  return { found: true, ...parseBitcoin(tx, ours, tip) };
}

/* ------------------------------------------------------------------- evm */

const EVM_RPC: Record<string, string> = {
  eth: "https://ethereum-rpc.publicnode.com",
  usdt: "https://ethereum-rpc.publicnode.com",
  bnb: "https://bsc-rpc.publicnode.com",
};

async function evm(asset: AssetId, txid: string, ours: string): Promise<Result> {
  const url = EVM_RPC[asset];
  let tx: EvmTx | null;
  try {
    tx = (await rpc(url, "eth_getTransactionByHash", [txid])) as EvmTx | null;
  } catch {
    return { found: false, reason: "Could not reach the network. Try again in a moment." };
  }
  if (!tx) return { found: false, reason: "No transaction with that hash on this network." };
  if (!tx.blockNumber) {
    // In the mempool, so it exists but sits in no block: zero confirmations.
    return { found: true, to: ours, amount: 0, confirmations: 0, at: null };
  }

  const receipt = (await rpc(url, "eth_getTransactionReceipt", [txid])) as EvmReceipt | null;
  if (!receipt || receipt.status === "0x0") {
    return { found: false, reason: "That transaction failed on chain and moved nothing." };
  }

  const tipHex = (await rpc(url, "eth_blockNumber", [])) as string;
  const confirmations = evmConfirmations(tipHex, tx.blockNumber);

  // A block timestamp is one more call and it is worth making: without it the
  // ledger would stamp the credit at the moment someone happened to paste a
  // hash rather than when the money actually moved.
  let at: number | null = null;
  try {
    const block = (await rpc(url, "eth_getBlockByNumber", [tx.blockNumber, false])) as {
      timestamp?: string;
    } | null;
    if (block?.timestamp) at = Number(BigInt(block.timestamp)) * 1000;
  } catch {
    /* a missing timestamp costs the stamp, never the verification */
  }

  const parsed =
    asset === "usdt"
      ? parseEvmToken(receipt, ours, confirmations, at)
      : parseEvmNative(tx, ours, confirmations, at);
  return { found: true, ...parsed };
}

/* ---------------------------------------------------------------- solana */

async function solana(txid: string, ours: string): Promise<Result> {
  const url = "https://api.mainnet-beta.solana.com";
  let tx: SolanaTx | null;
  try {
    tx = (await rpc(url, "getTransaction", [
      txid,
      { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
    ])) as SolanaTx | null;
  } catch {
    return { found: false, reason: "Could not reach the network. Try again in a moment." };
  }
  if (!tx) return { found: false, reason: "No transaction with that signature on Solana." };
  if (tx.meta?.err) {
    return { found: false, reason: "That transaction failed on chain and moved nothing." };
  }

  let finalized: number | null = null;
  if (typeof tx.slot === "number") {
    const slot = Number(await rpc(url, "getSlot", [{ commitment: "finalized" }]));
    if (Number.isFinite(slot)) finalized = slot;
  }

  return { found: true, ...parseSolana(tx, ours, finalized) };
}

/* --------------------------------------------------------------- handler */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  const rawAsset = String(req.query.asset ?? "").toLowerCase();
  const rawTxid = String(req.query.txid ?? "").trim();

  const meta = ASSETS.find((a) => a.id === rawAsset);
  if (!meta) {
    return res.status(400).json({ found: false, reason: "Unknown asset." });
  }
  // Shape first, always. Below this line the hash is safe to put in a URL.
  if (!TXID_SHAPE[meta.id].test(rawTxid)) {
    return res.status(400).json({
      found: false,
      reason: `That does not look like a ${meta.network} transaction hash.`,
    });
  }

  try {
    const result =
      meta.id === "btc"
        ? await bitcoin(rawTxid, meta.address)
        : meta.id === "sol"
          ? await solana(rawTxid, meta.address)
          : await evm(meta.id, rawTxid, meta.address);

    return res.status(200).json({ ...result, asset: meta.id, txid: rawTxid });
  } catch (err) {
    return res.status(200).json({
      found: false,
      reason: `Could not read the chain: ${err instanceof Error ? err.message : "unknown error"}`,
    });
  }
}
