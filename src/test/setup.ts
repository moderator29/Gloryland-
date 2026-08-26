import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

/**
 * A clean browser for every test.
 *
 * The product keeps everything in storage, so a test that leaves a member or a
 * ledger behind quietly changes the next one. Both stores are cleared between
 * tests rather than at the start of the run.
 */

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
});

// jsdom implements neither, and a component that calls one should not fail for
// a reason that has nothing to do with what is being tested.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// The audio graph is real in the product and absent here.
vi.mock("@/lib/sound", () => ({
  playTap: () => {},
  playTing: () => {},
  playTierChord: () => {},
  startAmbient: () => {},
  stopAmbient: () => {},
  isAmbientOn: () => false,
  isMuted: () => true,
  setMuted: () => {},
}));
