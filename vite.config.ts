import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from https://<user>.github.io/ethernet-onboarding/ on GitHub Pages,
// so the build needs that base path. Dev keeps serving from root.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/ethernet-onboarding/" : "/",
  plugins: [react()],
  server: { port: 5173, open: false },
}));
