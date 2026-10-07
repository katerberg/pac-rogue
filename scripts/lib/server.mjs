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

/** Per-attempt HTTP budget. Untimed fetch hangs forever on a TCP listener that never answers (e.g. a stale Cursor port forward on 5174/4174). */
const IS_UP_TIMEOUT_MS = 1_000;

export async function isUp(url) {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(IS_UP_TIMEOUT_MS) })).ok;
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
  throw new Error(
    `Timed out waiting for server at ${url} (port may be held by a non-HTTP listener; free agent ports ${ports.agentDev}/${ports.agentPreview} and retry)`,
  );
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
