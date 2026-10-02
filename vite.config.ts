import { execSync } from "node:child_process";
import { defineConfig } from "vite";
import ports from "./scripts/ports.json";

function gitShortSha(): string {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

const forAgent = process.env.PAC_ROGUE_AGENT === "1";

export default defineConfig({
  base: "./",
  define: {
    __GAME_VERSION__: JSON.stringify(gitShortSha()),
  },
  server: {
    host: "127.0.0.1",
    port: forAgent ? ports.agentDev : ports.humanDev,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: forAgent ? ports.agentPreview : ports.humanPreview,
    strictPort: true,
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ["phaser"],
        },
      },
    },
  },
});
