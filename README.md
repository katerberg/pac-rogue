# pac-rogue

Phaser + bitECS 0.4 Pac-Man-like game. One player entity moves smoothly on an open playfield; ECS owns position and velocity.

## Requirements

- Node.js **≥ 20.19** (repo pins `.nvmrc` → 24)

```bash
nvm use
npm install
npx playwright install chromium
```

## Commands

| Command                 | Purpose                                          |
| ----------------------- | ------------------------------------------------ |
| `npm run dev`           | Human dev server — http://127.0.0.1:5173         |
| `npm run dev:agent`     | Agent dev server — http://127.0.0.1:5174         |
| `npm run build`         | Typecheck + production build → `dist/`           |
| `npm run preview`       | Human production preview — :4173                 |
| `npm run preview:agent` | Agent production preview — :4174                 |
| `npm run test`          | Unit tests (Vitest)                              |
| `npm run lint`          | ESLint                                           |
| `npm run format`        | Prettier write                                   |
| `npm run visual`        | Headless canvas smoke on agent preview port      |
| `npm run check:ecs`     | ECS layer boundaries (also part of `verify`)     |
| `npm run verify`        | **Canonical gate** — all checks + build + visual |

Humans and agents use different ports (see `scripts/ports.json` / `docs/VERIFICATION.md`) so they do not collide.

## Docs for agents

- [AGENTS.md](./AGENTS.md) — guardrails
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — structure and principles
- [docs/VERIFICATION.md](./docs/VERIFICATION.md) — how to prove work

## Status

ECS Pac-Man moves smoothly on an open playfield (arrows + WASD, instant turns). No maze, ghosts, or pellets yet.
