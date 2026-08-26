import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    /**
     * The five coin marks are inlined as data URIs no matter their size.
     *
     * They used to be fetched from a CDN at render time, which is what caused
     * the flash of a fallback monogram every time the Desk opened: the logo
     * arrived a few hundred milliseconds after the tile it sits in. Inlining
     * them removes the request, the flash, and a third party that learned
     * which assets a member was looking at. Everything else keeps Vite's
     * default threshold.
     */
    assetsInlineLimit: (filePath: string) =>
      filePath.includes("assets/coins/") ? true : undefined,
    rollupOptions: {
      output: {
        // Keep the heavyweights out of the main bundle so first paint on
        // mobile only pays for what the route actually uses.
        manualChunks: {
          motion: ["framer-motion"],
          charts: ["recharts"],
        },
      },
    },
  },
});
