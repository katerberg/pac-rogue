import fs from "node:fs";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import ports from "./scripts/ports.json";

const forAgent = process.env.PAC_ROGUE_AGENT === "1";
const AGENT_DEBUG_LOG = "/opt/cursor/logs/debug.log";

function agentDebugLogPlugin(): Plugin {
  return {
    name: "agent-debug-log",
    configureServer(server) {
      server.middlewares.use("/__agent_debug_log", (req, res, next) => {
        if (req.method !== "POST") {
          next();
          return;
        }
        const chunks: Buffer[] = [];
        req.on("data", (c) => chunks.push(Buffer.from(c)));
        req.on("end", () => {
          try {
            fs.appendFileSync(AGENT_DEBUG_LOG, Buffer.concat(chunks).toString("utf8"));
          } catch {
            /* ignore */
          }
          res.statusCode = 204;
          res.end();
        });
      });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: forAgent ? [agentDebugLogPlugin()] : [],
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
