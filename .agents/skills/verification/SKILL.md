---
name: verification
description: >-
  Determine verification level before coding; after changes run the canonical
  gate, inspect failures, fix, and rerun. For gameplay/visual work, drive the
  game with `npm run probe`, assert game state, inspect screenshots, and record
  what was verified.
---

# Verification skill

`docs/VERIFICATION.md` is the source of truth. Read it, then follow this checklist.

## Before implementation

1. Pick the verification level from [What each change class requires](../../../docs/VERIFICATION.md#what-each-change-class-requires).
2. For gameplay/presentation work, list the [modes the diff can reach](../../../docs/VERIFICATION.md#modes-touched) and sketch the probe steps for each: which flags reach the state, which `expect:`/`waitFor:` conditions prove the behavior, and which `shot:`s show the visuals.

## After implementation

1. `npm run verify`. On failure, read the output, fix the cause, and rerun until green. Never loosen the gate.
2. Gameplay/presentation: run the [live check](../../../docs/VERIFICATION.md#live-check) for every mode touched.
   - Behavior → `expect:` / `waitFor:` against `window.__PAC_ROGUE_DEBUG__.snapshot()`.
   - Visuals → `shot:`, then Read the PNG and say what you saw.
   - A failed step writes `artifacts/<name>-failure.{json,png}`. Read both before changing code.
   - Missing state → add a read-only snapshot field rather than guessing from pixels.
3. Record: the probe command(s) verbatim, what they asserted, what the screenshots showed, and any mode left unchecked.

UNVERIFIED IS NOT PASS.
