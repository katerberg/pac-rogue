# Plan template

After lock, write a complete plan with **no open questions**. Adapt section titles to the work; keep every section below or an explicit “N/A — \<reason\>”.

```markdown
# <Plan title>

## Goal

One paragraph: what ships and why.

## Locked decisions

| ID    | Decision | Source                       |
| ----- | -------- | ---------------------------- |
| 1 / A | …        | user / default / approve all |

## Today’s world (brief)

What exists now that the implementer must respect.

## Approach

Ordered steps. Name files, modules, types, and call order. Prefer concrete paths over vague “wire up X”.

## Data / contracts

Types, schemas, API shapes, persistence. “None” only with reason.

## Failure behavior

What happens on error, empty, partial, conflict. User-visible vs logged.

## Docs

Exact paths to add/update, or **Docs: none** + one-line reason. Same PR as code when the host repo expects that.

## Acceptance tests

Checklist a weaker model can verify (commands, scenarios, assertions). For gameplay/presentation changes include a **live-check recipe**: the exact `npm run probe -- --query "…" --steps "…"` invocation(s) and what each screenshot must show.

## Out of scope

Explicit non-goals from the interrogation (v1 cuts).

## Implementation order

Numbered sequence the implementer should follow. End with:

1. Required verification for the change (`docs/VERIFICATION.md`), including the live-check recipe from Acceptance tests.
2. **Run the `ship-plan` skill** (`.agents/skills/ship-plan/SKILL.md`). Do not stop before the PR exists.
```

### Quality bar

- A weaker model can implement from this plan alone without asking preference questions.
- No TBD, “Option A vs B”, “prefer X if Y”, or “optional” left unresolved.
- Every Decide answer and every approved Proposed lock appears in **Locked decisions**.
- Code-changing plans end with the `ship-plan` step.
