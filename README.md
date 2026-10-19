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

<!-- prettier-ignore -->
| Flag | Values | Effect |
| --- | --- | --- |
| `play` | `1` | Skip the menu and boot straight into `PlayScene` (level 1 unless `level` is set). |
| `maze` | `maze1` \| `maze2` \| `mazeSmall` \| non-negative pool index | Force that layout for the **first** board of this Start; omit for level-1 `mazeSmall`. Levels 2–8 otherwise draw one map from the committed pool (`?maze=<n>` forces pool index `n`). See [docs/maze-constraints.md](./docs/maze-constraints.md). Disables high-score saving. |
| `level` | positive integer | Start at that level index (ghost roster unlock + shared speed mul `1 + 0.05×(level−1)` for Maze-Man and ghosts); levels 2–8 without `?maze=` draw one map from the committed pool. Omit for level 1. Invalid → level 1. Fixed 9-level plan: values above 9 clamp to 9; `level=9` jumps straight into the boss fight. Disables high-score saving. |
| `quarters` | non-negative integer | Start the run with that many quarters (HUD icons). Omit for 0. Invalid → 0. Disables high-score saving. |
| `bonus` | integer 0..299 | Start the run with that much BONUS bar charge (300 fills it and pays a Quarter). Omit for 0. Invalid → 0. Disables high-score saving. See [docs/bonus.md](./docs/bonus.md). |
| `jumpToSpinner` | `1` | Debug: start on level 2 (unless `level` is set) with one BONUS slot spin queued, so it plays as soon as the board starts. Pair with `slot` to force the outcome. Disables high-score saving. |
| `slot` | `0` or e.g. `1q`, `2q1u`, `1l` | Debug: every BONUS slot spin shows that many Quarter (`q`), upgrade (`u`) and life (`l`) lines (5 lines max) instead of rolling. Disables high-score saving. See [docs/bonus.md](./docs/bonus.md#slot-machine). |
| `slotMachine` | `1` | Debug: place one slot-machine world pickup on each eligible Play board start. Disables high-score saving. See [docs/bonus.md](./docs/bonus.md#slot-machine). |
| `enableUpgrade` (alias `enableUpgrades`) | upgrade id; repeatable or comma-separated | Grants each valid id into `owned` at `PlayScene` create (order preserved; duplicates skipped). Disables high-score saving. |
| `disableLevelUpgrades` | `1` | Debug: skip the level-1 starting upgrade and the level-clear (levels 1-8) upgrade-choice modal entirely — clears straight to the next board with no offer. Does not affect `enableUpgrade`. Using this flag disables high-score saving for the run. |
| `infiniteLives` | `1` | Debug: getting caught still plays the death SFX and full death sequence (hold / reset / ready / resume), but never spends a life and never triggers Game Over. Using this flag disables high-score saving for the run. |
| `lives` | integer 1..99 | Debug: start the run with exactly that many lives (counting the one in play) instead of the normal 4; `enableUpgrade` / starting-card life grants still add on top. Also sets `maxLives` to the same value unless `maxLives` is given. Values above 99 clamp to 99; invalid → normal start. Disables high-score saving. |
| `maxLives` | integer 1..99 | Debug: the store's free centre life (and Myogenesis level-clear regen) tops up to this many lives instead of 4 (Extra Life still raises it by its floor bonus). Defaults to `lives` when only `lives` is set. Lives above the cap (start lives, upgrade or store grants) are never removed. Values above 99 clamp to 99; invalid → normal cap. Disables high-score saving. |
| `godMode` | `1` | Debug: ghosts pass through Maze-Man harmlessly (no catch, no death sequence, no life spent). Using this flag disables high-score saving for the run. |
| `jumpToUpgrade` | `1` | Debug: immediately clears the first board (all pellets collected) into the level-clear upgrade-choice modal, after the 1.2 s level-end time drain. Without `?level=`, defaults the start level to 2 (skips the level-1 starting card) instead of 1. Using this flag disables high-score saving for the run. |
| `store` | `1` | Debug: start in a store floor for the current level (level 3 unless `level` is set); skips the level-1 starting upgrade. Combine with `quarters`. Using this flag disables high-score saving for the run. See [docs/store.md](./docs/store.md). |
| `forceUpgrade` | upgrade id | Debug: guarantees that upgrade (an enhanced id is treated as its base) appears in every level-clear upgrade-choice offer while it is still eligible. Pair with `jumpToUpgrade`. Using this flag disables high-score saving for the run. |
| `ghosts` | ghost names (comma-separated) | Replace the level's ghost roster with exactly these kinds on every level, e.g. `pinky` or `pinky,clyde` (`blinky` \ Disables high-score saving. | `pinky` \| `inky` \| `clyde` \| `spunky` \| `wardy`; unknown names skipped). |
| `roster` | `0` … `5` | Force one of the six ghost rosters for the whole run instead of rolling it from the seed (see [docs/levels.md](./docs/levels.md#ghost-roster)). Disables high-score saving. |
| `boss` | `blinkySwarm` \| `chainedGhosts` | Debug: use that boss on the level-9 boss fight instead of the random pick (see [docs/bosses.md](./docs/bosses.md)). Without `level`, the run starts straight in the boss fight. Invalid → random pick. Disables high-score saving. The Blinky Swarm start count is the **Swarm start Blinkys** knob (`knobs=1`). |
| `bossStageAdvance` | `1` | Debug: on a boss board, start the stage-1→2 transition choreography as soon as the board is ready (fade / maze flicker / refill / inverted walls). Works with `boss=…` or `level=9` alone (random boss). When both `store` and `bossStageAdvance` are set, stage advance wins and the store is skipped. See [docs/bosses.md](./docs/bosses.md). Disables high-score saving. |
| `learnAll` | `1` \| `0` | Without `play=1`, either value boots straight into LEARN instead of the menu. All six ghosts are always shown. `1`: LEARN lists every upgrade. `0`: LEARN lists no upgrades, even if real play has met some. Either way, read-only — never writes the seen record. See [docs/learn.md](./docs/learn.md). |
| `runLogFill` | integer 0..600 | Agent ports only (ignored on 5173/4173): write that many varied synthetic `debug: true` runs into the run log at boot, for the automatic pruning and the `/data` page (see [docs/RUN_LOG.md](./docs/RUN_LOG.md)). Adds them on every load. |
| `seed` | 1-32 of `A-Z a-z 0-9 _ -` | Fixes every random roll in the run (generated boards, starting upgrade, ghost roster pick, upgrade offers, store stock, …) so the same URL replays the same run. Omit for a fresh random run. The run's seed (given or fresh) is shown faded in the bottom-left of the pause menu, Game Over and Run Complete screens. See [docs/VERIFICATION.md](./docs/VERIFICATION.md#seeded-runs). Disables high-score saving. |
| `levelModifiers` | `0` | Opt out of level modifiers (the inverted maze on levels 6-7, the speed lanes on levels 4-8, the collapsed tunnels on levels 4-8 and the lava on level 8; future modifiers join them). Modifiers are on by default; any value but `0` keeps them. Disables high-score saving when set to `0`. See [docs/levels.md](./docs/levels.md). |
| `knobs` | `1` | Debug: hides the side HUD (upgrades, lives, `Time`) and shows two scrollable tuning panels over the canvas gutters. Left gutter: gameplay groups (Movement through Scatter), collapsible and collapsed by default. Right gutter: **Visuals** only, open by default, nesting Walls / Dot-Man / Background (subgroups start open). Sliders and color pickers cover player/ghost speed, eat drag, timer, ghost AI, release, scatter, fruit, death, bonus streak, boss, and visuals. Quarter icons stay visible (shifted into the maze column clear of the gutter panels). Values apply live and persist in localStorage (`pac-rogue.debug-tuning.v1`); they are ignored without this flag. **RESTART** (under the maze) starts a new run at the current level with the same seed; **RESET OPTIONS** clears every knob and restarts. Knob table: `src/domain/tuningKnobs.ts`. Disables high-score saving. |
| `customMaze` | `1` | Local testing: before boot, shows a text box pre-filled with the last pasted maze (or a generated one) to paste ASCII in the maze-file syntax; the pasted board is the first board of the run (a bad paste falls back to `maze2` with a console warning). Persists in localStorage (`pac-rogue.custom-maze.v1`). Disables high-score saving. |
| `sound` | `1` | On agent ports only: opt in to audio (muted by default). Human ports keep sound on. |

Every upgrade id (`ALL_UPGRADE_IDS`, see [docs/upgrades.md](./docs/upgrades.md#upgrade-table)) is accepted by `enableUpgrade` / `forceUpgrade`, and every id also accepts a `Plus` suffix for its enhanced form (e.g. `?enableUpgrade=passiveAfterburnerPlus`).

```text
http://127.0.0.1:5174/?play=1&level=2&seed=demo&enableUpgrade=powerPelletFreeze
http://127.0.0.1:5174/?play=1&store=1&quarters=10
http://127.0.0.1:5174/?play=1&boss=blinkySwarm&bossStageAdvance=1
```

## Deploy (GitHub Pages)

Live game: [https://katerberg.github.io/pac-rogue/](https://katerberg.github.io/pac-rogue/)

Pushes to `main` run [`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml): production `npm run build`, then publish `dist/` (plus `.nojekyll`) to the `gh-pages` branch via JamesIves.

GitHub Pages must use source **branch `gh-pages` / folder `/`** (not `main`). After the first successful deploy, set that in the repo’s Pages settings if it is not already.

## Global runs and high scores

Finished, non-debug runs are uploaded to a Cloudflare Worker (`worker/`, name `dot-man-api`) backed by D1, so `/data` can show runs from every player and **High Scores → GLOBAL** shows the best run of every player. Players can opt out in **Settings → SHARE RUN STATS**; see [docs/PRIVACY.md](./docs/PRIVACY.md). API, schema and SQL recipes: [worker/README.md](./worker/README.md). Nothing is sent unless the build has `VITE_API_URL`, which only the Pages deploy sets (dev, preview, CI and probes never do); a page on `localhost` also refuses any non-local API URL, so automation can never write to the real database.

**One-time setup (owner):**

1. Cloudflare account (free, no card), with a `workers.dev` subdomain.
2. D1 database `dot-man-api` (its id is committed in `worker/wrangler.toml`).
3. API token: **My Profile → API Tokens → Create Token → "Edit Cloudflare Workers"**, plus **Account → D1 → Edit**, scoped to your account.
4. GitHub **Settings → Environments → New environment** `production`, deployment branches limited to `main`, with environment secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Do not add them as plain repository secrets: any branch could read those.
5. Merge to `main` (or run **Actions → Worker deploy → Run workflow**): it applies the D1 migrations and deploys the Worker.
6. Add the Worker secret `IP_HASH_KEY` (a long random value; dashboard **Workers & Pages → dot-man-api → Settings → Variables and Secrets**). Until then uploads get 503 and retry later.
7. Repository **variable** `API_URL` = `https://dot-man-api.<subdomain>.workers.dev` (no trailing slash), then **Actions → GitHub Pages deploy → Run workflow**.
8. Check: play a run to Game Over on the live site and look for `POST …/runs → 201` in DevTools.

**Reading the data:** run `npx wrangler login` once, then `npm run data:pull`, start `npm run dev`, open `/data` and click **GLOBAL (PULLED)** (or **LOAD FILE…** for any export).

**Local development:** see [worker/README.md](./worker/README.md#local). Worker ports: humans 8787, agents 8788.

## Docs

Start with [AGENTS.md](./AGENTS.md). Code is the reference for values and shapes; these cover intent and rules:

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md), [docs/VERIFICATION.md](./docs/VERIFICATION.md)
- Gameplay: [levels](./docs/levels.md), [upgrades](./docs/upgrades.md), [bonus](./docs/bonus.md), [store](./docs/store.md), [bosses](./docs/bosses.md), [learn](./docs/learn.md), [maze constraints](./docs/maze-constraints.md)
- Presentation and data: [rendering, fonts, render scale](./docs/rendering.md), [run log and `/data`](./docs/RUN_LOG.md), [balance bots](./docs/BALANCE_BOTS.md), [privacy](./docs/PRIVACY.md), [worker](./worker/README.md), [sim harness](./src/game/sim/README.md)
- Agent workflows: `.agents/skills/*/SKILL.md`

## Art

Art courtesy of [Pixelaholic](https://pixelaholic.itch.io/pac-man-game-art)
