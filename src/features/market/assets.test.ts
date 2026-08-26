import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { ASSETS } from "./assets";

/**
 * The addresses, pinned.
 *
 * This file used to assert the opposite of what it asserts now, and the
 * history matters. Five real, valid, copyable addresses were printed under
 * "Send to the address below" while there was no wallet behind the product,
 * and three of the five were the same well known documentation example, so
 * anyone who followed the interface would have sent funds to an address nobody
 * owned. The fix at the time was to make an address literal impossible: read
 * them from the environment, and fail if one appeared in the source.
 *
 * There is a wallet now, and these five addresses are it. So the invariant
 * flips rather than disappearing, and it gets stricter: the addresses must be
 * exactly these values, they must live in exactly one file, and every other
 * file in the tree must be free of anything that looks like one. A second copy
 * is a second place a member could be sent, and a stale second copy is the
 * original defect wearing different clothes.
 *
 * `src/lib/qr.check.ts` asserts the same values from the other direction: that
 * the scannable code decodes back to the exact string printed beside it.
 */

const ROOT = process.cwd();

/** The addresses as the founder supplied them. Changing these is a decision. */
const SUPPLIED: Record<string, string> = {
  BTC: "bc1qn9wf60cha6a4h4dfsslutksvv04amlz6hwmch0",
  ETH: "0xa6594edf7415f5dcf599c3249fbf2ab948978799",
  USDT: "0xa6594edf7415f5dcf599c3249fbf2ab948978799",
  SOL: "EHwKKSQcJQSbTxKKdbzzbMQUVZQZGiiD1GcUVYdCPsCc",
  BNB: "0xa6594edf7415f5dcf599c3249fbf2ab948978799",
};

/** Every source file in the tree, so "one place" can actually be checked. */
function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sources(path, out);
    else if (/\.(ts|tsx|css|html|md)$/.test(name)) out.push(path);
  }
  return out;
}

describe("the addresses are the ones supplied", () => {
  it("matches every one, character for character", () => {
    for (const asset of ASSETS) {
      expect(asset.address, `${asset.symbol} address changed`).toBe(SUPPLIED[asset.symbol]);
    }
  });

  it("gives each one the shape its chain actually uses", () => {
    const shapes: Record<string, RegExp> = {
      BTC: /^bc1[02-9ac-hj-np-z]{39,59}$/,
      ETH: /^0x[a-fA-F0-9]{40}$/,
      USDT: /^0x[a-fA-F0-9]{40}$/,
      SOL: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
      BNB: /^0x[a-fA-F0-9]{40}$/,
    };
    for (const asset of ASSETS) {
      expect(asset.address, `${asset.symbol} is not a valid ${asset.network} address`).toMatch(
        shapes[asset.symbol],
      );
    }
  });

  /**
   * Three of the five are the same key, which is correct: ETH, USDT on ERC-20
   * and BNB on BEP-20 are all EVM chains. This pins that it is deliberate, so
   * a future edit that makes them differ has to mean it.
   */
  it("shares one EVM key across the three EVM chains, on purpose", () => {
    const evm = ASSETS.filter((a) => ["ETH", "USDT", "BNB"].includes(a.symbol));
    expect(new Set(evm.map((a) => a.address)).size).toBe(1);
    // And the two non EVM chains are their own, or funds go nowhere.
    const btc = ASSETS.find((a) => a.symbol === "BTC")!.address;
    const sol = ASSETS.find((a) => a.symbol === "SOL")!.address;
    expect(btc).not.toBe(sol);
    expect(btc).not.toBe(evm[0].address);
    expect(sol).not.toBe(evm[0].address);
  });
});

describe("they exist in exactly one place", () => {
  it("appears nowhere in the tree except its own file and its own checks", () => {
    const allowed = new Set([
      "src/features/market/assets.ts",
      "src/features/market/assets.test.ts",
      "src/lib/qr.check.ts",
    ]);
    const values = [...new Set(Object.values(SUPPLIED))];
    const offenders: string[] = [];

    for (const dir of ["src", "api"]) {
      for (const path of sources(resolve(ROOT, dir))) {
        const rel = relative(ROOT, path).replace(/\\/g, "/");
        if (allowed.has(rel)) continue;
        const text = readFileSync(path, "utf8");
        for (const value of values) {
          if (text.includes(value)) offenders.push(`${rel} contains ${value.slice(0, 12)}...`);
        }
      }
    }

    expect(offenders, "a deposit address was copied out of assets.ts").toEqual([]);
  });
});

describe("the asset table itself", () => {
  it("carries the five funding assets, each with a distinct chain", () => {
    expect(ASSETS.map((a) => a.symbol).sort()).toEqual(["BNB", "BTC", "ETH", "SOL", "USDT"]);
    expect(new Set(ASSETS.map((a) => a.id)).size).toBe(ASSETS.length);
  });

  /**
   * Logos are bundled, not fetched. A remote URL here is what produced the
   * flash of a fallback monogram every time the Desk opened, and it is also a
   * third party learning which asset a member looked at.
   */
  it("bundles every logo rather than pointing at a host", () => {
    for (const a of ASSETS) {
      expect(a.logo, `${a.symbol} logo is remote`).not.toMatch(/^https?:\/\//);
      expect(a.logo, `${a.symbol} logo is missing`).toMatch(/\.(webp|png|svg)$|^data:/);
      expect(a.color, a.symbol).toMatch(/^#[0-9a-f]{6}$/i);
      expect(Number.isInteger(a.priceDecimals), a.symbol).toBe(true);
      expect(a.network.length, a.symbol).toBeGreaterThan(0);
    }
  });

  it("names the chain on every entry, because sending on the wrong one loses funds", () => {
    for (const a of ASSETS) {
      expect(a.network, a.symbol).toBeTruthy();
      expect(a.short, a.symbol).toBeTruthy();
    }
    // The three sharing a key must not share a network label, or the label is
    // not doing the one job it exists for.
    const evm = ASSETS.filter((a) => ["ETH", "USDT", "BNB"].includes(a.symbol));
    expect(new Set(evm.map((a) => a.network)).size).toBe(evm.length);
  });
});
