import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { chromium } from "playwright";
import { chromiumLaunchOptions, ports, root, stopProcess, waitForServer } from "./lib/server.mjs";
const playArtifactPath = join(root, "artifacts", "visual-smoke.png");
const menuArtifactPath = join(root, "artifacts", "visual-smoke-menu.png");
const url = `http://127.0.0.1:${ports.agentPreview}/?maze=maze1`;

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const MENU_START_X = GAME_WIDTH / 2;
const MENU_START_Y = 280;

async function clickGamePoint(page, canvas, gameX, gameY) {
  const box = await canvas.boundingBox();
  if (box === null) {
    throw new Error("Canvas has no bounding box");
  }
  const x = box.x + (gameX / GAME_WIDTH) * box.width;
  const y = box.y + (gameY / GAME_HEIGHT) * box.height;
  await page.mouse.click(x, y);
}

async function waitForActiveScene(page, sceneKey, timeoutMs = 15_000) {
  await page.waitForFunction(
    (key) => {
      const game = globalThis.__PAC_ROGUE_GAME__;
      return game?.scene?.isActive(key) === true;
    },
    sceneKey,
    { timeout: timeoutMs },
  );
}

async function main() {
  mkdirSync(dirname(playArtifactPath), { recursive: true });

  const preview = spawn(
    "npx",
    ["vite", "preview", "--host", "127.0.0.1", "--port", String(ports.agentPreview)],
    {
      cwd: root,
      env: { ...process.env, PAC_ROGUE_AGENT: "1" },
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32",
    },
  );

  let previewLog = "";
  preview.stdout.on("data", (chunk) => {
    previewLog += chunk.toString();
  });
  preview.stderr.on("data", (chunk) => {
    previewLog += chunk.toString();
  });

  try {
    await waitForServer(url);

    const browser = await chromium.launch({ headless: true, ...chromiumLaunchOptions() });
    const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForSelector("canvas", { timeout: 15_000 });
    await waitForActiveScene(page, "MenuScene");

    const canvas = page.locator("canvas").first();
    await canvas.screenshot({ path: menuArtifactPath });

    await clickGamePoint(page, canvas, MENU_START_X, MENU_START_Y);
    await waitForActiveScene(page, "PlayScene");

    await canvas.screenshot({ path: playArtifactPath });
    await browser.close();

    console.log(`Visual smoke OK — menu: ${menuArtifactPath}`);
    console.log(`Visual smoke OK — play: ${playArtifactPath}`);
  } catch (error) {
    console.error("Visual smoke failed.");
    if (previewLog.trim()) {
      console.error("--- preview log ---");
      console.error(previewLog);
    }
    throw error;
  } finally {
    await stopProcess(preview);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    // Preview child stdio can keep the event loop alive after SIGTERM.
    setTimeout(() => process.exit(process.exitCode ?? 0), 100).unref();
  });
