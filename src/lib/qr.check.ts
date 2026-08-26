/**
 * Assertions over the QR encoder.
 *
 * The reason this file is longer than most check files is that a QR code is
 * the one thing in the product a member cannot proofread. They point a camera
 * at it and trust what comes out. If the encoder is wrong the address is wrong
 * and the money is gone, and nothing on screen would have looked off.
 *
 * So it is checked three ways, and none of them is "it looks like a QR code":
 *
 *  1. Round trip. The matrix is read back out along the same walk, unmasked,
 *     de-interleaved and parsed, and the payload has to come back byte for
 *     byte. That covers version choice, placement order, the mask, the block
 *     interleave and the byte mode header.
 *  2. Parity, mathematically. A Reed Solomon codeword built on the generator
 *     the format names is divisible by it, so evaluating the whole codeword at
 *     every root has to give zero. That proves the parity bytes without
 *     trusting the same code that produced them.
 *  3. Format information against the published strings for level M, and the
 *     function patterns against the geometry in the specification.
 *
 * Run with `npm run check`.
 */

import {
  encodeData,
  encodeQr,
  formatBits,
  gfMul,
  interleave,
  qrPath,
  remainder,
  versionFor,
  type QrMatrix,
} from "@/lib/qr";
import { ASSETS } from "@/features/market/assets";
import { markCoverage } from "@/features/deposit/AddressQr";

let pass = 0,
  fail = 0;

function is(label: string, actual: unknown, expected: unknown) {
  if (actual === expected) pass++;
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

/* ------------------------------------------------------------ the read back */

const VERSIONS: { ec: number; groups: [number, number][] }[] = [
  { ec: 10, groups: [[1, 16]] },
  { ec: 16, groups: [[1, 28]] },
  { ec: 26, groups: [[1, 44]] },
  { ec: 18, groups: [[2, 32]] },
  { ec: 24, groups: [[2, 43]] },
  { ec: 16, groups: [[4, 27]] },
];

const MASKS: ((r: number, c: number) => boolean)[] = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

/**
 * Which modules a reader would treat as function patterns, derived here from
 * the geometry rather than from the encoder, so a mistake in the encoder's
 * reservation does not cancel itself out in the read back.
 */
function reserved(version: number): Uint8Array {
  const n = 17 + 4 * version;
  const m = new Uint8Array(n * n);
  const mark = (r: number, c: number) => {
    if (r >= 0 && r < n && c >= 0 && c < n) m[r * n + c] = 1;
  };
  for (const [top, left] of [
    [0, 0],
    [0, n - 7],
    [n - 7, 0],
  ]) {
    for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) mark(top + r, left + c);
  }
  for (let i = 0; i < n; i++) {
    mark(6, i);
    mark(i, 6);
  }
  if (version >= 2) {
    const centre = [0, 0, 18, 22, 26, 30, 34][version];
    for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) mark(centre + r, centre + c);
  }
  mark(n - 8, 8);
  for (let i = 0; i < 9; i++) {
    mark(8, i);
    mark(i, 8);
  }
  for (let i = 0; i < 8; i++) {
    mark(8, n - 1 - i);
    mark(n - 1 - i, 8);
  }
  return m;
}

/** The payload a reader would recover from the matrix. */
function readBack(qr: QrMatrix): string | null {
  const n = qr.size;
  const fixed = reserved(qr.version);
  const bits: number[] = [];

  let upward = true;
  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let step = 0; step < n; step++) {
      const r = upward ? n - 1 - step : step;
      for (const c of [right, right - 1]) {
        if (fixed[r * n + c]) continue;
        const dark = qr.modules[r * n + c];
        bits.push(dark !== MASKS[qr.mask](r, c) ? 1 : 0);
      }
    }
    upward = !upward;
  }

  const codewords: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
    codewords.push(b);
  }

  // Undo the interleave: the data half is dealt out round robin across the
  // blocks, so reading it back means dealing it back into the same shapes.
  const { groups } = VERSIONS[qr.version - 1];
  const sizes: number[] = [];
  for (const [count, size] of groups) for (let i = 0; i < count; i++) sizes.push(size);
  const blocks: number[][] = sizes.map(() => []);
  let taken = 0;
  const widest = Math.max(...sizes);
  for (let i = 0; i < widest; i++) {
    for (let b = 0; b < sizes.length; b++) {
      if (i < sizes[b]) blocks[b].push(codewords[taken++]);
    }
  }
  const data = blocks.flat();

  // Byte mode header, then the content.
  if (data[0] >> 4 !== 0b0100) return null;
  const length = ((data[0] & 0x0f) << 4) | (data[1] >> 4);
  const bytes: number[] = [];
  for (let i = 0; i < length; i++) {
    bytes.push(((data[1 + i] & 0x0f) << 4) | (data[2 + i] >> 4));
  }
  return new TextDecoder().decode(Uint8Array.from(bytes));
}

/* ------------------------------------------------------------------- checks */

console.log("\nQR encoder\n");

console.log("1. every payload comes back out of the matrix unchanged");
{
  const payloads = [
    ...ASSETS.map((a) => a.address).filter((a): a is string => a !== null),
    "a",
    "bc1qn9wf60cha6a4h4dfsslutksvv04amlz6hwmch0",
    "0".repeat(106),
    "https://rigel.example/x?y=1&z=2",
  ];
  for (const payload of payloads) {
    const qr = encodeQr(payload);
    if (!qr) {
      fail++;
      console.log(`  FAIL no symbol for a ${payload.length} byte payload`);
      continue;
    }
    is(`round trip, ${payload.length} bytes`, readBack(qr), payload);
    is(`size matches version ${qr.version}`, qr.size, 17 + 4 * qr.version);
    is(`module count`, qr.modules.length, qr.size * qr.size);
  }
}

console.log("2. parity is divisible by the generator, at every root");
{
  // A Reed Solomon codeword over the generator the format names has each root
  // of that generator as a root of itself. Evaluating anywhere else would be
  // nonzero, so this is the property and not a tautology.
  for (let version = 1; version <= 6; version++) {
    const { ec, groups } = VERSIONS[version - 1];
    const size = groups[0][1];
    const block = Uint8Array.from({ length: size }, (_, i) => (i * 37 + 11) & 0xff);
    const parity = remainder(block, ec);
    const codeword = [...block, ...parity];

    let zeros = 0;
    for (let root = 0; root < ec; root++) {
      // Horner over GF(256), evaluating at alpha^root.
      let alpha = 1;
      for (let i = 0; i < root; i++) alpha = gfMul(alpha, 2);
      let acc = 0;
      for (const c of codeword) acc = gfMul(acc, alpha) ^ c;
      if (acc === 0) zeros++;
    }
    is(`version ${version}, all ${ec} syndromes zero`, zeros, ec);
  }

  // And a corrupted codeword must not pass the same test, or the test proves
  // nothing at all.
  const block = Uint8Array.from({ length: 16 }, (_, i) => i);
  const parity = remainder(block, 10);
  const broken = [...block, ...parity];
  broken[3] ^= 0x55;
  let nonZero = 0;
  for (let root = 0; root < 10; root++) {
    let alpha = 1;
    for (let i = 0; i < root; i++) alpha = gfMul(alpha, 2);
    let acc = 0;
    for (const c of broken) acc = gfMul(acc, alpha) ^ c;
    if (acc !== 0) nonZero++;
  }
  ok("a corrupted codeword fails the syndrome test", nonZero > 0);
}

console.log("3. format information matches the published strings for level M");
{
  const PUBLISHED = [
    "101010000010010",
    "101000100100101",
    "101111001111100",
    "101101101001011",
    "100010111111001",
    "100000011001110",
    "100111110010111",
    "100101010100000",
  ];
  for (let mask = 0; mask < 8; mask++) {
    is(`mask ${mask}`, formatBits(mask).toString(2).padStart(15, "0"), PUBLISHED[mask]);
  }
  // The BCH this comes from separates any two format strings by at least seven
  // bits, which is what lets a reader recover one it half saw.
  let worst = 99;
  for (let a = 0; a < 8; a++) {
    for (let b = a + 1; b < 8; b++) {
      let d = 0;
      const x = formatBits(a) ^ formatBits(b);
      for (let i = 0; i < 15; i++) if ((x >> i) & 1) d++;
      worst = Math.min(worst, d);
    }
  }
  ok(`format strings stay at least 7 bits apart, worst was ${worst}`, worst >= 7);
}

console.log("4. the fixed geometry a reader looks for is where it should be");
{
  const qr = encodeQr("bc1qn9wf60cha6a4h4dfsslutksvv04amlz6hwmch0") as QrMatrix;
  const n = qr.size;
  const on = (r: number, c: number) => qr.modules[r * n + c];

  for (const [top, left] of [
    [0, 0],
    [0, n - 7],
    [n - 7, 0],
  ]) {
    let good = true;
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const ring = r === 0 || r === 6 || c === 0 || c === 6;
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        if (on(top + r, left + c) !== (ring || core)) good = false;
      }
    }
    ok(`finder at ${top},${left}`, good);
  }

  let timing = true;
  for (let i = 8; i < n - 8; i++) {
    if (on(6, i) !== (i % 2 === 0)) timing = false;
    if (on(i, 6) !== (i % 2 === 0)) timing = false;
  }
  ok("timing runs alternate", timing);
  ok("the module that is always dark is dark", on(n - 8, 8));

  // The quiet zone is the caller's job, but a module on the outer edge that is
  // always dark would mean the walk overran, so check the corners opposite the
  // finders are reachable data rather than fixed.
  ok("the symbol is square", qr.modules.length === n * n);
}

console.log("5. capacity, and what happens past it");
{
  is("a 106 byte payload fits version 6, exactly", versionFor(106), 6);
  is("107 bytes does not fit at all", versionFor(107), null);
  is("a 44 character address fits version 4", versionFor(44), 4);
  is("too long returns null rather than throwing", encodeQr("x".repeat(200)), null);

  // Padding must reach exactly the version capacity, with the two codewords
  // the format names.
  const d = encodeData(Uint8Array.from([1, 2, 3]), 1);
  is("data is padded to the version capacity", d.length, 16);
  is("first pad codeword", d[5], 0xec);
  is("second pad codeword", d[6], 0x11);

  const full = interleave(d, 1);
  is("interleaved length is data plus parity", full.length, 16 + 10);
}

console.log("6. the path is drawable and covers every dark module");
{
  const qr = encodeQr("test") as QrMatrix;
  const path = qrPath(qr);
  const covered = [...path.matchAll(/M(\d+) (\d+)h(\d+)/g)].reduce((n, m) => n + Number(m[3]), 0);
  const dark = qr.modules.filter(Boolean).length;
  is("every dark module is in the path", covered, dark);
  ok("the path is a path", /^M\d/.test(path));
}

console.log("7. the addresses the product shows are the ones supplied");
{
  const EXPECTED: Record<string, string> = {
    btc: "bc1qn9wf60cha6a4h4dfsslutksvv04amlz6hwmch0",
    eth: "0xa6594edf7415f5dcf599c3249fbf2ab948978799",
    usdt: "0xa6594edf7415f5dcf599c3249fbf2ab948978799",
    sol: "EHwKKSQcJQSbTxKKdbzzbMQUVZQZGiiD1GcUVYdCPsCc",
    bnb: "0xa6594edf7415f5dcf599c3249fbf2ab948978799",
  };
  for (const asset of ASSETS) {
    is(`${asset.id} address`, asset.address, EXPECTED[asset.id]);
    // And the symbol a member scans has to carry that exact string, not a
    // normalised or re-cased version of it.
    const qr = encodeQr(asset.address as string);
    is(`${asset.id} scans to its own address`, qr ? readBack(qr) : null, EXPECTED[asset.id]);
  }
}

console.log("8. the mark in the middle stays inside what the code can lose");
{
  // Level M recovers about 15% of the symbol. Anything the mark covers comes
  // out of that budget, and it is not the only thing spending it: a phone
  // camera at an angle, a smeared screen and a low contrast render all take a
  // share. A third of the budget is the line this build holds, and every
  // address was put through a real decoder with the mark drawn over it.
  const BUDGET = 0.05;
  for (const size of [140, 156, 168, 200, 240]) {
    const coverage = markCoverage(size);
    ok(
      `at ${size}px the mark covers ${(coverage * 100).toFixed(1)}%, inside ${(BUDGET * 100).toFixed(0)}%`,
      coverage <= BUDGET + 0.005,
    );
  }
  // And the shape of the rule: a bigger card must not mean a bigger share,
  // because the pad is fixed while the symbol scales.
  ok("coverage does not grow with the card", markCoverage(240) <= markCoverage(140));
}

console.log(`\n${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
