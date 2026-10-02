import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { EVIDENCE_DIR, VERIFY_FILE } from "./lib/shipEvidence.mjs";

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
process.chdir(git("rev-parse", "--show-toplevel"));

const result = spawnSync("npm", ["run", "verify"], { stdio: "inherit" });
const exitCode = result.status ?? 1;
const record = {
  commit: git("rev-parse", "HEAD"),
  exitCode,
  clean: git("status", "--porcelain") === "",
  recordedAt: new Date().toISOString(),
};
mkdirSync(EVIDENCE_DIR, { recursive: true });
writeFileSync(join(EVIDENCE_DIR, VERIFY_FILE), `${JSON.stringify(record, null, 2)}\n`);
console.log(
  `Recorded verify exit ${exitCode} at ${record.commit.slice(0, 7)} (clean: ${record.clean})`,
);
process.exit(exitCode);
