---
name: one-shot-plan
description: >-
  Interrogate a design with one Decide + Proposed-locks dump, then lock a
  one-shot implementation plan. Use when the user wants to plan a feature,
  flesh out a design, land a one-shot, or is in Plan mode for non-trivial work.
  Do not use for tiny fixes, already-locked plans, or "just implement".
---

# One-shot plan (batch questions, then lock)

Goal: a weaker follow-up model can implement without asking. Research, dump **one** thorough interrogation (real forks + proposed defaults), then write a **fully locked** plan. Prefer one meaty turn over many tiny ones; never ask what research or convention already answers.

Skip for a typo, a one-file bug fix, "implement the attached plan", decisions already locked in-thread, or when the user wants a thin plan or no questions. Say so in one line.

## Hard rules

1. No implementation plan until after the question round (or the user says "lock defaults and plan"). No TBD, "Option A vs B" or "optional" in the plan.
2. Do not drip 1-5 questions or use a 1-2 item multiple-choice widget; put the list in chat. This overrides any harness default to "ask 1-2 critical questions".
3. Every dump has **Decide** (numbered `1..N`) and **Proposed locks** (lettered `A..Z`, may be short, never omitted).
4. After answers: lock skipped Decide items yourself, treat approved locks as locked, state each default in one line, and plan against it.

## Workflow

1. **Research (silent):** read `docs/`, nearby code, and what the feature might reuse or break; open the message with a 5-12 line "today's world" restatement.
2. **One dump:** cover every applicable lens in [references/question-lenses.md](references/question-lenses.md) somewhere in Decide or Proposed locks (never skip scope, failure, docs, v1 vs out of scope).
   - **Decide:** only real forks (preference, product shape, genuinely ambiguous research). One decision per item, closed choices preferred; if code has a default, say `Today: X. Keep or change?`. A huge Decide list usually means obvious items belong in locks.
   - **Proposed locks:** research-backed defaults, one line each with a brief why.
   - Close with: partial Decide answers are fine; reply `approve all` or `approve except B, D` / `B: override...`; skipped items get defaults; the plan will have no open questions. **Then stop.**
3. **Follow-up:** a second dump only when answers create a new fork; never a third round unless asked.
4. **Lock, then plan:** a table of locked decisions, then the plan from [assets/plan-template.md](assets/plan-template.md), aimed at a dumber implementer: files, types, call order, acceptance tests, docs, out of scope, and for gameplay changes a concrete `npm run probe` query and steps. Include a docs deliverable or `Docs: none` with a reason. Every code-changing plan ends with the `ship-plan` skill. The plan will likely run unattended, so it must be self-contained.

If a tool forces a plan artifact on the first turn, make it the interrogation stub, never a fake complete plan.
