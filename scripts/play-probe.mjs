import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright";
import {
  chromiumLaunchOptions,
  isUp,
  ports,
  root,
  sleep,
  stopProcess,
  waitForServer,
} from "./lib/server.mjs";

const outDir = join(root, "artifacts");

const USAGE = `Usage: node scripts/play-probe.mjs --query "<url query>" --steps "<steps>" [--name <prefix>]

Drives the game on the agent dev port (${ports.agentDev}) with real keyboard input and
saves canvas screenshots under artifacts/. Fails on page errors or console errors.

Steps (comma-separated):
  wait:<ms>              sleep
  hold:<Key>:<ms>        keydown, wait, keyup (Playwright key names, e.g. ArrowLeft)
  press:<Key>            tap a key
  click:<x>:<y>          click at game coordinates (800x600), scaled onto the canvas
  hover:<x>:<y>          move the mouse to game coordinates, scaled onto the canvas
  shot:<label>           screenshot to artifacts/<name>-<label>.png
  scene:<SceneKey>       fail unless that scene is active (MenuScene, PlayScene, ...)

Example:
  node scripts/play-probe.mjs --query "play=1&maze=mazeSmall" \\
    --steps "wait:500,shot:start,hold:ArrowLeft:1500,shot:moved,scene:PlayScene" --name left`;

function readArgs() {
  const { values } = parseArgs({
    options: {
      query: { type: "string", default: "play=1" },
      steps: { type: "string", default: "shot:boot" },
      name: { type: "string", default: "probe" },
      help: { type: "boolean", default: false },
    },
  });
  if (values.help) {
    console.log(USAGE);
    process.exit(0);
  }
  return values;
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
      // A zero-delay down+up can both be processed before Phaser's next frame
      // reads the key's justDown flag, which its own keyup handler also clears —
      // so the tap would silently vanish. A short delay guarantees a frame lands
      // in between, like a real (if very brief) keypress would.
      await page.keyboard.press(a, { delay: 50 });
      break;
    case "click": {
      const box = await canvas.boundingBox();
      if (box === null) {
        throw new Error("canvas has no bounding box");
      }
      const game = await page.evaluate(() => {
        const g = globalThis.__PAC_ROGUE_GAME__;
        return { width: g.scale.gameSize.width, height: g.scale.gameSize.height };
      });
      await page.mouse.click(
        box.x + (Number(a) / game.width) * box.width,
        box.y + (Number(b) / game.height) * box.height,
      );
      break;
    }
    case "hover": {
      const box = await canvas.boundingBox();
      if (box === null) {
        throw new Error("canvas has no bounding box");
      }
      const game = await page.evaluate(() => {
        const g = globalThis.__PAC_ROGUE_GAME__;
        return { width: g.scale.gameSize.width, height: g.scale.gameSize.height };
      });
      await page.mouse.move(
        box.x + (Number(a) / game.width) * box.width,
        box.y + (Number(b) / game.height) * box.height,
      );
      break;
    }
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
  const { query, steps, name } = readArgs();
  const baseUrl = `http://127.0.0.1:${ports.agentDev}/`;
  mkdirSync(outDir, { recursive: true });

  let dev = null;
  if (!(await isUp(baseUrl))) {
    dev = spawn(process.execPath, [join(root, "node_modules", "vite", "bin", "vite.js")], {
      cwd: root,
      env: { ...process.env, PAC_ROGUE_AGENT: "1" },
      stdio: ["ignore", "ignore", "inherit"],
    });
  }

  const problems = [];
  let browser = null;
  try {
    await waitForServer(baseUrl);
    browser = await chromium.launch({ headless: true, ...chromiumLaunchOptions() });
    const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
    page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") {
        problems.push(`console.error: ${message.text()}`);
      }
    });

    await page.goto(`${baseUrl}?${query}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("canvas", { timeout: 15_000 });
    const canvas = page.locator("canvas").first();

    for (const step of steps.split(",")) {
      await runStep(page, canvas, step.trim(), name);
    }

    if (problems.length > 0) {
      throw new Error(`Page reported errors:\n${problems.join("\n")}`);
    }
    console.log("Play probe OK");
  } finally {
    await browser?.close();
    if (dev !== null) {
      await stopProcess(dev);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    process.exit(process.exitCode ?? 0);
  });
