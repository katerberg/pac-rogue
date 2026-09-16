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

## Continuous integration

Pull requests and pushes to `main` run `npm run verify` (typecheck, lint, format, tests, production build, and visual smoke) via [`.github/workflows/verify.yml`](./.github/workflows/verify.yml).

## Docs for agents

- [AGENTS.md](./AGENTS.md) — guardrails (every code-changing plan includes `/no-comments`)
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — structure and principles
- [docs/VERIFICATION.md](./docs/VERIFICATION.md) — how to prove work
- [.agents/skills/no-comments/SKILL.md](./.agents/skills/no-comments/SKILL.md) — `/no-comments` workflow

## Status

Boots to a `PAC-ROGUE` menu (Start / High Scores). Start opens the maze; High Scores lists localStorage clears (score desc). ECS Pac-Man traverses a static maze (blue pipe walls, centerline movement, sticky next-direction turns, side tunnels with wrap). Regular pellets with a collected counter, a top-right countdown, and capped localStorage history of successful clears (score = remaining time). One Blinky ghost: ghost-house release after 1s, scatter/chase waves, Cruise Elroy, tunnel slowdown; contact returns to the menu. No power pellets / frightened mode / other ghosts yet.

## Art

Art courtesy of [Pixelaholic](https://pixelaholic.itch.io/pac-man-game-art)
