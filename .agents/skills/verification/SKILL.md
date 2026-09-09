---
name: verification
description: >-
  Run the canonical verify gate and, for gameplay/visual work, perform runtime
  visual inspection. Use after code changes and before claiming completion.
---

# Verification skill

## Always

1. Run `npm run verify` from the repo root (use Node from `.nvmrc`).
2. If it fails, fix the failure — do not skip steps or loosen the gate.
3. Treat an unverified change as incomplete.

## Gameplay / presentation / canvas changes

In addition to `npm run verify`:

1. Launch with `npm run dev:agent` on port **5174** (never human port 5173). Kill/restart 5174 freely if needed.
2. Exercise the change as a player would.
3. Capture or open a screenshot and **actually look at it** (e.g. Read `artifacts/visual-smoke.png`).
4. Do not claim visual pass from compile/test success alone.

## Evidence

- Automated: verify exit code 0.
- Visual: screenshot path or equivalent browser capture, plus a brief note of what was observed.

## See also

- `docs/VERIFICATION.md`
- `docs/ARCHITECTURE.md`
- `AGENTS.md`
