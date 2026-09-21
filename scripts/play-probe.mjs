import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ports = JSON.parse(readFileSync(join(root, "scripts", "ports.json"), "utf8"));
const outDir = join(root, "artifacts");

const USAGE = `Usage: node scripts/play-probe.mjs --query "<url query>" --steps "<steps>" [--name <prefix>]

Drives the game on the agent dev port (${ports.agentDev}) with real keyboard input and
saves canvas screenshots under artifacts/. Fails on page errors or console errors.

Steps (comma-separated):
  wait:<ms>              sleep
  hold:<Key>:<ms>        keydown, wait, keyup (Playwright key names, e.g. ArrowLeft)
  press:<Key>            tap a key
  shot:<label>           screenshot to artifacts/<name>-<label>.png
  scene:<SceneKey>       fail unless that scene is active (MenuScene, PlayScene, ...)

Example:
  node scripts/play-probe.mjs --query "play=1&maze=mazeSmall" \\
    --steps "wait:500,shot:start,hold:ArrowLeft:1500,shot:moved,scene:PlayScene" --name left`;

function parseArgs(argv) {
  const args = { query: "play=1", steps: "shot:boot", name: "probe" };
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, "");
    const value = argv[i + 1];
    if (!(key in args) || value === undefined) {
      console.error(USAGE);
      process.exit(2);
    }
    args[key] = value;
  }
  return args;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isUp(url) {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
}

async function waitForServer(url, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isUp(url)) {
      return;
    }
    await sleep(250);
  }
  throw new Error(`Timed out waiting for dev server at ${url}`);
}

async function runStep(page, canvas, step, name) {
  const [kind, a, b] = step.split(":");
  switch (kind) {
    case "wait":
      await sleep(Number(a));
      break;
    case "hold":
      await page.keyboard.down(a);
      await sleep(Number(b));
      await page.keyboard.up(a);
      break;
    case "press":
      await page.keyboard.press(a);
      break;
    case "shot": {
      const path = join(outDir, `${name}-${a}.png`);
      await canvas.screenshot({ path });
      console.log(`shot ${path}`);
      break;
    }
    case "scene": {
      const active = await page.evaluate(
        (key) => globalThis.__PAC_ROGUE_GAME__?.scene?.isActive(key) === true,
        a,
      );
      if (!active) {
        throw new Error(`Scene ${a} is not active`);
      }
      console.log(`scene ${a} active`);
      break;
    }
    default:
      throw new Error(`Unknown step: ${step}`);
  }
}

async function main() {
  const { query, steps, name } = parseArgs(process.argv.slice(2));
  const baseUrl = `http://127.0.0.1:${ports.agentDev}/`;
  mkdirSync(outDir, { recursive: true });

  let dev = null;
  if (!(await isUp(baseUrl))) {
    dev = spawn("npx", ["vite"], {
      cwd: root,
      env: { ...process.env, PAC_ROGUE_AGENT: "1" },
      stdio: "ignore",
    });
  }

  const problems = [];
  try {
    await waitForServer(baseUrl);
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
    page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") {
        problems.push(`console.error: ${message.text()}`);
      }
    });

    await page.goto(`${baseUrl}?${query}`, { waitUntil: "networkidle" });
    await page.waitForSelector("canvas", { timeout: 15_000 });
    const canvas = page.locator("canvas").first();

    for (const step of steps.split(",")) {
      await runStep(page, canvas, step.trim(), name);
    }
    await browser.close();

    if (problems.length > 0) {
      throw new Error(`Page reported errors:\n${problems.join("\n")}`);
    }
    console.log("Play probe OK");
  } finally {
    dev?.kill("SIGTERM");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    setTimeout(() => process.exit(process.exitCode ?? 0), 100).unref();
  });
