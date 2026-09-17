# pac-rogue

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
| `npm run dev`              | Human dev server — http://127.0.0.1:5173        |
| `npm run dev:agent`        | Agent dev server — http://127.0.0.1:5174        |
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

| Flag            | Values                  | Effect                                                                                                                                   |
| --------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `maze`          | `maze1` \| `maze2`      | Force that layout for the **first** board of this Start; omit for 50/50 random. Later levels always pick randomly from the pool.         |
| `level`         | positive integer        | Start at that level index (ghost speed mul `1 + 0.1×(level−1)`); omit for level 1. Invalid → level 1.                                    |
| `forceUpgrade`  | one upgrade id          | Next fruit choice modal guarantees that id as one option if not already owned; cleared on confirm or empty pool. Invalid → normal offer. |
| `enableUpgrade` | upgrade id (repeatable) | Grants each valid id into `owned` at `PlayScene` create (order preserved; duplicates skipped). Combines with `forceUpgrade`.             |
| `sound`         | `1`                     | On agent ports only: opt in to audio (muted by default). Human ports keep sound on.                                                      |

Upgrade ids: `powerPelletFreeze`, `playerSpeedUp`, `ghostSlow`, `scatterBurst`, `ghostRecall`, `warpTop`, `pickupRange`, `ghostHouseDelay`, `extraLife`, `pelletToPower`, `powerCollectThree`, `powerWallPass`, `powerSpeedBurst`, `powerInvuln`.

```text
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
- [docs/upgrades.md](./docs/upgrades.md) — run upgrades from fruit
- [Flags](#flags) — URL query params (`maze`, `level`, `forceUpgrade`, `enableUpgrade`, `sound`)
- [docs/VERIFICATION.md](./docs/VERIFICATION.md) — how to prove work
- [.agents/skills/simplify-pr/SKILL.md](./.agents/skills/simplify-pr/SKILL.md) — `/simplify-pr` workflow
- [.agents/skills/no-comments/SKILL.md](./.agents/skills/no-comments/SKILL.md) — `/no-comments` workflow

## Status

Boots to a `PAC-ROGUE` menu (Start / High Scores / Settings). Start opens a randomly chosen maze (`maze1` Pac-Man board or `maze2` Ms. Pac Maze 1; override first board with `?maze=`; start later with `?level=`). Clearing all pellets advances to another random maze in the same run (carry lives, upgrades, lifetime Collected; ghosts +10% speed per level; Time resets). High Scores lists Game Over runs from localStorage (lifetime pellets desc, then remaining time desc). Settings stores music (siren) and SFX enable/volume (0–10) in localStorage (`pac-rogue.audio-settings.v1`; agent ports still mute unless `?sound=1`). ECS Pac-Man traverses the active maze (blue pipe walls, centerline movement, sticky next-direction turns, side tunnels with wrap). Bonus fruit at board pellet thresholds opens a pick-one upgrade modal (see [docs/upgrades.md](./docs/upgrades.md)). Three lives; mid-life reset keeps pellets; last-life Game Over writes high score. Power pellets are inert unless an owned upgrade reacts; no arcade fright / Inky yet. Dev URL flags: [Flags](#flags).

## Art

Art courtesy of [Pixelaholic](https://pixelaholic.itch.io/pac-man-game-art)
