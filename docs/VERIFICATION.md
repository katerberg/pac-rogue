# Verification

Verification is a hard blocker. Compiling is not enough for gameplay or visual work. Unverified work is not done.

## Canonical command

```bash
npm run verify
```

Runs, in order:

1. `typecheck` — TypeScript (`tsc --noEmit`)
2. `lint` — ESLint
3. `format:check` — Prettier
4. `test` — Vitest unit tests
5. `build` — production Vite build (after typecheck again via the build script)
6. `visual` — headless boot of the production build + canvas screenshot

Do not skip, weaken, delete, or `--no-verify` around this to make a task “pass.”

## Ports (humans vs agents)

Ports are defined in `scripts/ports.json`. Do not share listeners.

| Who   | Dev                            | Preview                                       |
| ----- | ------------------------------ | --------------------------------------------- |
| Human | `npm run dev` → **5173**       | `npm run preview` → **4173**                  |
| Agent | `npm run dev:agent` → **5174** | `npm run preview:agent` / `visual` → **4174** |

Agents may freely kill and restart **5174** / **4174**. Do not bind to or kill the human ports.

## Runtime / visual verification

### Automated smoke (part of `verify`)

`npm run visual` (also run by `verify`):

- Serves `dist/` via Vite preview on the **agent** preview port (`http://127.0.0.1:4174`)
- Opens the page with Playwright Chromium
- Waits for a `canvas` element
- Writes `artifacts/visual-smoke.png`

Agents must **read that image** (or an equivalent live capture) when claiming visual verification — not merely note that the script exited 0.

### Live inspection (required for gameplay changes)

1. Agents: `npm run dev:agent` → `http://127.0.0.1:5174` (humans use `npm run dev` on 5173).
2. Interact with the game as a player would for the change under test.
3. Capture evidence: screenshot under `artifacts/`, or use the environment’s browser/screenshot tools and inspect the pixels.
4. Never claim “looks correct” without actually launching and inspecting.

## What each change class requires

| Change type                        | Minimum bar                          |
| ---------------------------------- | ------------------------------------ |
| Tooling / docs / pure domain logic | `npm run verify`                     |
| Phaser presentation / gameplay     | `npm run verify` **and** live visual |
| Anything touching boot/canvas path | Confirm `artifacts/visual-smoke.png` |

## Agent rules

- Read this file and `docs/ARCHITECTURE.md` before substantial changes.
- Follow `AGENTS.md`.
- Use agent ports only; leave human ports alone.
- If verification fails, fix it — do not redefine success.
- If you cannot run visual checks in the environment, say so explicitly and leave the task incomplete.
