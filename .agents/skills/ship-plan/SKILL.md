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

## Pipeline

1. **Verify** per the `verification` skill (`npm run verify`, fix → rerun). For gameplay/presentation changes also do the
   live check with `npm run probe` (see VERIFICATION.md), then Read the
   screenshots and write down what you saw.
2. **`simplify-pr`** on the scoped diff. Apply in-scope cuts.
3. **`no-comments`** on the scoped diff.
4. **Verify again** (`npm run verify`; rerun the probe if runtime code changed).
5. **`pr-review`** against `main`. Write its full ranked findings (or an
   explicit "no findings" line) to `artifacts/pr-review.md` — this is the
   tracked record, not a side effect of the conversation scrolling past it.
   Do not summarize it away in your own words yet; the raw findings are what
   `fix-pr-findings` triages next.
6. **`fix-pr-findings`** using those findings. Fix only in-scope, worth-it
   items. Capture its full report (fixed / hollered / skipped, per its own
   output format) — this is what step 8 must surface, not paraphrase.
7. **Verify a final time.** Re-run the probe if fixes touched runtime code.
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
- `git push -u origin HEAD`, then `gh pr create` (add `--draft` per above).
- If `gh` is missing or unauthenticated, keep the pushed branch, put the PR
  body in `artifacts/pr-body.md`, and end your final message with the branch
  name and the GitHub compare URL. Do not claim a PR exists.
- PR body sections: **Summary**, **Verification** (commands run + result, and for
  gameplay work: what the probe launched, which keys/flags, what the screenshots
  showed), **Review pass** (`pr-review`'s findings verbatim or linked from
  `artifacts/pr-review.md`, plus `fix-pr-findings`' full fixed/hollered/skipped
  breakdown), **Skipped / needs a human** (every **Holler** and **Skip** item
  from `fix-pr-findings`, named individually — never collapsed to "nothing to
  fix" if anything was hollered or skipped).
- Screenshots under `artifacts/` are gitignored; describe them in text. CI's
  sticky comment attaches the smoke image.
- After opening, use `gh pr checks` to read CI once. If `verify` failed in CI,
  fix and push; do not merge and do not enable auto-merge.
- **Final chat message to the user** (separate from the PR body, which they
  may not open) must include: the `pr-review` verdict and finding count (or
  "no findings"), and `fix-pr-findings`' fixed/hollered/skipped counts with
  every hollered/skipped item named — the same list that went in "Skipped /
  needs a human." Never let this collapse to just the PR link; the point is
  the user sees what was deferred without needing to click through.

Done means the PR URL exists, its body has all four sections, `artifacts/pr-review.md`
records the review pass, the final chat message names every deferred/hollered/
skipped finding, and the last `npm run verify` exit 0 was observed in this session.
