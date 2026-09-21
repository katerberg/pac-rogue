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

1. **Verify.** Pick the level from `docs/VERIFICATION.md`, run `npm run verify`,
   and fix → rerun until green. For gameplay/presentation changes also do the
   live check with `npm run probe` (see VERIFICATION.md), then Read the
   screenshots and write down what you saw.
2. **`simplify-pr`** on the scoped diff. Apply in-scope cuts.
3. **`no-comments`** on the scoped diff.
4. **Verify again** (`npm run verify`; rerun the probe if runtime code changed).
5. **`pr-review`** against `main`. Keep the ranked findings in this conversation.
6. **`fix-pr-findings`** using those findings. Fix only in-scope, worth-it items.
   List everything skipped or contentious for the PR body.
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
  showed), **Review pass** (what `pr-review` found, what `fix-pr-findings`
  fixed, what it deliberately left), **Skipped / needs a human**.
- Screenshots under `artifacts/` are gitignored; describe them in text. CI's
  sticky comment attaches the smoke image.
- After opening, use `gh pr checks` to read CI once. If `verify` failed in CI,
  fix and push; do not merge and do not enable auto-merge.

## Done when

- Final `npm run verify` exit 0 was observed in this session.
- Live check evidence is recorded (or the change class does not require it).
- The PR URL exists and its body has all four sections.
