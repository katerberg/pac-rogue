import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright";
import { checkCondition, parseCondition } from "./lib/probeCondition.mjs";
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
const WAIT_FOR_DEFAULT_MS = 10_000;
const WAIT_FOR_POLL_MS = 50;

const USAGE = `Usage: node scripts/play-probe.mjs --query "<url query>" --steps "<steps>" [--name <prefix>]

Drives the game on the agent dev port (${ports.agentDev}) with real keyboard input and
saves canvas screenshots under artifacts/. Fails on page errors or console errors.

Steps (comma-separated):
  wait:<ms>              sleep
  hold:<Key>:<ms>        keydown, wait, keyup (Playwright key names, e.g. ArrowLeft)
  hold:<KeyA>+<KeyB>:<ms> hold multiple keys down at once (e.g. ArrowUp+ArrowLeft for diagonal)
  press:<Key>            tap a key
  click:<x>:<y>          click at game coordinates (800x600), scaled onto the canvas
  hover:<x>:<y>          move the mouse to game coordinates, scaled onto the canvas
  shot:<label>           screenshot to artifacts/<name>-<label>.png
  pageShot:<label>       full-viewport screenshot (includes DOM overlays such as ?knobs=1 panels)
  domClick:<css>         click the first DOM element matching a CSS selector (e.g. #knobs-restart)
  domFill:<css>:<value>  set an input's value and fire input + change (e.g. domFill:#knob-timerMax:120)
  scene:<SceneKey>       fail unless that scene is active (MenuScene, PlayScene, ...)
  sound:<key>:<yes|no>   fail unless that sound's isPlaying() matches (e.g. menu-music, gameplay-music)
  expect:<cond>          fail unless the game-state condition holds right now
  waitFor:<cond>[:<ms>]  poll until the condition holds (default timeout ${WAIT_FOR_DEFAULT_MS}ms), else fail
  dump:<label>           write the game-state snapshot to artifacts/<name>-<label>.json

Conditions read window.__PAC_ROGUE_DEBUG__.snapshot() (agent ports only):
  <path><op><value>, op one of == != < <= > >=, value a number, true/false/null or bare string.
  Paths are dotted, with array indexes and .length: play.lives==3, play.player.col<10,
  play.ghosts.length==4, play.ghosts.0.phase==active, play.inStore==true, scenes.PlayScene==running.
  Fields: see docs/VERIFICATION.md#game-state-snapshot. On any failure the probe writes
  artifacts/<name>-failure.json and artifacts/<name>-failure.png.

Example:
  node scripts/play-probe.mjs --query "play=1&level=2&maze=maze1" \\
    --steps "waitFor:scenes.PlayScene==running,dump:start,hold:ArrowLeft:600,expect:play.player.facing==left,shot:moved" --name left
  (Level 1 opens a starting-upgrade card first; see docs/VERIFICATION.md#recipe.)`;

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

async function worldSize(page) {
  return page.evaluate(() => {
    const g = globalThis.__PAC_ROGUE_GAME__;
    const zoom = g.scene.getScenes(true)[0]?.cameras.main.zoom ?? 1;
    return { width: g.scale.gameSize.width / zoom, height: g.scale.gameSize.height / zoom };
  });
}

async function readSnapshot(page) {
  const snapshot = await page.evaluate(() => globalThis.__PAC_ROGUE_DEBUG__?.snapshot() ?? null);
  if (snapshot === null) {
    throw new Error("window.__PAC_ROGUE_DEBUG__ is missing (only exposed on agent ports)");
  }
  return snapshot;
}

async function waitForCondition(page, condition, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let result = checkCondition(await readSnapshot(page), condition);
  while (!result.ok && Date.now() < deadline) {
    await sleep(WAIT_FOR_POLL_MS);
    result = checkCondition(await readSnapshot(page), condition);
  }
  return result;
}

async function runStep(page, canvas, step, name) {
  const [kind, a, b] = step.split(":");
  switch (kind) {
    case "wait":
      await sleep(Number(a));
      break;
    case "hold": {
      const keys = a.split("+");
      for (const key of keys) {
        await page.keyboard.down(key);
      }
      await sleep(Number(b));
      for (const key of keys) {
        await page.keyboard.up(key);
      }
      break;
    }
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
      const game = await worldSize(page);
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
      const game = await worldSize(page);
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
    case "pageShot": {
      const path = join(outDir, `${name}-${a}.png`);
      await page.screenshot({ path });
      console.log(`shot ${path}`);
      break;
    }
    case "domClick":
      await page.click(a);
      break;
    case "domFill":
      await page.$eval(
        a,
        (input, value) => {
          input.value = value;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        },
        b,
      );
      break;
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
    case "sound": {
      const expected = b === "yes";
      const playing = await page.evaluate(
        (key) => globalThis.__PAC_ROGUE_GAME__?.sound?.isPlaying(key) === true,
        a,
      );
      if (playing !== expected) {
        throw new Error(`Expected sound "${a}" playing=${expected}, got ${playing}`);
      }
      console.log(`sound ${a} playing=${playing}`);
      break;
    }
    case "expect": {
      const condition = parseCondition(a);
      const { ok, actual } = checkCondition(await readSnapshot(page), condition);
      if (!ok) {
        throw new Error(
          `expect ${condition.text} failed: ${condition.path} is ${JSON.stringify(actual)}`,
        );
      }
      console.log(`expect ${condition.text} ok`);
      break;
    }
    case "waitFor": {
      const condition = parseCondition(a);
      const timeoutMs = b === undefined ? WAIT_FOR_DEFAULT_MS : Number(b);
      if (!Number.isFinite(timeoutMs)) {
        throw new Error(`Bad waitFor timeout "${b}"`);
      }
      const { ok, actual } = await waitForCondition(page, condition, timeoutMs);
      if (!ok) {
        throw new Error(
          `waitFor ${condition.text} timed out after ${timeoutMs}ms: ${condition.path} is ${JSON.stringify(actual)}`,
        );
      }
      console.log(`waitFor ${condition.text} ok`);
      break;
    }
    case "dump": {
      const path = join(outDir, `${name}-${a}.json`);
      writeFileSync(path, `${JSON.stringify(await readSnapshot(page), null, 2)}\n`);
      console.log(`dump ${path}`);
      break;
    }
    default:
      throw new Error(`Unknown step: ${step}`);
  }
}

async function saveFailureEvidence(page, canvas, name) {
  try {
    await canvas.screenshot({ path: join(outDir, `${name}-failure.png`) });
    writeFileSync(
      join(outDir, `${name}-failure.json`),
      `${JSON.stringify(await readSnapshot(page), null, 2)}\n`,
    );
    console.error(
      `failure evidence: artifacts/${name}-failure.png, artifacts/${name}-failure.json`,
    );
  } catch (error) {
    console.error(`could not save failure evidence: ${error.message}`);
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
      try {
        await runStep(page, canvas, step.trim(), name);
      } catch (error) {
        await saveFailureEvidence(page, canvas, name);
        throw new Error(`Step "${step.trim()}" failed: ${error.message}`);
      }
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
