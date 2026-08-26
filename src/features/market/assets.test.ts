import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ASSETS } from "./assets";

/**
 * The most damaging defect this product has had, kept from returning.
 *
 * Five real, valid, copyable addresses were printed under "Send to the address
 * below", and three of the five were the same well known documentation
 * example. There is no custody behind this build, so anyone who followed the
 * interface would have sent funds to an address nobody owns.
 *
 * Two tests guard it. One checks the runtime shape: with nothing configured,
 * every address is null and no surface has a string to print. The other reads
 * the source, because the failure was a literal in a file and a literal is
 * what has to be impossible to add back.
 */

// Read from the repository root rather than from `import.meta.url`: under the
// test environment that is not a file URL.
const SOURCE = readFileSync(resolve(process.cwd(), "src/features/market/assets.ts"), "utf8");

describe("no address exists unless one is configured", () => {
  it("every asset reports null in a build with no address set", () => {
    for (const asset of ASSETS) {
      expect(asset.address, `${asset.symbol} has an address`).toBeNull();
    }
  });

  it("holds no address literal in its source", () => {
    // A Bitcoin bech32 address, an EVM address, or a base58 string long enough
    // to be a Solana one. Matched against the file rather than the module, so
    // a literal cannot hide behind a constant.
    const patterns: [string, RegExp][] = [
      ["bitcoin", /["'`]bc1[a-z0-9]{20,}["'`]/i],
      ["evm", /["'`]0x[a-fA-F0-9]{40}["'`]/],
      ["solana", /["'`][1-9A-HJ-NP-Za-km-z]{32,44}["'`]/],
    ];
    for (const [chain, re] of patterns) {
      expect(SOURCE, `${chain} address literal found in assets.ts`).not.toMatch(re);
    }
  });

  it("reads each address from its own environment variable", () => {
    for (const asset of ASSETS) {
      const key = `VITE_ADDR_${asset.symbol.toUpperCase()}`;
      expect(SOURCE, `${asset.symbol} is not wired to ${key}`).toContain(key);
    }
  });
});

describe("the asset table itself", () => {
  it("carries the five funding assets, each with a distinct chain", () => {
    expect(ASSETS.map((a) => a.symbol).sort()).toEqual(["BNB", "BTC", "ETH", "SOL", "USDT"]);
    expect(new Set(ASSETS.map((a) => a.id)).size).toBe(ASSETS.length);
  });

  it("gives every asset a logo, a colour and a price precision", () => {
    for (const a of ASSETS) {
      expect(a.logo, a.symbol).toMatch(/^https:\/\//);
      expect(a.color, a.symbol).toMatch(/^#[0-9a-f]{6}$/i);
      expect(Number.isInteger(a.priceDecimals), a.symbol).toBe(true);
      expect(a.network.length, a.symbol).toBeGreaterThan(0);
    }
  });
});
