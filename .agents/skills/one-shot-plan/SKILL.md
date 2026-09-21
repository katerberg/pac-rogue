---
name: one-shot-plan
description: >-
  Interrogate a design with one Decide + Proposed-locks dump, then lock a
  one-shot implementation plan. Use when the user wants to plan a feature,
  flesh out a design, land a one-shot, or is in Plan mode for non-trivial work.
  Do not use for tiny fixes, already-locked plans, or "just implement".
---

# One-shot plan (batch questions, then lock)

Goal: a **weaker follow-up model** can implement without asking. You earn that by researching, then dumping **one** thorough interrogation (real forks + proposed defaults), then writing a **fully locked** plan.

This is slower up front on purpose. Prefer one meaty turn over many tiny ones. Thorough ≠ padding: do not ask questions whose answer is already obvious from research or convention.

## When this skill applies

Use it when the user is **designing** (Plan mode, “flesh out a plan”, “one-shot”, “ask questions”, new system / mechanic / UX pivot).

Skip it when:

- The task is a typo, one-file bug fix, or “implement the attached plan.”
- Decisions are already locked in-thread and the user wants a plan _now_.
- They explicitly want a thin plan or to skip questions.

If skipped, say so in one line.

## Hard rules (all harnesses)

1. **Do not write the implementation plan until after the question round** (or the user says “lock defaults and plan”).
2. **Do not leave open questions in the plan.** No TBD, no “Option A vs B”, no “prefer X if Y”, no “optional.”
3. **Do not drip 1–5 questions** as the whole interrogation. Cursor Plan mode’s “ask 1–2 critical questions” does **not** override this skill.
4. **Do not use a 1–2 item multiple-choice widget** (`AskQuestion` / similar) as the primary vehicle. Put the list in the **chat message**.
5. Every dump has **both** sections: **Decide** and **Proposed locks** (Proposed locks may be short, never omitted).
6. Number **Decide** items `1…N` continuously so the user can answer `1: interior only`. Number **Proposed locks** `A…Z` (then `AA…` if needed).
7. After answers: **lock skipped Decide items yourself**, treat approved Proposed locks as locked, state each default in one line, and plan against it.

## Workflow

```text
research (silent) → one dump (Decide + Proposed locks) → wait → lock + plan
```

### 1. Research first (do not ask yet)

Spend the turn on the **current world**, not on guessing.

- Read existing `docs/`, `.cursor/plans/`, README “Where do I…?”, and nearby code.
- Explore in parallel (subagents / greps) when the surface is large.
- Note what already exists that the feature might reuse or break.

Then open the question message with a **short** “today’s world” restatement (5–12 lines): what is true now, what the user’s pitch changes. No plan yet.

### 2. One dump: Decide + Proposed locks

Write **one message** with two sections. Read [references/question-lenses.md](references/question-lenses.md) and cover every applicable lens **somewhere in the dump** (Decide _or_ Proposed locks). Skip a lens only if it cannot apply. Do not skip **scope**, **failure**, **docs**, or **v1 vs out of scope**.

#### Decide

Only **real forks**: user preference, product shape, or research that is genuinely ambiguous.

Each item is **one decision**, answerable in a short bullet. Prefer closed / enumerable choices. When the code already has a default but changing it is a real product choice, say so: `Today: manual camera. Keep or change?`

**Smell test (not a hard cap):** if Decide is huge, you are probably asking obvious things — move those to Proposed locks. A long Decide list is fine when there are that many real forks.

#### Proposed locks

Research-backed defaults you would lock without a debate. One line each: decision + brief why (`Reuse existing X auth helper — already used by settings`).

Ask for **grouped approval**, not per-item essays. Closing lines must include:

- “Partial Decide answers are fine.”
- “Reply `approve all` for Proposed locks, or `approve except B, D` / `B: override…`.”
- “I will lock defaults for anything you skip.”
- “After this, the plan will have no open questions.”

**Then stop.** Do not draft the plan in the same message.

### 3. Follow-up questions (rare)

A second dump is allowed only when answers **create a new fork** that was not in the first list. Still batch as Decide + Proposed locks (not 1–2 drips). Never a third round unless the user asks.

### 4. Lock, then plan

After answers (or “lock defaults”):

1. Table of **locked decisions** (Decide answers, overrides, and Proposed locks you kept).
2. Write the plan from [assets/plan-template.md](assets/plan-template.md).
3. Target a **dumber implementer**: files, types, call order, acceptance tests, docs, out of scope.

Every plan includes a **docs** deliverable (`docs/`, README, folder READMEs) or **Docs: none** plus a one-line reason. Same PR as the code when the host repo expects that.

Every **code-changing** plan ends with the `ship-plan` skill. The plan will likely be implemented by an unattended cloud agent, so all questions are asked **before** the lock; the plan itself must be fully self-contained.

## Harness notes

| Harness                        | Do this                                                                                                                                                                     |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cursor Plan mode**           | Research + dump in chat. **Do not** `CreatePlan` until after answers. Ignore the 1–2-question default. After lock, `CreatePlan` with a complete plan (no questions inside). |
| **Cursor Agent / Cloud**       | Same phases. If you must emit a file before answers, write `INTERROGATION` only (Decide + Proposed locks + “plan after answers”) — never a fake complete plan.              |
| **Claude Code, Codex, others** | Same phases. After lock, write `.cursor/plans/<name>.plan.md` (or the repo’s usual plans dir). No Cursor-only tools required.                                               |

If a tool **forces** a plan artifact on the first turn: the artifact is the interrogation stub, not the implementation plan.

## Anti-patterns

- Plan with “open questions” or alternatives for the user to resolve later
- AskQuestion / 1–2 MCQs instead of the dump
- Padding Decide with obvious / research-settled items instead of Proposed locks
- Omitting the Proposed locks section
- “Any other preferences?” as a substitute for lens coverage
- Creating todos for code/tests and omitting docs
- Omitting the `ship-plan` step from a code-changing plan
- A plan whose acceptance tests do not say how to check runtime behavior (which `npm run probe` query/steps, or which flags)
- Implementation starting during the question round

## Done when

- User received one Decide + Proposed locks dump covering the lenses
- Plan has **zero** unresolved choices
- A weaker model could implement from files + tests + docs sections alone
- Code-changing plans end with the `ship-plan` step and give a concrete live-check recipe (probe query + steps) for gameplay/presentation changes
