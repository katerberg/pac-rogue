---
name: pr-review-fix
description: >-
  Automation workflow: run /pr-review, apply /fix-pr-findings Fix items,
  push commits, then PR-comment only Holler and unfixed blocking findings.
  Use for the PR Review automation or when asked to review-then-fix without
  cluttering the PR with already-fixed nits.
---

# PR review → fix → comment leftovers

Orchestrates `/pr-review` then `/fix-pr-findings` in one run. **Do not post
any PR review comments until after Fix commits are pushed.** The PR thread
should only see findings that still need a human.

## Step 0: Author gate (automations)

If this run was triggered by a pull request automation:

1. Resolve the PR with `gh` and check the author.
2. If the author is not GitHub user `katerberg`, stop immediately — post
   nothing and make no changes.

## Step 1: Review (in-run only)

Follow [`.agents/skills/pr-review/SKILL.md`](../pr-review/SKILL.md) on the PR
diff (`git diff origin/<base>...HEAD`, default base `main`).

Keep the ranked findings in this conversation. **Do not** use Comment on
pull request (or inline review comments) yet.

## Step 2: Triage and fix

Immediately follow [`.agents/skills/fix-pr-findings/SKILL.md`](../fix-pr-findings/SKILL.md)
on those same findings.

- Apply only the **Fix** bucket.
- Do not implement **Holler** or **Skip**.
- Run the appropriate verification for the touch surface (`npm run verify`
  when application code changed; follow the verification skill for
  gameplay/visual touches).

## Step 3: Push Fix commits

If any **Fix** edits were made:

1. Commit on the PR branch with a clear message.
2. Push to the existing PR branch (`git push`). Do not open a separate fix PR
   unless the branch cannot be pushed.
3. Prefer one commit (or a small coherent set) over noise.

If nothing was fixed, skip push.

## Step 4: Comment only leftovers

Only after Steps 1–3 are done, post to the PR via Comment on pull request:

1. **Post** each **Holler** item (and any Critical/Major that could not be
   fixed safely) — ranked, with file/line, why it matters, and disposition
   (`defer` | `split PR` | `discuss` | `reject`) when hollering.
2. For remaining Critical/Major leftovers, also leave inline comments on the
   cited diff lines when those lines are still in the PR diff.
3. **Do not post** findings that were **Fixed**.
4. **Do not post** **Skip** items.
5. Lead the top-level comment with `fixed N · hollered M · skipped K` so
   silent Fix work is visible without listing those findings.
6. If N/M/K are all zero (or only Skip), post a short top-level comment that
   review found nothing blocking and note one strength.

## Hard rules

- Never comment the full pre-fix review list.
- Never approve the PR, request reviewers, or implement Holler items.
- Stay within the PR's stated intent; do not widen scope while fixing.
