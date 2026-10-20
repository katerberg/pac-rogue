# Dot-Man

Phaser + bitECS 0.4 Pac-Man-like roguelike: a fixed 9-level run with upgrades, stores and a boss. The simulation is headless (`src/game/sim/`) and Phaser scenes are adapters. Live game: <https://katerberg.github.io/pac-rogue/>.

## Requirements

Node.js **>= 20.19** (`.nvmrc` pins 24).

```bash
nvm use
npm install
npx playwright install chromium
```

## Commands

`package.json` `scripts` is the full list. The ones you need: `npm run dev` (human, :5173) / `dev:agent` (:5174), `build`, `test`, `lint`, `format`, `probe` (scripted live check), `visual` (headless canvas smoke), `check:ecs`, `verify` (the canonical gate: precommit checks + build + visual), `verify:record` and `check:ship` (ship-plan evidence), `balance` / `balance:compare` ([docs/BALANCE_BOTS.md](./docs/BALANCE_BOTS.md)), `maze:generate` (offline candidates to expand the committed maze pool; [docs/maze-constraints.md](./docs/maze-constraints.md)), `worker:dev`, `data:pull`.

`npm install` points Git at `.githooks/`; the pre-commit hook runs `verify:precommit`. Humans and agents use different ports (`scripts/ports.json`, [docs/VERIFICATION.md](./docs/VERIFICATION.md)). CI (`.github/workflows/verify.yml`) runs `verify` on PRs and `main`.

## Flags

Append query params to any local URL (`5173` / `5174` / preview ports). Invalid values are ignored. A flag with no value (`?learnAll&godMode`) means `=1`; an explicit empty value (`?seed=`) stays empty. **Every flag except `play`, `sound` and `learnAll` is a debug flag and disables high-score saving for the run** — even with an invalid value (list: `HIGH_SCORE_DISABLING_FLAGS` in `src/domain/runHistory.ts`). Upgrade flag behavior: [docs/upgrades.md](./docs/upgrades.md).

Parsing and defaults: `parsePlayOptions` in `src/domain/playOptions.ts`. The table is intent only — clamp ranges and mul formulas live in that code.

<!-- prettier-ignore -->
| Flag | Values | Effect |
| --- | --- | --- |
| `play` | `1` | Skip the menu; boot into `PlayScene` (level 1 unless `level` is set). |
| `maze` | `maze1` \| `maze2` \| `mazeSmall` \| pool index | Force the **first** board layout; omit for level-1 `mazeSmall`. Levels 2–8 otherwise draw from the committed pool. [maze-constraints.md](./docs/maze-constraints.md). |
| `level` | positive integer | Start at that level (roster unlock + shared speed mul). Clamps to `MAX_LEVEL`; `level=9` is the boss. |
| `quarters` | non-negative integer | Starting Quarters (HUD). |
| `pennyCharge` | integer 0..299 | Starting penny charge. [pennies.md](./docs/pennies.md). |
| `jumpToSpinner` | `1` | Queue one slot spin at board start (defaults start level to 2). Pair with `slot`. |
| `slot` | `0` or e.g. `1q`, `2q1u`, `1l` | Force every slot spin's line counts. [pennies.md](./docs/pennies.md#slot-machine). |
| `slotMachine` | `1` | Place one slot-machine world pickup on each eligible Play board start. [pennies.md](./docs/pennies.md#slot-machine). |
| `enableUpgrade` (alias `enableUpgrades`) | upgrade id; repeatable or comma-separated | Grant each valid id into `owned` at create. |
| `disableLevelUpgrades` | `1` | Skip starting upgrade and level-clear (1–8) choice modal. |
| `infiniteLives` | `1` | Death sequence plays; never spend a life / Game Over. |
| `lives` | integer 1..99 | Start with that many lives (also sets `maxLives` unless given). |
| `maxLives` | integer 1..99 | Cap for store free-life / Myogenesis regen (Extra Life still raises its floor). |
| `godMode` | `1` | Ghosts pass through without catch. |
| `jumpToUpgrade` | `1` | Clear the first board into the upgrade modal (after time-penny drain). Defaults start level to 2. |
| `store` | `1` | Start in a store floor (level 3 unless `level` is set). [store.md](./docs/store.md). |
| `forceUpgrade` | upgrade id | Guarantee that (base) id in every level-clear offer while eligible. |
| `ghosts` | ghost names (comma-separated) | Replace every level's roster (`blinky` \| `pinky` \| `inky` \| `clyde` \| `spunky` \| `wardy`). |
| `roster` | `0` … `5` | Force one curated roster for the run. [levels.md](./docs/levels.md#ghost-roster). |
| `boss` | `blinkySwarm` \| `chainedGhosts` | Force that boss; without `level`, start in the fight. [bosses.md](./docs/bosses.md). |
| `bossStageAdvance` | `1` | Start the stage-1→2 transition as soon as the boss board is ready (wins over `store`). |
| `learnAll` | `1` \| `0` | Boot into LEARN (without `play=1`). `1` lists every upgrade; `0` lists none. Read-only. [learn.md](./docs/learn.md). |
| `runLogFill` | integer 0..600 | Agent ports only: seed that many synthetic `debug` runs at boot. [RUN_LOG.md](./docs/RUN_LOG.md). |
| `seed` | 1-32 of `A-Z a-z 0-9 _ -` | Fix every random roll so the URL replays. [VERIFICATION.md](./docs/VERIFICATION.md#seeded-runs). |
| `levelModifiers` | `0` | Opt out of speed-lane / collapse / lava modifiers. [levels.md](./docs/levels.md). |
| `knobs` | `1` | Live tuning panels over the gutters; table in `src/domain/tuningKnobs.ts`. |
| `customMaze` | `1` | Paste-ASCII first board before boot (`pac-rogue.custom-maze.v1`). |
| `sound` | `1` | Agent ports only: opt in to audio (muted by default). |

Every upgrade id (`ALL_UPGRADE_IDS`; inventory [docs/upgrade-list.md](./docs/upgrade-list.md#upgrade-table)) is accepted by `enableUpgrade` / `forceUpgrade`, including a `Plus` suffix for the enhanced form (e.g. `?enableUpgrade=passiveAfterburnerPlus`).

```text
http://127.0.0.1:5174/?play=1&level=2&seed=demo&enableUpgrade=powerPelletFreeze
http://127.0.0.1:5174/?play=1&store=1&quarters=10
http://127.0.0.1:5174/?play=1&boss=blinkySwarm&bossStageAdvance=1
```

## Deploy and global runs

Live game: <https://katerberg.github.io/pac-rogue/>. Pushes to `main` deploy Pages via [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml) (`gh-pages` branch). Finished non-debug runs upload to the Cloudflare Worker when `VITE_API_URL` is set (Pages only; localhost never writes production). Opt-out: **Settings → SHARE RUN STATS** ([docs/PRIVACY.md](./docs/PRIVACY.md)). API, schema, local Worker, owner setup and SQL: [worker/README.md](./worker/README.md). Pull for `/data`: `npm run data:pull`.

## Docs

Start with [AGENTS.md](./AGENTS.md). Code is the reference for values and shapes; these cover intent and rules:

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md), [docs/VERIFICATION.md](./docs/VERIFICATION.md)
- Gameplay: [levels](./docs/levels.md), [upgrades](./docs/upgrades.md), [upgrade list](./docs/upgrade-list.md), [pennies](./docs/pennies.md), [store](./docs/store.md), [bosses](./docs/bosses.md), [learn](./docs/learn.md), [new player](./docs/new-player.md), [maze constraints](./docs/maze-constraints.md)
- Presentation and data: [rendering](./docs/rendering.md), [run log](./docs/RUN_LOG.md), [balance bots](./docs/BALANCE_BOTS.md), [privacy](./docs/PRIVACY.md), [worker](./worker/README.md), [sim harness](./src/game/sim/README.md)
- Agent workflows: `.agents/skills/*/SKILL.md`

## Art

Art courtesy of [Pixelaholic](https://pixelaholic.itch.io/pac-man-game-art)
