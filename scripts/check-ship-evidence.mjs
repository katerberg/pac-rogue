import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  EVIDENCE_DIR,
  STEP_FILES,
  VERIFY_FILE,
  gatedToolCall,
  shipEvidenceProblems,
} from "./lib/shipEvidence.mjs";

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const readIfExists = (path) => (existsSync(path) ? readFileSync(path, "utf8") : undefined);

let prBody;
if (process.argv.includes("--hook")) {
  const input = JSON.parse(readFileSync(0, "utf8"));
  if (!gatedToolCall(input.tool_name, input.tool_input)) {
    process.exit(0);
  }
  prBody = typeof input.tool_input?.body === "string" ? input.tool_input.body : undefined;
}

let base;
try {
  base = git("merge-base", "HEAD", "origin/main");
} catch {
  console.error(
    "ship-plan evidence check: no merge-base with origin/main; run `git fetch origin main`.",
  );
  process.exit(2);
}
const steps = Object.fromEntries(
  STEP_FILES.map((file) => [file, readIfExists(join(EVIDENCE_DIR, file))]),
);
const verifyText = readIfExists(join(EVIDENCE_DIR, VERIFY_FILE));
const problems = shipEvidenceProblems({
  touchesSrc: git("diff", "--name-only", `${base}...HEAD`)
    .split("\n")
    .some((path) => path.startsWith("src/")),
  head: git("rev-parse", "HEAD"),
  branchCommits: git("rev-list", `${base}..HEAD`).split("\n").filter(Boolean),
  steps,
  verify: verifyText === undefined ? undefined : JSON.parse(verifyText),
  prBody,
});

if (problems.length > 0) {
  console.error(
    [
      "ship-plan evidence check failed (.agents/skills/ship-plan/SKILL.md). Run the missing steps; do not write these files by hand or claim a step ran without them:",
      ...problems.map((problem) => `- ${problem}`),
    ].join("\n"),
  );
  process.exit(2);
}
console.log("ship-plan evidence OK");
