import { describe, expect, it } from "vitest";
import { evidenceCommit, gatedToolCall, shipEvidenceProblems } from "./shipEvidence.mjs";

const A = "a".repeat(40);
const B = "b".repeat(40);
const OLD = "0".repeat(40);

function complete(overrides = {}) {
  return {
    touchesSrc: true,
    head: B,
    branchCommits: [B, A],
    steps: {
      "simplify-pr.md": `Commit: ${A}\nVerdict: clean`,
      "no-comments.md": `Commit: ${A}\nDeletions: 0`,
      "pr-review.md": `Commit: ${A}\nno findings`,
      "fix-pr-findings.md": `Commit: ${A}\nfixed 0 · hollered 0 · skipped 0`,
    },
    verify: { commit: B, exitCode: 0, clean: true },
    ...overrides,
  };
}

describe("shipEvidenceProblems", () => {
  it("passes with every step recorded on this branch and verify green at HEAD", () => {
    expect(shipEvidenceProblems(complete())).toEqual([]);
  });

  it("does not gate diffs that touch no src/", () => {
    expect(
      shipEvidenceProblems(complete({ touchesSrc: false, steps: {}, verify: undefined })),
    ).toEqual([]);
  });

  it("flags a missing step report", () => {
    const steps = { ...complete().steps };
    delete steps["pr-review.md"];
    expect(shipEvidenceProblems(complete({ steps }))).toEqual([
      "artifacts/ship-plan/pr-review.md is missing: run that skill and write its report there.",
    ]);
  });

  it("flags a report from another branch or an earlier run", () => {
    const steps = { ...complete().steps, "simplify-pr.md": `Commit: ${OLD}\nclean` };
    expect(shipEvidenceProblems(complete({ steps }))[0]).toMatch(/simplify-pr\.md is for 0000000/);
  });

  it("flags a report without a Commit line", () => {
    const steps = { ...complete().steps, "no-comments.md": "Deletions: 0" };
    expect(shipEvidenceProblems(complete({ steps }))).toEqual([
      'artifacts/ship-plan/no-comments.md has no "Commit: <sha>" line.',
    ]);
  });

  it("requires fix-pr-findings to triage the reviewed commit", () => {
    const steps = { ...complete().steps, "fix-pr-findings.md": `Commit: ${B}\nfixed 0` };
    expect(shipEvidenceProblems(complete({ steps }))).toEqual([
      "fix-pr-findings.md must triage the same commit pr-review.md reviewed.",
    ]);
  });

  it.each([
    ["missing", undefined],
    ["an older commit", { commit: A, exitCode: 0, clean: true }],
    ["a failing run", { commit: B, exitCode: 1, clean: true }],
    ["a dirty tree", { commit: B, exitCode: 0, clean: false }],
  ])("rejects verify evidence that is %s", (_label, verify) => {
    expect(shipEvidenceProblems(complete({ verify }))).toHaveLength(1);
  });

  it("requires the four PR body sections when a body is given", () => {
    const body = "## Summary\n## Verification\n## Skipped / needs a human";
    expect(shipEvidenceProblems(complete({ prBody: body }))).toEqual([
      'PR body is missing the "## Review pass" section.',
    ]);
  });
});

describe("evidenceCommit", () => {
  it("reads a full sha from a Commit line", () => {
    expect(evidenceCommit(`Verdict\nCommit: ${A}\n`)).toBe(A);
    expect(evidenceCommit("Commit: abc123")).toBeNull();
    expect(evidenceCommit(undefined)).toBeNull();
  });
});

describe("gatedToolCall", () => {
  it("gates PR creation and Review pass rewrites only", () => {
    expect(gatedToolCall("mcp__github__create_pull_request", {})).toBe(true);
    expect(gatedToolCall("mcp__github__update_pull_request", { body: "## Review pass\n" })).toBe(
      true,
    );
    expect(gatedToolCall("mcp__github__update_pull_request", { title: "x" })).toBe(false);
    expect(gatedToolCall("Bash", { command: "gh pr create --fill" })).toBe(true);
    expect(gatedToolCall("Bash", { command: "gh pr edit 3 --title x" })).toBe(false);
    expect(gatedToolCall("Bash", { command: "gh pr view 3" })).toBe(false);
    expect(gatedToolCall("Read", {})).toBe(false);
  });
});
