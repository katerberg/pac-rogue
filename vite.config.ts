import { execSync } from "node:child_process";
import { readFile } from "node:fs/promises";
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

const redirectMazesRoute: Connect.NextHandleFunction = (req, res, next) => {
  const [path, query] = (req.url ?? "").split("?");
  if (path !== "/mazes") {
    next();
    return;
  }
  res.statusCode = 301;
  res.setHeader("Location", query === undefined ? "/mazes/" : `/mazes/?${query}`);
  res.end();
};

const LATEST_EXPORT = fileURLToPath(new URL("./data-exports/latest.json", import.meta.url));
const MAZE_CANDIDATES = fileURLToPath(
  new URL("./artifacts/mazes/candidates.json", import.meta.url),
);

const servePulledExport: Connect.NextHandleFunction = (req, res, next) => {
  if ((req.url ?? "").split("?")[0] !== "/data/export.json") {
    next();
    return;
  }
  readFile(LATEST_EXPORT)
    .then((body) => {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      res.end(body);
    })
    .catch(() => {
      res.statusCode = 204;
      res.end();
    });
};

const serveMazeCandidates: Connect.NextHandleFunction = (req, res, next) => {
  if ((req.url ?? "").split("?")[0] !== "/mazes/candidates.json") {
    next();
    return;
  }
  readFile(MAZE_CANDIDATES)
    .then((body) => {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      res.end(body);
    })
    .catch(() => {
      res.statusCode = 404;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Missing artifacts/mazes/candidates.json — run npm run maze:generate");
    });
};

const dataRoute: Plugin = {
  name: "data-route",
  configureServer: (server) => {
    server.middlewares.use(redirectDataRoute);
    server.middlewares.use(servePulledExport);
    server.middlewares.use(redirectMazesRoute);
    server.middlewares.use(serveMazeCandidates);
  },
  configurePreviewServer: (server) => {
    server.middlewares.use(redirectDataRoute);
    server.middlewares.use(redirectMazesRoute);
    server.middlewares.use(serveMazeCandidates);
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
        mazes: fileURLToPath(new URL("./mazes/index.html", import.meta.url)),
      },
      output: {
        manualChunks: {
          phaser: ["phaser"],
        },
      },
    },
  },
});
