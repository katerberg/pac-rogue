import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ports = JSON.parse(readFileSync(join(root, "scripts", "ports.json"), "utf8"));
const artifactPath = join(root, "artifacts", "visual-smoke.png");
const url = `http://127.0.0.1:${ports.agentPreview}/`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // server not ready
    }
    await sleep(250);
  }
  throw new Error(`Timed out waiting for preview server at ${url}`);
}

async function stopPreview(preview) {
  if (preview.exitCode !== null || preview.signalCode !== null) {
    return;
  }

  const exited = new Promise((resolve) => {
    preview.once("exit", resolve);
  });

  preview.kill("SIGTERM");
  const timedOut = await Promise.race([exited.then(() => false), sleep(2_000).then(() => true)]);

  if (timedOut) {
    preview.kill("SIGKILL");
    await Promise.race([exited, sleep(1_000)]);
  }
}

async function main() {
  mkdirSync(dirname(artifactPath), { recursive: true });

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
    await waitForServer();

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForSelector("canvas", { timeout: 15_000 });
    // Give Phaser a moment to paint the player.
    await sleep(500);

    const canvas = page.locator("canvas").first();
    await canvas.screenshot({ path: artifactPath });
    await browser.close();

    console.log(`Visual smoke OK — screenshot written to ${artifactPath}`);
  } catch (error) {
    console.error("Visual smoke failed.");
    if (previewLog.trim()) {
      console.error("--- preview log ---");
      console.error(previewLog);
    }
    throw error;
  } finally {
    await stopPreview(preview);
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
