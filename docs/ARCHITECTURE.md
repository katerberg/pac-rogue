# Architecture

Current shape of pac-rogue. Keep this document short and truthful — update it when the structure changes.

## Goals

- Fast local iteration (`npm run dev`).
- Hard verification before claiming work is done (`npm run verify`).
- Small, composable modules over frameworks-of-frameworks.
- Room to grow (ECS, deeper systems) only when the game demonstrates the need.

## Layout

```text
src/
  main.ts                 # Phaser Game bootstrap only
  styles.css              # Page chrome around the canvas
  domain/                 # Pure game/domain logic (no Phaser imports)
  game/
    config.ts             # Phaser GameConfig + shared dimensions
    scenes/               # Phaser presentation / scene wiring
scripts/
  ports.json              # Human vs agent local ports (single source of truth)
  visual-smoke.mjs        # Headless boot + screenshot for agents/CI
.github/workflows/
  verify.yml              # CI: npm run verify on PRs and main
docs/
  ARCHITECTURE.md         # This file
  VERIFICATION.md         # How to prove changes
```

## Ports

- Humans: `npm run dev` → 5173, `npm run preview` → 4173
- Agents: `npm run dev:agent` → 5174, preview/visual → 4174
- Agents may kill/restart only their ports.

## Principles

1. **Domain vs presentation** — Put rules, math, and state transitions in `src/domain` (or later focused modules). Phaser scenes render and gather input; they should not own deep game rules.
2. **Composition** — Prefer small functions and plain objects wired together. Do not introduce a god `GameManager` or global mutable singleton.
3. **No premature ECS** — Scene + domain modules are enough for the foundation. Revisit ECS only when entity/component churn becomes painful.
4. **Dependencies** — Add a package only with a concrete need. Prefer stdlib and existing tooling.
5. **Verification** — Automated checks and production build are mandatory. Gameplay/visual changes also require runtime inspection (see `docs/VERIFICATION.md`).

## Current runtime

- One Phaser scene (`BootScene`) draws a title card to prove the canvas pipeline.
- One domain helper (`clamp`) plus a unit test proves the test loop.
- No gameplay systems yet.
