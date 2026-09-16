---
name: simplify-pr
description: >-
  Audit a PR or branch diff for agent-style complexity: oversized classes,
  premature abstractions, duplicated helpers, ceremony, and other additive
  smells. Prefer findings that remove, simplify, or consolidate. Required on
  every code-changing implementation plan for this project (run before
  /no-comments). Use when implementing a plan, or when the user asks to
  simplify a PR, declutter a diff, hunt agent bloat, reduce complexity, or
  consolidate overlapping code before merge.
---

# Simplify PR

Hunt additive agent bloat on a scoped diff. Goal: **delete, simplify, or
consolidate** — not a general correctness or security review.

Required on every code-changing plan: run after implementation/verification
and **before** `/no-comments`. Do not treat the plan or implementation as done
until this skill has run (same skip rule as `/no-comments`: pure docs/tooling
with no `src/` edits).

## Scope

Use the caller's files or diff. Otherwise diff against the base branch
(default `main`), including the working tree:

```bash
git diff main...HEAD --stat
git diff main...HEAD
git diff main  # working tree vs base when uncommitted
```

Large diffs (>~2000 lines): review path-by-path. Prefer `src/` application
code; skip pure lockfile/noise unless it encodes a new dependency smell.

Read `docs/ARCHITECTURE.md` and `AGENTS.md` before judging structure.

## Stance

- Bias toward **less code**. Every finding should name something to remove,
  shrink, merge, or inline.
- Flag **new** complexity harder than pre-existing neighbors unless the PR
  made the neighbor worse.
- Do not invent refactors outside the diff fence.
- Do not pad. If three real smells exist, report three.
- Prefer concrete edits (`delete X`, `inline Y into Z`, `merge A+B`) over
  taste lectures.

## Smell lenses (agent-additive)

Work the diff with these lenses. Details and examples:
[references/smells.md](references/smells.md).

| Lens                      | Look for                                                                                      |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| **Size**                  | Files/classes/functions that grew fat; scenes or systems doing too many jobs                  |
| **Premature abstraction** | Manager/Facade/Helper/Utils/Base* wrapping one call site; generic “framework” for one feature |
| **Duplication**           | Near-copy of an existing `domain/` or `systems/` helper; parallel constants/types             |
| **Indirection**           | Pass-through functions, option bags used once, config objects with one consumer               |
| **Ceremony**              | Speculative extension points, unused params, dead branches, TODOs that ship code              |
| **Layer violations**      | Simulation in scenes; Phaser in `domain/`; ECS manager classes; god mutable state             |
| **Additive deps**         | New packages without a concrete need stated in the PR                                         |

Repo hard fails (always actionable when in scope): god objects, global mutable
singletons, Entity/Component/System manager classes around bitecs, movement
rules in scenes, Phaser GameObjects as position source of truth.

## Steps

1. Gather the scoped diff and skim Architecture / AGENTS constraints.
2. For each changed file, apply the smell lenses. Trace call sites for new
   helpers/classes — one consumer usually means inline or delete.
3. Rank findings by **simplification value** (bytes/concepts removed, fewer
   types/layers, clearer ownership).
4. **Apply** every actionable in-scope finding (remove / simplify /
   consolidate). Smallest edits only; do not widen the fence. Leave open only
   items that need product judgment or would change behavior outside the PR
   intent — name each in the report.
5. Re-scan the scoped diff once after edits. Fix any new obvious additive
   smells introduced by step 4.
6. Report using the format below. Plan/implementation gates are not done while
   actionable in-scope findings remain unapplied.
7. If code changed, run the verification skill / `npm run verify` as
   appropriate for the touch surface. Then proceed to `/no-comments` when this
   was a plan gate.

**Report-only mode:** if the user asks only to audit/review (no apply, not a
plan gate), stop after the ranked report and do not edit.

## Output format

Lead with a one-line verdict (`clean`, `a few cuts`, `needs consolidation`).

Then a ranked list (applied and left-open):

```markdown
## N. <short title>

**Action:** remove | simplify | consolidate
**Status:** applied | open
**Where:** `path/to/file.ts` L<a>-L<b> (and related paths if consolidating)
**Smell:** <lens name>
**Why:** <1-2 sentences — what the additive pattern is costing>
**Do this:** <concrete edit: delete / inline / merge into X / move rule to system Y>
```

End with:

- **Keep:** anything in the diff that looks rightly sized (optional, brief)
- **Out of scope:** smells noticed outside the fence (optional, one line each)

## Never

- Turn this into a full PR review (bugs/security/tests) — stay on simplify.
- Propose new abstractions to “clean up” complexity.
- Recommend dependencies as the fix.
- Claim architecture violations without citing the Architecture / AGENTS rule.
- Skip this skill on a code-changing plan while still claiming the plan done.
