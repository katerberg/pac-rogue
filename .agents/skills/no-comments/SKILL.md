---
name: no-comments
description: >-
  Run /no-comments after scoped code changes: audit (or spawn Comment Sicko
  when available), act on accepted findings, and remove unjustified comments
  without weakening real constraints. Required on every implementation plan
  for this project.
---

# No comments

Strip unjustified comments and suppressions from the scoped diff. Keep only
comments that encode a real constraint the code or tooling cannot yet enforce.

## Scope

Use the caller's files or diff. Otherwise use the current diff against the base
branch, default `main`, including the working tree. Skip only for pure
docs/tooling plans that touch no application source under `src/`.

If the scoped diff has no comments, JSDoc that only narrates, or lint/TS
suppressions: report zero deletions and exit. That still counts as running
`/no-comments`.

## How to audit

**Prefer** spawning `Task` with `subagent_type: "Comment Sicko"` when that
subagent exists in this harness. Pass the scope. Do not restate its rules.

**Otherwise** audit the scoped diff yourself with the kill/keep rules below.
This path is first-class — not a degraded fallback.

Do not narrate which path you used. Do not apologize that Comment Sicko (or
`/architect`, `/how`, `/why`) is missing. Just run the audit and act.

## Kill / keep

Delete (or flag `MUST KILL`) when a scoped comment or suppression:

- Narrates what the next line does, restates a clear name/type, or marks
  history (`// fixed bug`, `// temporary`)
- Papers over a workaround, dead path, wrong shape, or API misuse that should
  be fixed in scope
- Is a lint/TypeScript suppression whose real job is correctness or safety —
  those stay actionable `MUST KILL`s (fix or justify; do not leave silent)
- Says `IMPORTANT` / `do not remove` without a constraint the code cannot
  express — treat as thin; delete unless proof says otherwise

Keep only with proof the comment is about something **we cannot change** in
this change (external API quirk, upstream bug, licensed wording, harness
limit). Constraint wording (`do not remove`, `do not change wording`, `talk to
X before changing`) is a keep candidate, not automatic immunity.

Ambiguity: if a kill is ambiguous, do not restore after a reviewer pass. If a
keep is refuted or still ambiguous, delete it.

## Steps

1. **Audit** per [How to audit](#how-to-audit). Produce a findings list (kills,
   keeps, missed suppressions) and any proposed deletions in scope.
2. **Review findings** (your own or Comment Sicko's). Reject application-code
   edits unrelated to the comment pass, scope escapes, exception-protected
   deletions, misstated `MUST KILL` reasons, and flags that treat kept
   intentional code as guilty. Reshape flags on our-code surprises stay
   actionable — do not restore those comments. Audit missed scoped lint and
   TypeScript suppressions. Restore deletions only with exact exceptions and
   scoped proof. When `/how` or `/why` exists, run it before accepting thin
   `IMPORTANT` / `do not remove` kills or keeps; otherwise apply [Kill /
   keep](#kill--keep) directly. If using Comment Sicko: revert and rerun one
   rejected report with the failure named; reject a second, report it open, and
   fail `/no-comments`.
3. **Fix trivial accepted flags** by deleting a dead path, dropping a
   parameter, or using the real API. If a fix needs a shape and `/architect`
   exists, run it once for the accepted set and surrounding code — stop at the
   sketch, then implement in step 4. If `/architect` is absent, sketch the
   smallest in-scope shape yourself and continue.
4. **Implement** the smallest root-cause fix in scope. Remove every named
   workaround. If the root cause is out of scope, land the smallest in-scope
   fix and report the rest open. Do not widen the fence or bolt on symptom
   guards. Optional intent guides when present:
   **principle-fix-root-causes**,
   **principle-redesign-from-first-principles** — neither authorizes widening
   scope.
5. **Constraints.** Leave keeps about things we cannot change. Offer the
   cheapest in-scope type, runtime, test, or CI lint. Wait for interactive
   approval. Unattended and eval require caller pre-approval. If approved,
   encode then delete. Otherwise delete, report the constraint open, and sketch
   out-of-scope work.
6. **Report** deletion count, restored comments, reruns (if any), architect
   sketch (if any), fixes, encoding offers, encodings, unenforced constraints,
   and other open work. Keep the report short; no harness-availability
   commentary.
