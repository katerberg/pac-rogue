---
name: verification
description: >-
  Determine verification level before coding; after changes run the canonical
  gate, inspect failures, fix, and rerun. For gameplay/visual work, launch,
  exercise behavior, inspect pixels, and record what was verified.
---

# Verification skill

## Before implementation

1. **Determine the verification level** from `docs/VERIFICATION.md` (tooling/docs/domain vs presentation/gameplay vs boot/canvas).
2. Note the checks and evidence you will need when finished.
3. If the change is gameplay or presentation, plan live launch + screenshot inspection — not only `npm run verify`.

## After implementation

1. **Run** the appropriate checks (always at least `npm run verify` from the repo root; use Node from `.nvmrc`).
2. **Inspect** any failure output; identify the cause.
3. **Fix** the failure — do not skip steps or loosen the gate.
4. **Rerun** until the required checks pass.

Treat an unverified change as incomplete.

## Gameplay / presentation / canvas changes

In addition to `npm run verify`:

1. **Launch** with `npm run dev:agent` on port **5174** (never human port 5173). Kill/restart 5174 freely if needed.
2. **Exercise** the changed behavior as a player would.
3. **Inspect** a screenshot or live capture and **actually look at it** (e.g. Read `artifacts/visual-smoke.png`).
4. **Record** what was verified: what launched, what you exercised, what you observed.
5. Do not claim visual pass from compile/test/`visual` exit-code success alone.
6. Gameplay changes must keep `npm run check:ecs` green (`npm run verify` includes it). Live inspect on **5174** is still required.

## Never

- Assume visual correctness without inspecting pixels.
- Declare unverified work done.
- Skip, weaken, or delete verification to force a “pass.”

## Evidence

- Automated: verify exit code 0.
- Visual: screenshot path or equivalent browser capture, plus a brief note of what was observed.

## See also

- `docs/VERIFICATION.md`
- `docs/ARCHITECTURE.md`
- `AGENTS.md`
