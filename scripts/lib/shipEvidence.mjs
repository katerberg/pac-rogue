export const EVIDENCE_DIR = "artifacts/ship-plan";
export const STEP_FILES = [
  "simplify-pr.md",
  "no-comments.md",
  "pr-review.md",
  "fix-pr-findings.md",
];
export const VERIFY_FILE = "verify.json";
export const PR_BODY_SECTIONS = [
  "## Summary",
  "## Verification",
  "## Review pass",
  "## Skipped / needs a human",
];

export function evidenceCommit(text) {
  const match = /^Commit: ([0-9a-f]{40})$/m.exec(text ?? "");
  return match ? match[1] : null;
}

export function gatedToolCall(toolName, toolInput) {
  if (toolName === "mcp__github__create_pull_request") {
    return true;
  }
  if (toolName === "mcp__github__update_pull_request") {
    return typeof toolInput?.body === "string" && toolInput.body.includes("## Review pass");
  }
  if (toolName === "Bash") {
    const command = String(toolInput?.command ?? "");
    return (
      /\bgh\s+pr\s+create\b/.test(command) ||
      (/\bgh\s+pr\s+edit\b/.test(command) && command.includes("Review pass"))
    );
  }
  return false;
}

export function shipEvidenceProblems({
  touchesSrc,
  head,
  branchCommits,
  srcChangedSince,
  steps,
  verify,
  prBody,
}) {
  if (!touchesSrc) {
    return [];
  }
  const problems = [];
  for (const file of STEP_FILES) {
    const text = steps[file];
    if (text === undefined) {
      problems.push(
        `${EVIDENCE_DIR}/${file} is missing: run that skill and write its report there.`,
      );
      continue;
    }
    const commit = evidenceCommit(text);
    if (commit === null) {
      problems.push(`${EVIDENCE_DIR}/${file} has no "Commit: <sha>" line.`);
    } else if (!branchCommits.includes(commit)) {
      problems.push(
        `${EVIDENCE_DIR}/${file} is for ${commit.slice(0, 7)}, which is not a commit on this branch (stale run).`,
      );
    }
  }
  const prReview = evidenceCommit(steps["pr-review.md"]);
  const fixFindings = evidenceCommit(steps["fix-pr-findings.md"]);
  if (prReview !== null && fixFindings !== null) {
    if (branchCommits.indexOf(fixFindings) > branchCommits.indexOf(prReview)) {
      problems.push("fix-pr-findings.md must be for the reviewed commit or a later one.");
    } else if (srcChangedSince(fixFindings)) {
      problems.push(
        `src/ changed after ${fixFindings.slice(0, 7)} (fix-pr-findings): rerun pr-review and fix-pr-findings on the new code.`,
      );
    }
  }
  if (verify === undefined) {
    problems.push(`${EVIDENCE_DIR}/${VERIFY_FILE} is missing: run \`npm run verify:record\`.`);
  } else if (verify.commit !== head || verify.exitCode !== 0 || verify.clean !== true) {
    problems.push(
      `${EVIDENCE_DIR}/${VERIFY_FILE} must show exit 0 on a clean tree at HEAD ${head.slice(0, 7)} (got ${String(verify.commit).slice(0, 7)}, exit ${verify.exitCode}, clean ${verify.clean}): rerun \`npm run verify:record\`.`,
    );
  }
  if (typeof prBody === "string") {
    for (const section of PR_BODY_SECTIONS) {
      if (!prBody.includes(section)) {
        problems.push(`PR body is missing the "${section}" section.`);
      }
    }
  }
  return problems;
}
