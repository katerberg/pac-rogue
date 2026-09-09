import { defineConfig } from "vite";
import ports from "./scripts/ports.json";

const forAgent = process.env.PAC_ROGUE_AGENT === "1";

export default defineConfig({
  base: "./",
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
