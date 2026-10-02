---
name: ship-plan
description: >-
  Finish an implemented plan unattended: verify, simplify-pr, no-comments, verify,
  pr-review, fix-pr-findings, verify, then push a branch and open the PR. Use as
  the last step of every code-changing plan, or when the user says ship it, land
  it, or finish and open the PR. Safe to run in a cloud agent with nobody watching.
---

# Ship plan

Run after the plan's implementation steps are done. Nobody may be watching: do
not stop to ask, and do not report success you did not observe. Every gate below
must actually pass before moving on.

## Evidence (enforced)

Every step leaves a file under `artifacts/ship-plan/` (gitignored). A
`PreToolUse` hook in `.claude/settings.json` runs
`scripts/check-ship-evidence.mjs` before any PR is created (or its **Review
pass** rewritten). When the diff touches `src/`, the hook blocks the call until:

- `simplify-pr.md`, `no-comments.md`, `pr-review.md` and `fix-pr-findings.md`
  exist. Each starts with `Commit: <git rev-parse HEAD>` (full sha) for the commit
  the step covered, and that commit is on this branch.
- `fix-pr-findings.md` names the commit holding its fixes (the reviewed commit
  when nothing was fixed), and no `src/` file changed after it. New code after
  review means running `pr-review` and `fix-pr-findings` again.
- `verify.json` (written by `npm run verify:record`) shows exit 0 on a clean tree
  at the current HEAD.
- The PR body has all four sections listed below.

Write each file **by invoking the skill** (Skill tool or `/name`) and saving
its report verbatim. Never write one by hand to get past the hook. Never name a
skill as having run in a PR body or chat message unless its file exists. An
informal look at the diff is not `pr-review`. Run `npm run check:ship`
to check before pushing.

## Pipeline

1. **Verify** per the `verification` skill (`npm run verify`, fix → rerun). For gameplay/presentation changes also do the
   [live check](../../../docs/VERIFICATION.md#live-check) with `npm run probe` for **every mode the diff
   touches**: assert behavior with `expect:`/`waitFor:`, Read the screenshots, and write down the
   exact commands and what you saw.
2. **`simplify-pr`** on the scoped diff. Apply in-scope cuts. Save its report
   to `artifacts/ship-plan/simplify-pr.md`.
3. **`no-comments`** on the scoped diff. Save its report to
   `artifacts/ship-plan/no-comments.md`. Commit the cuts.
4. **Verify again** (`npm run verify`; rerun the probe if runtime code changed).
5. **`pr-review`** against `main`, on a committed HEAD. Write its full ranked findings (or an
   explicit "no findings" line) to `artifacts/ship-plan/pr-review.md`. That file is a
   gitignored scratch copy; the durable record is the PR body's **Review pass**
   section, which must reproduce the findings. Do not summarize them away in
   your own words yet; the raw findings are what `fix-pr-findings` triages next.
6. **`fix-pr-findings`** using those findings. Fix only in-scope, worth-it
   items. Capture its full report (fixed / hollered / skipped, per its own
   output format) to `artifacts/ship-plan/fix-pr-findings.md` — this is what
   step 8 must surface, not paraphrase. Commit the fixes first, so its
   `Commit:` line is the commit that holds them.
7. **Verify a final time** with `npm run verify:record` on the committed, clean
   HEAD you will push. Re-run the probe if fixes touched runtime code.
8. **Push and open the PR** (below).

Skip steps 2–3 only for pure docs/tooling changes that touch no `src/`. Never
skip a verify step, and never weaken a gate to get past it.

If a gate cannot be made green after a real attempt, stop, push the branch
anyway, open the PR as a **draft**, and lead the body with what failed and the
exact output. A draft with an honest failure beats a green-looking PR.

## Push and open the PR

- Branch: `git switch -c <short-kebab-name>` from the current base if still on
  `main`. Never push to `main`.
- Commit with focused messages. Let the pre-commit hook run; do not `--no-verify`.
- `git push -u origin HEAD`, then open the PR with `gh pr create` or, where
  `gh` is unavailable (cloud sessions), the GitHub MCP `create_pull_request`
  tool (draft per above). Fill in `.github/pull_request_template.md`.
- If neither works, keep the pushed branch, put the PR body in
  `artifacts/pr-body.md`, and end your final message with the branch name and
  the GitHub compare URL. Do not claim a PR exists.
- Build **Review pass** by pasting from the `artifacts/ship-plan/` files, not
  from memory.
- PR body sections: **Summary**, **Verification** (commands run + result, and for
  gameplay work: each probe command verbatim, what it asserted, what the
  screenshots showed, and which [modes](../../../docs/VERIFICATION.md#modes-touched)
  were checked or deliberately not), **Review pass** (`pr-review`'s findings verbatim, since the
  `artifacts/` copy is not tracked, plus `fix-pr-findings`' full fixed/hollered/skipped
  breakdown), **Skipped / needs a human** (every **Holler** and **Skip** item
  from `fix-pr-findings`, named individually — never collapsed to "nothing to
  fix" if anything was hollered or skipped).
- Screenshots under `artifacts/` are gitignored; describe them in text. CI's
  sticky comment attaches the smoke image.
- After opening, read CI once (`gh pr checks`, or the GitHub MCP check-run tools). If `verify` failed in CI,
  fix and push; do not merge and do not enable auto-merge.
- **Final chat message to the user** (separate from the PR body, which they
  may not open) must include: the `pr-review` verdict and finding count (or
  "no findings"), and `fix-pr-findings`' fixed/hollered/skipped counts with
  every hollered/skipped item named — the same list that went in "Skipped /
  needs a human." Never let this collapse to just the PR link; the point is
  the user sees what was deferred without needing to click through.

Done means `npm run check:ship` passes on the pushed HEAD, the PR URL exists, its body has all four sections with the review
findings reproduced in it, the final chat message names every deferred/hollered/
skipped finding, and the last `npm run verify` exit 0 was observed in this session.
