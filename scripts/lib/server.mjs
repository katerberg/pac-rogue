import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const ports = JSON.parse(readFileSync(join(root, "scripts", "ports.json"), "utf8"));

// Some sandboxes pre-cache a Chromium build under PLAYWRIGHT_BROWSERS_PATH whose
// revision predates the one this repo's `playwright` version expects to download.
// Point at that pre-cached binary when present instead of failing on a missing download.
export function chromiumLaunchOptions() {
  const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!browsersPath) {
    return {};
  }
  const executablePath = join(browsersPath, "chromium");
  return existsSync(executablePath) ? { executablePath } : {};
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function isUp(url) {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
}

export async function waitForServer(url, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isUp(url)) {
      return;
    }
    await sleep(250);
  }
  throw new Error(`Timed out waiting for server at ${url}`);
}

export async function stopProcess(child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  const exited = new Promise((resolve) => {
    child.once("exit", resolve);
  });

  child.kill("SIGTERM");
  const timedOut = await Promise.race([exited.then(() => false), sleep(2_000).then(() => true)]);

  if (timedOut) {
    child.kill("SIGKILL");
    await Promise.race([exited, sleep(1_000)]);
  }
}
