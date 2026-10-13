---
name: pr-review
description: >-
  Senior-engineer PR review: gather diff context, evaluate against correctness,
  security, scope, tests, and consistency lenses, and return a ranked findings
  list with file/line references. Use when reviewing a PR, commit, or branch diff.
---

# PR Review

Review as a senior engineer: direct, specific, opinionated. Every finding references a concrete file and line range.

## Step 1: Gather context

- Target: base branch (default `origin/main`), a specific commit, the PR description or scope statement, any requested focus, and a finding count (default 10).
- Diff: `git diff origin/main...HEAD --stat` then the full diff (or `git show <sha>`). If over ~3000 lines, go file by file with `-- <path>`.
- Skim `AGENTS.md` (and `.cursor/rules/` if present) and enforce the conventions that apply.

## Step 2: Review

For every changed file, apply all lenses, weighted toward the requested focus: correctness (bugs, off-by-ones, races, edge cases), security, scope creep, duplication of existing utilities, extraneous code (dead code, unused imports, over-engineering), readability, decomposition, scalability, maintainability, tests (missing coverage, brittle assertions), consistency with established patterns, and **scene logic** (a changed decision left inline in a scene or `render.ts` instead of the sim or a tested pure function; a gameplay change with no new or extended `PlaySim` test; see `docs/VERIFICATION.md`).

## Step 3: Output

A ranked list, most important first. Each finding:

```
## <rank>. <short title>

**Severity:** Critical | Major | Minor | Nit
**File:** `path/to/file.ts` L<start>-L<end>

<1-3 sentences: the problem and why it matters>

**Suggestion:**
<concrete fix or direction; show code when it helps>
```

Severity: **Critical** blocks merge (bugs, security, data loss); **Major** should fix before merge (perf, maintainability, missing tests); **Minor** nice to fix; **Nit** take it or leave it.

End with a short **Summary**: one sentence on overall quality, anything done well, and how to split the PR if it should be. Prefer actionable suggestions to vague advice, cite the specific `AGENTS.md` rule being violated, and don't pad: report 6 real issues, not 10.
