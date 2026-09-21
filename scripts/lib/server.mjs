import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const ports = JSON.parse(readFileSync(join(root, "scripts", "ports.json"), "utf8"));

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
