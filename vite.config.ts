import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";

function buildSha(): string {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return process.env.COMMIT_REF?.slice(0, 7) ?? "unknown";
  }
}
const QB_BUILD = buildSha();

// SPA-friendly static build: single index.html entry; host must rewrite
// unknown paths to /index.html (see ../DEPLOY.md). No Origin in this tree.
export default defineConfig({
  plugins: [
    react(),
    {
      name: "qb-build-sha",
      transformIndexHtml(html) {
        return html.replace("</head>", `    <meta name="qb-build" content="${QB_BUILD}" />\n  </head>`);
      },
    },
  ],
  define: {
    __QB_BUILD__: JSON.stringify(QB_BUILD),
  },
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
