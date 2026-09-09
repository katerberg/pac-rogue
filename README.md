# pac-rogue

Phaser + TypeScript foundation for a future Pac-Man-like game. Gameplay is intentionally minimal: a boot scene proves the pipeline.

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
| `npm run verify`        | **Canonical gate** — all checks + build + visual |

Humans and agents use different ports (see `scripts/ports.json` / `docs/VERIFICATION.md`) so they do not collide.

## Docs for agents

- [AGENTS.md](./AGENTS.md) — guardrails
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — structure and principles
- [docs/VERIFICATION.md](./docs/VERIFICATION.md) — how to prove work

## Status

Foundation only. No maze, ghosts, or player yet.
