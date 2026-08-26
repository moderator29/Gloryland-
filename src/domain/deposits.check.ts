/**
 * Assertions over the chain watcher.
 *
 * The endpoints are unreachable from the build environment, so nothing here
 * makes a network call and this file does not pretend to prove that the live
 * hosts answer in the shape below. What it does prove is everything that can
 * be wrong once they have answered, which is where the defects in code like
 * this actually are: a base unit, a decimal place, which log is the one that
 * matters, an off by one in a confirmation count, and an address comparison
 * that lets a transfer to somebody else through.
 *
 * The fixtures are the documented response shapes: Blockstream's Esplora API
 * for Bitcoin, plain JSON RPC for the two EVM chains, and `getTransaction` on
 * Solana. Every figure in them was chosen so that a wrong answer is obviously
 * wrong rather than plausibly wrong.
 *
 * Run with `npm run check`.
 */

import {
  evmConfirmations,
  hexToBig,
  parseBitcoin,
  parseEvmNative,
  parseEvmToken,
  parseSolana,
  scale,
  topicToAddress,
  TRANSFER_TOPIC,
  USDT_CONTRACT,
} from "@/domain/chainParse";
import {
  CONFIRMATIONS,
  creditFor,
  explorerUrl,
  findClaim,
  judge,
  validTxid,
  type Transfer,
} from "@/domain/deposits";
import { ASSETS } from "@/features/market/assets";
import type { LedgerEvent } from "@/domain/ledger";

let pass = 0,
  fail = 0;
const near = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) <= tol;
function is(label: string, actual: unknown, expected: unknown) {
  const ok =
    typeof actual === "number" && typeof expected === "number"
      ? near(actual, expected)
      : actual === expected;
  if (ok) pass++;
  else {
    fail++;
    console.log(`  FAIL ${label}: got ${String(actual)}, want ${String(expected)}`);
  }
}
function ok(label: string, condition: boolean) {
  if (condition) pass++;
  else {
    fail++;
    console.log(`  FAIL ${label}`);
  }
}

const BTC = ASSETS.find((a) => a.id === "btc")!.address;
const EVM = ASSETS.find((a) => a.id === "eth")!.address;
const SOL = ASSETS.find((a) => a.id === "sol")!.address;
const ELSEWHERE_EVM = "0x1111111111111111111111111111111111111111";

console.log("\nChain watcher\n");

console.log("1. Bitcoin, in satoshis");
{
  const tx = {
    vout: [
      { scriptpubkey_address: "bc1qsomeoneelse00000000000000000000000000", value: 4_500_000 },
      { scriptpubkey_address: BTC, value: 12_500_000 },
    ],
    status: { confirmed: true, block_height: 900_000, block_time: 1_780_000_000 },
  };
  const p = parseBitcoin(tx, BTC, 900_003);
  is("pays us, and only our output counts", p.amount, 0.125);
  is("to is our address", p.to, BTC);
  // In the tip block is one confirmation, not zero. Four blocks up is four.
  is("confirmations count the block it is in", p.confirmations, 4);
  is("the timestamp is milliseconds", p.at, 1_780_000_000_000);

  const sameAddressTwice = parseBitcoin(
    {
      vout: [
        { scriptpubkey_address: BTC, value: 1_000 },
        { scriptpubkey_address: BTC, value: 2_000 },
      ],
      status: { confirmed: true, block_height: 10, block_time: 1 },
    },
    BTC,
    10,
  );
  is("two outputs to us are summed", sameAddressTwice.amount, 3_000 / 1e8);
  is("in the tip block reads one confirmation", sameAddressTwice.confirmations, 1);

  const unconfirmed = parseBitcoin(
    { vout: [{ scriptpubkey_address: BTC, value: 500 }] },
    BTC,
    900_000,
  );
  is("no block means no confirmations", unconfirmed.confirmations, 0);
  is("but the amount is still read", unconfirmed.amount, 500 / 1e8);

  const other = parseBitcoin(
    {
      vout: [{ scriptpubkey_address: "bc1qnotours0000000000000000000000000000000", value: 9_000 }],
      status: { confirmed: true, block_height: 5, block_time: 1 },
    },
    BTC,
    5,
  );
  is("a transfer to somebody else credits nothing", other.amount, 0);
  ok("and reports where it did go", other.to.startsWith("bc1qnotours"));
}

console.log("2. Ethereum and BNB, native, in wei");
{
  // 2.5 ETH. Eighteen decimals is the place this goes wrong, so the figure is
  // chosen to be visibly wrong at any other scale.
  const tx = { to: EVM, value: "0x22b1c8c1227a0000", blockNumber: "0x100" };
  const p = parseEvmNative(tx, EVM, 12, null);
  is("wei scales by eighteen decimals", p.amount, 2.5);
  is("to is our address", p.to, EVM);

  // EVM chains hand back checksummed mixed case, and a member's wallet may
  // show either. Comparing case sensitively would refuse a real transfer.
  const mixed = parseEvmNative(
    { to: EVM.toUpperCase().replace("0X", "0x"), value: "0xde0b6b3a7640000", blockNumber: "0x1" },
    EVM,
    1,
    null,
  );
  is("a checksummed address still matches", mixed.amount, 1);

  const elsewhere = parseEvmNative(
    { to: ELSEWHERE_EVM, value: "0xde0b6b3a7640000", blockNumber: "0x1" },
    EVM,
    1,
    null,
  );
  is("a transfer to another address credits nothing", elsewhere.amount, 0);
  is("and reports that address", elsewhere.to, ELSEWHERE_EVM);

  is("a tip equal to the mined block is one confirmation", evmConfirmations("0x100", "0x100"), 1);
  is("twelve blocks later is thirteen", evmConfirmations("0x10c", "0x100"), 13);
  is("no block number is no confirmations", evmConfirmations("0x100", null), 0);
  is("a tip behind the block does not go negative", evmConfirmations("0x1", "0x100"), 0);
}

console.log("3. USDT, which is a log and not a value");
{
  const padded = (a: string) => `0x${"0".repeat(24)}${a.slice(2).toLowerCase()}`;
  // 1,250.50 USDT at six decimals. At eighteen this would read as dust, and at
  // eight it would read as twelve million, so a wrong scale cannot pass.
  const receipt = {
    status: "0x1",
    logs: [
      // An unrelated token's Transfer to us, which must be ignored: the
      // contract is what decides whether a log is USDT.
      {
        address: "0x0000000000000000000000000000000000000bad",
        topics: [TRANSFER_TOPIC, padded(ELSEWHERE_EVM), padded(EVM)],
        data: "0x3b9aca00",
      },
      // A USDT Transfer to somebody else, which must also be ignored.
      {
        address: USDT_CONTRACT,
        topics: [TRANSFER_TOPIC, padded(EVM), padded(ELSEWHERE_EVM)],
        data: "0x3b9aca00",
      },
      // Ours.
      {
        address: USDT_CONTRACT,
        topics: [TRANSFER_TOPIC, padded(ELSEWHERE_EVM), padded(EVM)],
        data: "0x4a891da0",
      },
    ],
  };
  const p = parseEvmToken(receipt, EVM, 12, null);
  is("six decimals, not eighteen", p.amount, 1250.5);
  is("to is our address", p.to, EVM);

  const twoLogs = parseEvmToken(
    {
      status: "0x1",
      logs: [
        {
          address: USDT_CONTRACT,
          topics: [TRANSFER_TOPIC, padded(ELSEWHERE_EVM), padded(EVM)],
          data: "0xf4240",
        },
        {
          address: USDT_CONTRACT,
          topics: [TRANSFER_TOPIC, padded(ELSEWHERE_EVM), padded(EVM)],
          data: "0xf4240",
        },
      ],
    },
    EVM,
    1,
    null,
  );
  is("a batched send sums its logs", twoLogs.amount, 2);

  const none = parseEvmToken(
    {
      status: "0x1",
      logs: [
        {
          address: USDT_CONTRACT,
          topics: [TRANSFER_TOPIC, padded(EVM), padded(ELSEWHERE_EVM)],
          data: "0xf4240",
        },
      ],
    },
    EVM,
    1,
    null,
  );
  is("a USDT transfer to someone else credits nothing", none.amount, 0);
  is("and reports the address it paid", none.to.toLowerCase(), ELSEWHERE_EVM.toLowerCase());

  // The trap this parser exists to avoid: on a token transfer the
  // transaction's own `to` is the contract and its `value` is zero, so reading
  // the native fields would report nothing on every real USDT deposit.
  const asNative = parseEvmNative(
    { to: USDT_CONTRACT, value: "0x0", blockNumber: "0x1" },
    EVM,
    1,
    null,
  );
  is("reading a token transfer as native would credit zero", asNative.amount, 0);
  ok("which is why the token path exists", p.amount > 0 && asNative.amount === 0);

  is("a topic unpacks to an address", topicToAddress(padded(EVM)).toLowerCase(), EVM.toLowerCase());
  is("an empty hex is zero", hexToBig("0x"), 0n);
  is("scaling is by powers of ten", scale(1_000_000n, 6), 1);
}

console.log("4. Solana, in lamports, from the balance change");
{
  const tx = {
    slot: 300_000_000,
    blockTime: 1_780_000_000,
    meta: {
      preBalances: [5_000_000_000, 1_000_000_000],
      postBalances: [3_000_000_000, 3_500_000_000],
    },
    transaction: { message: { accountKeys: ["SenderKey1111111111111111111111111111111111", SOL] } },
  };
  const p = parseSolana(tx, SOL, 300_000_040);
  is("the balance change is the amount, at nine decimals", p.amount, 2.5);
  is("to is our address", p.to, SOL);
  is("confirmations are slots past finality", p.confirmations, 40);
  is("the timestamp is milliseconds", p.at, 1_780_000_000_000);

  // jsonParsed can hand back objects rather than strings for account keys.
  const objectKeys = parseSolana(
    {
      slot: 1,
      meta: { preBalances: [0, 0], postBalances: [0, 1_000_000_000] },
      transaction: { message: { accountKeys: [{ pubkey: "other" }, { pubkey: SOL }] } },
    },
    SOL,
    1,
  );
  is("account keys as objects are read too", objectKeys.amount, 1);

  const notInvolved = parseSolana(
    {
      slot: 1,
      meta: { preBalances: [1], postBalances: [1] },
      transaction: { message: { accountKeys: ["someoneelse"] } },
    },
    SOL,
    1,
  );
  is("a transaction we are not in credits nothing", notInvolved.amount, 0);

  // A transaction where our balance went down is not a deposit, and must never
  // read as one through an absolute value.
  const outgoing = parseSolana(
    {
      slot: 1,
      meta: { preBalances: [0, 5_000_000_000], postBalances: [0, 1_000_000_000] },
      transaction: { message: { accountKeys: ["other", SOL] } },
    },
    SOL,
    1,
  );
  is("a balance that fell credits nothing", outgoing.amount, 0);
}

console.log("5. the rules that decide whether money is credited");
{
  const transfer = (over: Partial<Transfer> = {}): Transfer => ({
    asset: "btc",
    txid: "a".repeat(64),
    to: BTC,
    amount: 0.1,
    confirmations: 99,
    at: null,
    ...over,
  });

  is("nothing found is missing", judge(null, BTC, []).state, "missing");
  is("enough confirmations verifies", judge(transfer(), BTC, []).state, "verified");
  is("too few is pending", judge(transfer({ confirmations: 1 }), BTC, []).state, "pending");
  const pending = judge(transfer({ confirmations: 0 }), BTC, []);
  is(
    "and says how many are left",
    pending.state === "pending" ? pending.needs : -1,
    CONFIRMATIONS.btc,
  );

  is(
    "a transfer to another address is elsewhere, however deep",
    judge(transfer({ to: "bc1qnotours" }), BTC, []).state,
    "elsewhere",
  );

  // The rule that stops money being invented. A hash already in the log is a
  // transfer that has already been credited.
  const claimed: LedgerEvent[] = [
    {
      id: "d-1",
      kind: "deposit",
      at: 1234,
      amount: 100,
      asset: "BTC",
      network: "Bitcoin",
      txid: "A".repeat(64),
      units: 0.1,
      unitPrice: 1000,
    },
  ];
  is("a hash already in the log is refused", judge(transfer(), BTC, claimed).state, "claimed");
  is("case does not dodge that", findClaim(claimed, "a".repeat(64)), 1234);
  is("an unrelated hash is not a claim", findClaim(claimed, "b".repeat(64)), null);

  // Elsewhere is checked before claimed, and both before confirmations: a
  // member sending to the wrong address must be told that, not told to wait.
  is(
    "wrong address wins over too few confirmations",
    judge(transfer({ to: "bc1qnotours", confirmations: 0 }), BTC, []).state,
    "elsewhere",
  );
}

console.log("6. what a transfer is worth, and the shapes accepted");
{
  is("units times price, to the cent", creditFor(0.125, 96_000), 12_000);
  is("rounded and not truncated", creditFor(1 / 3, 1), 0.33);
  is("a zero price credits nothing", creditFor(1, 0), 0);
  is("a negative amount credits nothing", creditFor(-1, 100), 0);
  is("a NaN credits nothing", creditFor(Number.NaN, 100), 0);

  ok("a 64 hex Bitcoin hash is accepted", validTxid("btc", "f".repeat(64)));
  ok("with 0x it is not a Bitcoin hash", !validTxid("btc", `0x${"f".repeat(64)}`));
  ok("an EVM hash needs 0x", validTxid("eth", `0x${"f".repeat(64)}`));
  ok("and is refused without it", !validTxid("eth", "f".repeat(64)));
  ok("a Solana signature is base58", validTxid("sol", "5".repeat(80)));
  ok("and refuses base58's excluded characters", !validTxid("sol", `0${"5".repeat(79)}`));
  ok("a path traversal never looks like a hash", !validTxid("btc", "../../etc/passwd"));
  ok("nor does a query string", !validTxid("eth", `0x${"f".repeat(64)}?x=1`));

  ok(
    "every asset has a confirmation floor",
    ASSETS.every((a) => CONFIRMATIONS[a.id] > 0),
  );
  ok("USDT inherits Ethereum's", CONFIRMATIONS.usdt === CONFIRMATIONS.eth);
  ok(
    "every explorer link carries the hash",
    ASSETS.every((a) => explorerUrl(a.id, "abc").endsWith("abc")),
  );
}

console.log(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
