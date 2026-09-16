---
name: fix-pr-findings
description: >-
  Triage PR review findings or comments: fix only worth-it, in-scope items after
  validating the fix is not one-off complexity bloat; holler at items that would
  bloat the PR or might be contentious. Use after /pr-review, when cleaning up
  review findings, applying straightforward PR comments, or when the user asks
  to fix the easy review findings without expanding scope.
---

# Fix PR findings

Go through the comments on the pr and fix the trivial ones only after
validating that the fix is worth it and is not just a one-off complexity bloat.
Holler at any that are going to bloat the pr or that might be contentious.

Companion to `/pr-review`. Default mode: **apply** approved fixes. Do not
quietly expand the PR. “Trivial” means the _edit_ is small and unambiguous —
bugs and real defects still qualify when the fix is local and worth it.

## Step 1: Collect findings

Use the first source that has concrete findings:

1. Ranked findings already in this conversation from `/pr-review` (or pasted
   review output)
2. User-supplied comment list
3. Open PR review comments via `gh` when a PR exists:

   ```bash
   gh pr view --json number,title,url,reviews,comments
   gh api repos/{owner}/{repo}/pulls/{n}/comments
   ```

If there are no findings, say so and stop. Do not invent new review comments.

Re-read the scoped diff (`git diff <base>...HEAD` plus working tree) before
triaging so each fix is judged against current code, not stale suggestions.

## Step 2: Triage every finding

Assign **exactly one** bucket per finding. Do not fix anything until the full
list is bucketed.

| Bucket     | When                                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------------------- |
| **Fix**    | Clearly correct, in-diff, small unambiguous edit; real issue or clear improvement; no new abstractions or scope |
| **Holler** | Would bloat the PR, add one-off complexity, pull in drive-by refactors, or is taste/design-contentious          |
| **Skip**   | Wrong, outdated, already fixed, pure style with no upside, or out of fence                                      |

### Worth-it gate (required for **Fix**)

A finding is worth fixing only if **all** are true:

- The problem is real in the current diff (not hypothetical)
- The fix is local (usually one file, a few lines; no new module/helper “for later”)
- The fix does **not** introduce a one-off abstraction, wrapper, config object, or parallel pattern used once
- The fix does **not** widen scope beyond the PR’s stated intent
- You would merge the result without wanting a follow-up revert

If the “fix” needs a new helper, shared utility, API reshape, or multi-file
refactor to feel clean → **Holler**, do not implement a half-measure.

### Holler triggers (do not fix; call out loudly)

- New abstraction / indirection for a single call site
- Cross-cutting renames, file splits, or “while we’re here” refactors
- Behavior or product-taste changes with more than one reasonable answer
- Test or architecture rewrites that dwarf the original change
- Suggestions that fight project rules (`AGENTS.md`, Architecture) or `/simplify-pr` stance
- Anything you would want a human to decide before coding

Hollering means: short, blunt callout in the report — severity, why it’s
contentious or bloating, and a one-line recommended disposition (`defer`,
`split PR`, `discuss`, `reject`). Do not soft-pedal.

## Step 3: Apply **Fix** only

1. Implement the smallest correct edit for each **Fix** item.
2. Do not bundle **Holler** or **Skip** work into the same pass.
3. Prefer deleting or simplifying over adding. If a finding only makes sense by
   adding ceremony, reclassify to **Holler** and revert that edit.
4. After edits, re-scan the touched hunks: no new unused imports, dead code, or
   comments that only narrate the change.

If this repo has a verification skill / `npm run verify`, run the appropriate
level for the touch surface after applying fixes. Gameplay/visual touches need
runtime checks per project rules.

## Step 4: Report

Lead with counts: `fixed N · hollered M · skipped K`.

Then three sections (omit empty ones):

```markdown
## Fixed

- `path` L<a>-L<b>: <one-line what changed>

## Hollered

- **<title>** — `path` L<a>-L<b>
  - Why: <bloat / contentious / one-off complexity>
  - Disposition: defer | split PR | discuss | reject

## Skipped

- <finding>: <already fixed | wrong | out of scope | not worth it>
```

Do not claim the PR is “review-clean” if any **Holler** items remain — say
what still needs a human call.
