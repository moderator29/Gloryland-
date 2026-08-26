import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

/**
 * Tests above the domain layer.
 *
 * `npm run check` covers `derive` with assertions and nothing covered a
 * component, a route or a flow. That gap is not theoretical: the standing
 * definition in Explain drifted out of agreement with the ledger within hours
 * of the ledger changing, and nothing noticed. Several of the tests here exist
 * specifically to make that class of drift impossible to ship again.
 *
 * Kept separate from `vite.config.ts` so the production build carries no test
 * configuration and no test dependency.
 */
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    restoreMocks: true,
    clearMocks: true,
  },
});
