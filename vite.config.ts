import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// SPA-friendly static build: single index.html entry; host must rewrite
// unknown paths to /index.html (see ../DEPLOY.md). No Origin in this tree.
export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
});
