/**
 * A QR encoder, written here rather than installed.
 *
 * The lockfile is verified against a supply chain policy before the deploy
 * runner installs anything, and the version that passes today is the one
 * without extra entries. A dependency for this would put a deposit address,
 * the one string in the product where being wrong costs a member real money,
 * behind a package we do not read. So it is built in, and it is tested by
 * reading the matrix back out and by checking the parity mathematically.
 *
 * Scope is deliberately narrow: byte mode, error correction level M, versions
 * 1 through 6. That reaches 106 bytes, and the longest address the platform
 * shows is 44 characters. Stopping at 6 also means no version information
 * block, which the format only requires from version 7, and exactly one
 * alignment pattern.
 *
 * References are the encoding rules in ISO/IEC 18004: the block table in
 * clause 7.5, the placement order in 7.7, the mask penalties in 7.8.3 and the
 * format information BCH in 7.9.
 */

/** Error correction level M, the only one used here. Recovers about 15%. */
const ECC_M_BITS = 0b00;

/**
 * Per version: error correction codewords per block, then the block groups as
 * [count, data codewords each]. Level M only.
 */
const VERSIONS: { ec: number; groups: [number, number][] }[] = [
  { ec: 10, groups: [[1, 16]] }, // 1
  { ec: 16, groups: [[1, 28]] }, // 2
  { ec: 26, groups: [[1, 44]] }, // 3
  { ec: 18, groups: [[2, 32]] }, // 4
  { ec: 24, groups: [[2, 43]] }, // 5
  { ec: 16, groups: [[4, 27]] }, // 6
];

/** Centre of the single alignment pattern, by version. Version 1 has none. */
const ALIGN_CENTRE = [0, 0, 18, 22, 26, 30, 34];

const dataCapacity = (v: number) =>
  VERSIONS[v - 1].groups.reduce((n, [count, size]) => n + count * size, 0);

/* ---------------------------------------------------------------- GF(256) */

/**
 * Log and antilog tables over GF(256) with the primitive polynomial 0x11D,
 * which is the field the format specifies. Built once at module load.
 */
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
}

export function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

/** The generator polynomial of degree `degree`, coefficients high to low. */
function generator(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly;
}

/** The `ecLen` parity codewords for one block. */
export function remainder(data: Uint8Array, ecLen: number): Uint8Array {
  const gen = generator(ecLen);
  const out = new Uint8Array(ecLen);
  for (const byte of data) {
    const factor = byte ^ out[0];
    out.copyWithin(0, 1);
    out[ecLen - 1] = 0;
    if (factor !== 0) {
      for (let i = 0; i < ecLen; i++) out[i] ^= gfMul(gen[i + 1], factor);
    }
  }
  return out;
}

/* ------------------------------------------------------- format information */

/**
 * The 15 bit format string: two bits of error correction level, three of mask,
 * ten of BCH(15,5) parity, the whole thing masked with 0x5412 so an all zero
 * format never reads as valid.
 */
export function formatBits(mask: number): number {
  const data = (ECC_M_BITS << 3) | mask;
  let rem = data << 10;
  for (let i = 14; i >= 10; i--) {
    if (rem & (1 << i)) rem ^= 0x537 << (i - 10);
  }
  return ((data << 10) | rem) ^ 0x5412;
}

/* -------------------------------------------------------------- the matrix */

type Grid = { size: number; on: Uint8Array; fixed: Uint8Array };

const at = (g: Grid, r: number, c: number) => g.on[r * g.size + c] === 1;

function set(g: Grid, r: number, c: number, on: boolean, fixed = true) {
  g.on[r * g.size + c] = on ? 1 : 0;
  if (fixed) g.fixed[r * g.size + c] = 1;
}

function finder(g: Grid, top: number, left: number) {
  // The 7x7 eye, plus the one module separator around it. Coordinates outside
  // the grid are skipped, which is how the separator handles three edges.
  for (let r = -1; r <= 7; r++) {
    for (let c = -1; c <= 7; c++) {
      const y = top + r;
      const x = left + c;
      if (y < 0 || y >= g.size || x < 0 || x >= g.size) continue;
      const ring = r === 0 || r === 6 || c === 0 || c === 6;
      const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      const inside = r >= 0 && r <= 6 && c >= 0 && c <= 6;
      set(g, y, x, inside && (ring || core));
    }
  }
}

function functionPatterns(version: number): Grid {
  const size = 17 + 4 * version;
  const g: Grid = { size, on: new Uint8Array(size * size), fixed: new Uint8Array(size * size) };

  finder(g, 0, 0);
  finder(g, 0, size - 7);
  finder(g, size - 7, 0);

  // Timing, the alternating run that lets a reader recover the module pitch.
  for (let i = 8; i < size - 8; i++) {
    set(g, 6, i, i % 2 === 0);
    set(g, i, 6, i % 2 === 0);
  }

  // One alignment pattern from version 2 up. The other three centres in the
  // sequence sit under the finders, so they are not drawn.
  if (version >= 2) {
    const centre = ALIGN_CENTRE[version];
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const ring = Math.max(Math.abs(r), Math.abs(c));
        set(g, centre + r, centre + c, ring !== 1);
      }
    }
  }

  // The two format information areas, reserved now so data placement steps
  // over them.
  for (let i = 0; i < 9; i++) {
    if (i !== 6) set(g, 8, i, false);
    if (i !== 6) set(g, i, 8, false);
  }
  for (let i = 0; i < 8; i++) {
    set(g, 8, size - 1 - i, false);
    set(g, size - 1 - i, 8, false);
  }

  // The module that is always dark, written last because it sits at the top of
  // the lower format strip and the reservation above would otherwise clear it.
  set(g, size - 8, 8, true);

  return g;
}

/**
 * Both copies of the format information, for a chosen mask.
 *
 * The order matters and is easy to get backwards: the walk is most significant
 * bit first, so bit 14 lands at row 8 column 0 and bit 0 lands at row 0 column
 * 8. Writing it least significant bit first produces a symbol that is correct
 * everywhere except its own header, which most readers then reject outright.
 * The two copies exist so a reader that lost one corner can still find the
 * mask, which is why the second is split seven modules then eight: the module
 * between them is the one that is always dark.
 */
function writeFormat(g: Grid, mask: number) {
  const bits = formatBits(mask);
  const n = g.size;
  /** Most significant first: index 0 is bit 14. */
  const bit = (i: number) => ((bits >> (14 - i)) & 1) === 1;

  const copy1: [number, number][] = [
    [8, 0],
    [8, 1],
    [8, 2],
    [8, 3],
    [8, 4],
    [8, 5],
    [8, 7],
    [8, 8],
    [7, 8],
    [5, 8],
    [4, 8],
    [3, 8],
    [2, 8],
    [1, 8],
    [0, 8],
  ];
  const copy2: [number, number][] = [
    [n - 1, 8],
    [n - 2, 8],
    [n - 3, 8],
    [n - 4, 8],
    [n - 5, 8],
    [n - 6, 8],
    [n - 7, 8],
    [8, n - 8],
    [8, n - 7],
    [8, n - 6],
    [8, n - 5],
    [8, n - 4],
    [8, n - 3],
    [8, n - 2],
    [8, n - 1],
  ];

  copy1.forEach(([r, c], i) => set(g, r, c, bit(i)));
  copy2.forEach(([r, c], i) => set(g, r, c, bit(i)));
}

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
 * The placement walk: two module wide columns from the right edge leftwards,
 * alternating upward and downward, skipping the vertical timing column, and
 * skipping every module a function pattern already owns.
 */
function placeData(g: Grid, codewords: Uint8Array, mask: number) {
  const n = g.size;
  let bit = 0;
  const nextBit = () => {
    const byte = bit >> 3;
    const on = byte < codewords.length && ((codewords[byte] >> (7 - (bit & 7))) & 1) === 1;
    bit++;
    return on;
  };

  let upward = true;
  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // the timing column is never part of a pair
    for (let step = 0; step < n; step++) {
      const r = upward ? n - 1 - step : step;
      for (const c of [right, right - 1]) {
        if (g.fixed[r * n + c]) continue;
        const on = nextBit() !== MASKS[mask](r, c);
        set(g, r, c, on, false);
      }
    }
    upward = !upward;
  }
}

/** The four penalties in clause 7.8.3. Lower is a cleaner symbol to read. */
function penalty(g: Grid): number {
  const n = g.size;
  let score = 0;

  // Rule 1: runs of five or more of one colour, in both directions.
  for (let pass = 0; pass < 2; pass++) {
    for (let a = 0; a < n; a++) {
      let run = 1;
      let prev = pass === 0 ? at(g, a, 0) : at(g, 0, a);
      for (let b = 1; b < n; b++) {
        const cur = pass === 0 ? at(g, a, b) : at(g, b, a);
        if (cur === prev) run++;
        else {
          if (run >= 5) score += run - 2;
          run = 1;
          prev = cur;
        }
      }
      if (run >= 5) score += run - 2;
    }
  }

  // Rule 2: every 2x2 block of one colour.
  for (let r = 0; r < n - 1; r++) {
    for (let c = 0; c < n - 1; c++) {
      const v = at(g, r, c);
      if (v === at(g, r, c + 1) && v === at(g, r + 1, c) && v === at(g, r + 1, c + 1)) score += 3;
    }
  }

  // Rule 3: the finder like 1:1:3:1:1 run with four light modules on a side,
  // which is what would otherwise be mistaken for a finder pattern.
  const A = [true, false, true, true, true, false, true, false, false, false, false];
  const B = [false, false, false, false, true, false, true, true, true, false, true];
  const matches = (get: (i: number) => boolean, start: number, pat: boolean[]) => {
    for (let i = 0; i < pat.length; i++) if (get(start + i) !== pat[i]) return false;
    return true;
  };
  for (let a = 0; a < n; a++) {
    for (let b = 0; b + 11 <= n; b++) {
      const row = (i: number) => at(g, a, i);
      const col = (i: number) => at(g, i, a);
      if (matches(row, b, A) || matches(row, b, B)) score += 40;
      if (matches(col, b, A) || matches(col, b, B)) score += 40;
    }
  }

  // Rule 4: how far the dark proportion sits from half.
  let dark = 0;
  for (let i = 0; i < n * n; i++) if (g.on[i] === 1) dark++;
  const percent = (dark * 100) / (n * n);
  score += Math.floor(Math.abs(percent - 50) / 5) * 10;

  return score;
}

/* ---------------------------------------------------------------- encoding */

/** UTF-8 bytes, so a payload is not limited to ASCII by accident. */
function utf8(text: string): Uint8Array {
  const out: number[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0) as number;
    if (cp < 0x80) out.push(cp);
    else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 63));
    else if (cp < 0x10000) out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
    else
      out.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 63),
        0x80 | ((cp >> 6) & 63),
        0x80 | (cp & 63),
      );
  }
  return Uint8Array.from(out);
}

/** The smallest version that holds this payload, or null if none here does. */
export function versionFor(byteLength: number): number | null {
  // Four bits of mode and eight of character count, so two codewords of
  // header before any content.
  const needed = byteLength + 2;
  for (let v = 1; v <= VERSIONS.length; v++) if (dataCapacity(v) >= needed) return v;
  return null;
}

/** Mode, length, content, terminator, padding, as one run of codewords. */
export function encodeData(bytes: Uint8Array, version: number): Uint8Array {
  const capacity = dataCapacity(version);
  const out = new Uint8Array(capacity);
  let bit = 0;
  const push = (value: number, width: number) => {
    for (let i = width - 1; i >= 0; i--) {
      if ((value >> i) & 1) out[bit >> 3] |= 1 << (7 - (bit & 7));
      bit++;
    }
  };

  push(0b0100, 4); // byte mode
  push(bytes.length, 8); // character count, eight bits for versions 1 to 9
  for (const b of bytes) push(b, 8);

  const remainingBits = capacity * 8 - bit;
  push(0, Math.min(4, remainingBits)); // terminator
  if (bit % 8 !== 0) push(0, 8 - (bit % 8)); // to the byte boundary

  // The two pad codewords the format names, alternating to the end.
  for (let i = bit >> 3, alt = 0; i < capacity; i++, alt++) out[i] = alt % 2 === 0 ? 0xec : 0x11;

  return out;
}

/**
 * Split into blocks, add parity, then interleave both halves. Interleaving is
 * what makes a smudge across the symbol land as a few bytes in many blocks
 * rather than as a whole block lost.
 */
export function interleave(data: Uint8Array, version: number): Uint8Array {
  const { ec, groups } = VERSIONS[version - 1];
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];

  let offset = 0;
  for (const [count, size] of groups) {
    for (let i = 0; i < count; i++) {
      const block = data.subarray(offset, offset + size);
      offset += size;
      dataBlocks.push(block);
      ecBlocks.push(remainder(block, ec));
    }
  }

  const out: number[] = [];
  const widest = Math.max(...dataBlocks.map((b) => b.length));
  for (let i = 0; i < widest; i++) {
    for (const b of dataBlocks) if (i < b.length) out.push(b[i]);
  }
  for (let i = 0; i < ec; i++) {
    for (const b of ecBlocks) out.push(b[i]);
  }
  return Uint8Array.from(out);
}

export type QrMatrix = {
  /** Modules per side, not counting the quiet zone. */
  size: number;
  /** Row major, true where the module is dark. */
  modules: boolean[];
  version: number;
  mask: number;
};

/**
 * Encode `text` as a QR symbol.
 *
 * Returns null rather than throwing when the payload does not fit, so a caller
 * rendering an address it did not choose degrades to showing the text instead
 * of crashing the surface it sits on.
 */
export function encodeQr(text: string): QrMatrix | null {
  const bytes = utf8(text);
  const version = versionFor(bytes.length);
  if (version === null) return null;

  const codewords = interleave(encodeData(bytes, version), version);

  let best: Grid | null = null;
  let bestScore = Infinity;
  let bestMask = 0;
  for (let mask = 0; mask < 8; mask++) {
    const g = functionPatterns(version);
    placeData(g, codewords, mask);
    writeFormat(g, mask);
    const score = penalty(g);
    if (score < bestScore) {
      bestScore = score;
      best = g;
      bestMask = mask;
    }
  }

  const g = best as Grid;
  return {
    size: g.size,
    modules: Array.from(g.on, (v) => v === 1),
    version,
    mask: bestMask,
  };
}

/**
 * The symbol as one SVG path, dark modules only.
 *
 * One path rather than a rect per module: a version 6 symbol is 1,681 modules
 * and roughly half are dark, and eight hundred elements in the tree is a real
 * cost on a phone. Horizontal runs are merged into single rectangles in the
 * path, which cuts it further.
 */
export function qrPath(qr: QrMatrix): string {
  const parts: string[] = [];
  for (let r = 0; r < qr.size; r++) {
    let c = 0;
    while (c < qr.size) {
      if (!qr.modules[r * qr.size + c]) {
        c++;
        continue;
      }
      let end = c;
      while (end + 1 < qr.size && qr.modules[r * qr.size + end + 1]) end++;
      parts.push(`M${c} ${r}h${end - c + 1}v1h-${end - c + 1}z`);
      c = end + 1;
    }
  }
  return parts.join("");
}
