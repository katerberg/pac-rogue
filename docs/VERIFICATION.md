# Verification

Verification is a hard blocker. Compiling is not enough for gameplay or visual work. Unverified work is not done.

## Workflow

### Before implementation

1. **Determine the verification level** for the change (see [What each change class requires](#what-each-change-class-requires)).
2. Note which checks and evidence will be required when the work is finished.
3. Do not start implementation assuming “typecheck alone” will be enough for gameplay or presentation work.

### After implementation

1. **Run the appropriate checks** for the chosen verification level (always at least `npm run verify`).
2. **Inspect failures** — read the failing command output; identify the root cause.
3. **Fix** the failure — do not skip steps, loosen the gate, or redefine success.
4. **Rerun** until the required checks pass.

Repeat fix → rerun until green. A single failed gate means the task is not complete.

### Gameplay / presentation / canvas

In addition to the automated gate:

1. **Launch** with `npm run dev:agent` → `http://127.0.0.1:5174` (humans: `npm run dev` on 5173).
2. **Exercise the changed behavior** as a player would for the change under test.
3. **Inspect** a screenshot or live output (e.g. Read `artifacts/visual-smoke.png`, or capture under `artifacts/`). Actually look at the pixels — do not infer correctness from exit codes.
4. **Record what was verified** — brief note of what was launched, what was exercised, and what was observed.

### Headless live check (cloud / no browser pane)

`npm run probe` drives the game on the agent dev port with real Playwright keyboard input, saves canvas screenshots to `artifacts/<name>-<label>.png`, and fails on page errors or `console.error`. It starts `vite` on 5174 itself if nothing is listening. Steps: `wait:<ms>`, `hold:<Key>:<ms>`, `press:<Key>`, `shot:<label>`, `scene:<SceneKey>`.

```bash
npm run probe -- --query "play=1&maze=mazeSmall" --steps "wait:600,shot:start,hold:ArrowLeft:1500,shot:moved,scene:PlayScene" --name left
```

Use URL flags from the README to reach the state under test (`level`, `maze`, `enableUpgrade`, `forceUpgrade`). Then **Read each screenshot** and record what you saw (positions, HUD values, upgrade effects). A zero exit code alone is not verification. This satisfies the launch → exercise → inspect steps above wherever no interactive browser is available.

### Never

- Assume visual correctness from compile, lint, unit tests, or a green `visual` script exit alone.
- Declare unverified work done.
- Skip, weaken, delete, or `--no-verify` around the gate to make a task “pass.”
- Claim “looks correct” without launching and inspecting.

## Canonical command

```bash
npm run verify
```

Runs, in order:

1. `typecheck` — TypeScript (`tsc --noEmit`)
2. `lint` — ESLint (includes Phaser import bans for components, domain, and logic systems)
3. `format:check` — Prettier
4. `check:ecs` — ECS boundary script (`scripts/check-ecs-boundaries.mjs`)
5. `test` — Vitest unit tests
6. `build` — production Vite build (after typecheck again via the build script)
7. `visual` — headless boot of the production build + canvas screenshot

Steps 1–5 are also available as `npm run verify:precommit` (no build/visual). The Git pre-commit hook in `.githooks/pre-commit` runs that script. `npm install` sets `core.hooksPath` to `.githooks` via the `prepare` script.

Gameplay and presentation changes must keep `check:ecs` green. Do not skip, weaken, or delete that gate.

GitHub Actions runs the same command on pull requests, pushes to `main`, and manual `workflow_dispatch` (see `.github/workflows/verify.yml`). The visual smoke screenshot is uploaded as a workflow artifact. On pull requests, CI publishes the PNG to a short-lived `ci/visual-smoke/pr-<n>` branch and leaves a sticky comment that embeds the image (plus a link to the workflow run).

## Ports (humans vs agents)

Ports are defined in `scripts/ports.json`. Do not share listeners.

| Who   | Dev                            | Preview                                       |
| ----- | ------------------------------ | --------------------------------------------- |
| Human | `npm run dev` → **5173**       | `npm run preview` → **4173**                  |
| Agent | `npm run dev:agent` → **5174** | `npm run preview:agent` / `visual` → **4174** |

Agents may freely kill and restart **5174** / **4174**. Do not bind to or kill the human ports.

### Cloud sessions

`.claude/settings.json` runs `scripts/cloud-setup.sh` on session start. It does nothing locally; when `CLAUDE_CODE_REMOTE=true` it installs the Node version from `.nvmrc`, runs `npm ci` when the lockfile changed, installs Playwright Chromium if missing, and points git hooks at `.githooks`. The cloud environment must allow network access to the npm registry, `github.com`, `raw.githubusercontent.com` (nvm), `nodejs.org`, and `cdn.playwright.dev`.

### Agent sound (muted by default)

On agent ports (**5174** / **4174**), audio is disabled (`noAudio`) unless `?sound=1` — see [README Flags](../README.md#flags). Human ports keep sound on.

## Runtime / visual verification

### Automated smoke (part of `verify`)

`npm run visual` (also run by `verify`):

- Serves `dist/` via Vite preview on the **agent** preview port (`http://127.0.0.1:4174`)
- Opens the page with Playwright Chromium
- Waits for a `canvas` element, captures `artifacts/visual-smoke-menu.png`
- Clicks **Start** on the menu, then captures `artifacts/visual-smoke.png` (**PlayScene** maze/HUD — primary CI smoke image)

Agents must **read that image** (or an equivalent live capture) when claiming visual verification — not merely note that the script exited 0.

### Live inspection (required for gameplay changes)

1. Agents: `npm run dev:agent` → `http://127.0.0.1:5174` (humans use `npm run dev` on 5173).
2. Interact with the game as a player would for the change under test.
3. Capture evidence: screenshot under `artifacts/`, or use the environment’s browser/screenshot tools and inspect the pixels.
4. Record what was verified (behavior exercised + observation).
5. Never claim “looks correct” without actually launching and inspecting.

## What each change class requires

| Change type                        | Verification level                  | Minimum bar                          |
| ---------------------------------- | ----------------------------------- | ------------------------------------ |
| Tooling / docs / pure domain logic | `verify`                            | `npm run verify`                     |
| Phaser presentation / gameplay     | `verify` + live visual              | `npm run verify` **and** live visual |
| Anything touching boot/canvas path | `verify` + inspect smoke screenshot | Confirm `artifacts/visual-smoke.png` |

Choose the level **before** coding. If the change spans classes, use the stricter level.

## Agent rules

- Read this file and `docs/ARCHITECTURE.md` before substantial changes.
- Follow `AGENTS.md` and `.agents/skills/verification/SKILL.md`.
- Determine verification level before implementation; run → inspect → fix → rerun after.
- Gameplay changes must keep `check:ecs` green and still require live inspect on **5174**.
- Use agent ports only; leave human ports alone.
- If verification fails, fix it — do not redefine success.
- If you cannot run visual checks in the environment, say so explicitly and leave the task incomplete.
- UNVERIFIED IS NOT PASS.
