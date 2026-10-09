import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { defineConfig, type Connect, type Plugin } from "vite";
import ports from "./scripts/ports.json";

function gitShortSha(): string {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

const redirectDataRoute: Connect.NextHandleFunction = (req, res, next) => {
  const [path, query] = (req.url ?? "").split("?");
  if (path !== "/data") {
    next();
    return;
  }
  res.statusCode = 301;
  res.setHeader("Location", query === undefined ? "/data/" : `/data/?${query}`);
  res.end();
};

const dataRoute: Plugin = {
  name: "data-route",
  configureServer: (server) => {
    server.middlewares.use(redirectDataRoute);
  },
  configurePreviewServer: (server) => {
    server.middlewares.use(redirectDataRoute);
  },
};

const forAgent = process.env.PAC_ROGUE_AGENT === "1";

export default defineConfig({
  base: "./",
  plugins: [dataRoute],
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
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        data: fileURLToPath(new URL("./data/index.html", import.meta.url)),
      },
      output: {
        manualChunks: {
          phaser: ["phaser"],
        },
      },
    },
  },
});
