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

| Flag            | Values                  | Effect                                                                                                                       |
| --------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `maze`          | `classic` \| `mspac`    | Force that layout for this Start; omit for 50/50 random each Start.                                                          |
| `forceUpgrade`  | one upgrade id          | Next fruit grants that id if not already owned; then clears. Invalid → normal random.                                        |
| `enableUpgrade` | upgrade id (repeatable) | Grants each valid id into `owned` at `PlayScene` create (order preserved; duplicates skipped). Combines with `forceUpgrade`. |
| `sound`         | `1`                     | On agent ports only: opt in to audio (muted by default). Human ports keep sound on.                                          |

Upgrade ids: `powerPelletFreeze`, `playerSpeedUp`, `ghostSlow`, `scatterBurst`, `ghostRecall`, `warpTop`.

```text
http://127.0.0.1:5174/?maze=mspac
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
- [Flags](#flags) — URL query params (`maze`, `forceUpgrade`, `enableUpgrade`, `sound`)
- [docs/VERIFICATION.md](./docs/VERIFICATION.md) — how to prove work
- [.agents/skills/simplify-pr/SKILL.md](./.agents/skills/simplify-pr/SKILL.md) — `/simplify-pr` workflow
- [.agents/skills/no-comments/SKILL.md](./.agents/skills/no-comments/SKILL.md) — `/no-comments` workflow

## Status

Boots to a `PAC-ROGUE` menu (Start / High Scores). Start opens a randomly chosen maze (`classic` or arcade Ms. Pac-Man Maze 1 `mspac`; override with `?maze=`); High Scores lists localStorage clears (score desc). ECS Pac-Man traverses the active maze (blue pipe walls, centerline movement, sticky next-direction turns, side tunnels with wrap). Regular pellets with a collected counter, a top-right countdown, and capped localStorage history of successful clears (score = remaining time). Bonus fruit appears under the ghost house after layout-scaled pellet thresholds (classic 70/170) for 10 real seconds (level-1 cherries via strawberry art stand-in; pickup plays double munch, no score yet) and grants one random distinct run upgrade (Power Freeze / Speed Up / Ghost Slow / Scatter Burst / Ghost Recall / Warp Top — see [docs/upgrades.md](./docs/upgrades.md)). Blinky + Pinky + Clyde: shared house spawn; Blinky/Pinky time release (0.1s / 5s, tunable); Clyde leaves after layout-scaled pellets (classic 60); chase-first arcade scatter/chase waves; Blinky Cruise Elroy; Pinky 4-tile look-ahead + NW scatter; Clyde shy chase + SW scatter (tunable); tunnel slowdown; contact returns to the menu. Power pellets are inert unless an owned upgrade reacts (freeze, scatter burst, ghost recall, warp top); no arcade fright / Inky yet. Dev URL flags: [Flags](#flags).

## Art

Art courtesy of [Pixelaholic](https://pixelaholic.itch.io/pac-man-game-art)
