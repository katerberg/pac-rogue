# Dot-Man

Phaser + bitECS 0.4 Pac-Man-like game. One player entity traverses a static maze; ECS owns position, facing, and velocity.

## Requirements

- Node.js **≥ 20.19** (repo pins `.nvmrc` → 24)

```bash
nvm use
npm install
npx playwright install chromium
```

## Commands

| Command                    | Purpose                                         |
| -------------------------- | ----------------------------------------------- |
| `npm run dev`              | Human dev server — <http://127.0.0.1:5173>      |
| `npm run dev:agent`        | Agent dev server — <http://127.0.0.1:5174>      |
| `npm run build`            | Typecheck + production build → `dist/`          |
| `npm run preview`          | Human production preview — :4173                |
| `npm run preview:agent`    | Agent production preview — :4174                |
| `npm run test`             | Unit tests (Vitest)                             |
| `npm run lint`             | ESLint                                          |
| `npm run format`           | Prettier write                                  |
| `npm run visual`           | Headless canvas smoke on agent preview port     |
| `npm run check:ecs`        | ECS layer boundaries (also part of `verify`)    |
| `npm run verify:precommit` | Fast gate — typecheck, lint, format, ECS, tests |
| `npm run verify`           | **Canonical gate** — precommit + build + visual |

`npm install` points Git at `.githooks/` (`core.hooksPath`). The pre-commit hook runs `npm run verify:precommit` (no build/visual). Full `npm run verify` remains the CI and completion gate.

Humans and agents use different ports (see `scripts/ports.json` / `docs/VERIFICATION.md`) so they do not collide.

## Flags

Append query params to any local URL (`5173` / `5174` / preview ports). Invalid values are ignored. Upgrade flag behavior: [docs/upgrades.md](./docs/upgrades.md).

| Flag            | Values                            | Effect                                                                                                                                                                                                                                      |
| --------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `play`          | `1`                               | Skip the menu and boot straight into `PlayScene` (level 1 unless `level` is set).                                                                                                                                                           |
| `maze`          | `maze1` \| `maze2` \| `mazeSmall` | Force that layout for the **first** board of this Start; omit for level-1 `mazeSmall`. Levels ≥ 2 use the procedural generator unless this override is set for the first board. See [docs/maze-constraints.md](./docs/maze-constraints.md). |
| `level`         | positive integer                  | Start at that level index (ghost roster unlock + speed mul `1 + 0.1×(level−1)`); level ≥ 2 without `?maze=` starts on a generated board. Omit for level 1. Invalid → level 1.                                                               |
| `forceUpgrade`  | one upgrade id                    | Level-1 starting upgrade uses that id if not already owned (then cleared); otherwise the next fruit choice modal guarantees it as one option; cleared on confirm or empty pool. Invalid → normal offer.                                     |
| `enableUpgrade` | upgrade id (repeatable)           | Grants each valid id into `owned` at `PlayScene` create (order preserved; duplicates skipped). Combines with `forceUpgrade`.                                                                                                                |
| `sound`         | `1`                               | On agent ports only: opt in to audio (muted by default). Human ports keep sound on.                                                                                                                                                         |

Upgrade ids: `powerPelletFreeze`, `playerSpeedUp`, `ghostSlow`, `scatterBurst`, `ghostRecall`, `warpTop`, `pickupRange`, `ghostHouseDelay`, `extraLife`, `pelletToPower`, `powerCollectThree`, `powerWallPass`, `powerSpeedBurst`, `powerInvuln`.

```text
http://127.0.0.1:5174/?play=1
http://127.0.0.1:5174/?play=1&maze=mazeSmall
http://127.0.0.1:5174/?maze=maze2
http://127.0.0.1:5174/?level=3
http://127.0.0.1:5174/?forceUpgrade=ghostSlow
http://127.0.0.1:5174/?enableUpgrade=scatterBurst
http://127.0.0.1:5174/?enableUpgrade=ghostRecall&enableUpgrade=warpTop
http://127.0.0.1:5173/?enableUpgrade=powerPelletFreeze&forceUpgrade=ghostSlow
http://127.0.0.1:5174/?sound=1
```

## Continuous integration

Pull requests and pushes to `main` run `npm run verify` (typecheck, lint, format, tests, production build, and visual smoke) via [`.github/workflows/verify.yml`](./.github/workflows/verify.yml).

## Deploy (GitHub Pages)

Live game: [https://katerberg.github.io/pac-rogue/](https://katerberg.github.io/pac-rogue/)

Pushes to `main` run [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml): production `npm run build`, then publish `dist/` (plus `.nojekyll`) to the `gh-pages` branch via JamesIves.

GitHub Pages must use source **branch `gh-pages` / folder `/`** (not `main`). After the first successful deploy, set that in the repo’s Pages settings if it is not already.

## Docs for agents

- [AGENTS.md](./AGENTS.md) — guardrails (every code-changing plan includes `/simplify-pr` then `/no-comments`)
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — structure and principles
- [docs/maze-constraints.md](./docs/maze-constraints.md) — variable-size maze rules / ASCII legend
- [docs/upgrades.md](./docs/upgrades.md) — run upgrades from fruit
- [Flags](#flags) — URL query params (`play`, `maze`, `level`, `forceUpgrade`, `enableUpgrade`, `sound`)
- [docs/VERIFICATION.md](./docs/VERIFICATION.md) — how to prove work
- [.agents/skills/simplify-pr/SKILL.md](./.agents/skills/simplify-pr/SKILL.md) — `/simplify-pr` workflow
- [.agents/skills/no-comments/SKILL.md](./.agents/skills/no-comments/SKILL.md) — `/no-comments` workflow
- [.agents/skills/ship-plan/SKILL.md](./.agents/skills/ship-plan/SKILL.md) — `ship-plan`: verify, review, fix, push PR (cloud-safe)

## Status

Boots to a `DOT-MAN` menu (Start / High Scores / Settings). Escape during play opens a pause menu (Resume, Settings, Quit with an inline Yes/No confirm); quitting never writes a high score. Start opens level-1 `mazeSmall`, grants one random starting upgrade shown on a card that fades into play (no bonus fruit; override first board with `?maze=`; start later with `?level=`). Clearing all pellets advances to a **procedural** 28×34 maze (tiling solver → ASCII; carry lives, upgrades, lifetime Collected; ghosts +10% speed per level; Time resets). High Scores lists Game Over runs from localStorage (lifetime pellets desc, then remaining time desc). Settings stores music (siren) and SFX enable/volume (0–10) in localStorage (`pac-rogue.audio-settings.v1`; agent ports still mute unless `?sound=1`). ECS Pac-Man traverses the active maze (blue pipe walls, centerline movement, sticky next-direction turns, side tunnels with wrap). From level 2+, bonus fruit at board pellet thresholds opens a pick-one upgrade modal (see [docs/upgrades.md](./docs/upgrades.md)). Three lives; mid-life reset keeps pellets; last-life Game Over writes high score. Ghosts unlock by level (Blinky → Pinky → Inky → Clyde; all four from level 4+); shared house spawn for present kinds; Blinky/Pinky time release (0.1s / 5s); Inky leaves after layout-scaled pellets (maze1 baseline 30) or 7s post-life; Clyde leaves after layout-scaled pellets (maze1 baseline 60) or 9s post-life; Inky chase uses Blinky’s tile doubled through a 2-tile Pac look-ahead, SE scatter `(27, 33)`. Power pellets are inert unless an owned upgrade reacts; no arcade fright yet. Dev URL flags: [Flags](#flags).

## Art

Art courtesy of [Pixelaholic](https://pixelaholic.itch.io/pac-man-game-art)
