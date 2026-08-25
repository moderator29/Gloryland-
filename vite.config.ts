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
