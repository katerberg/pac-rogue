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
| `npm run probe`            | Scripted live check with state asserts (:5174)  |
| `npm run check:ecs`        | ECS layer boundaries (also part of `verify`)    |
| `npm run verify:precommit` | Fast gate — typecheck, lint, format, ECS, tests |
| `npm run verify`           | **Canonical gate** — precommit + build + visual |
| `npm run verify:record`    | `verify`, then record the result for ship-plan  |
| `npm run check:ship`       | Check ship-plan evidence before opening a PR    |

`npm install` points Git at `.githooks/` (`core.hooksPath`). The pre-commit hook runs `npm run verify:precommit` (no build/visual). Full `npm run verify` remains the CI and completion gate.

Humans and agents use different ports (see `scripts/ports.json` / `docs/VERIFICATION.md`) so they do not collide.

## Flags

Append query params to any local URL (`5173` / `5174` / preview ports). Invalid values are ignored. **Every flag except `play`, `sound` and `learnAll` is a debug flag and disables high-score saving for the run** — even with an invalid value (list: `HIGH_SCORE_DISABLING_FLAGS` in `src/domain/runHistory.ts`). Upgrade flag behavior: [docs/upgrades.md](./docs/upgrades.md).

| Flag                   | Values                                           | Effect                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `play`                 | `1`                                              | Skip the menu and boot straight into `PlayScene` (level 1 unless `level` is set).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `maze`                 | `maze1` \| `maze2` \ Disables high-score saving. | `mazeSmall`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Force that layout for the **first** board of this Start; omit for level-1 `mazeSmall`. Levels ≥ 2 use the procedural generator unless this override is set for the first board. See [docs/maze-constraints.md](./docs/maze-constraints.md). |
| `level`                | positive integer                                 | Start at that level index (ghost roster unlock + shared speed mul `1 + 0.05×(level−1)` for Maze-Man and ghosts); level ≥ 2 without `?maze=` starts on a generated board. Omit for level 1. Invalid → level 1. Fixed 9-level plan: values above 9 clamp to 9; `level=9` jumps straight into the boss fight. Disables high-score saving.                                                                                                                                                                                                                                                                                                              |
| `quarters`             | non-negative integer                             | Start the run with that many quarters (HUD icons). Omit for 0. Invalid → 0. Disables high-score saving.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `bonus`                | integer 0..299                                   | Start the run with that much BONUS bar charge (300 fills it and pays a Quarter). Omit for 0. Invalid → 0. Disables high-score saving. See [docs/bonus.md](./docs/bonus.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `enableUpgrade`        | upgrade id (repeatable)                          | Grants each valid id into `owned` at `PlayScene` create (order preserved; duplicates skipped). Disables high-score saving.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `disableLevelUpgrades` | `1`                                              | Debug: skip the level-1 starting upgrade and the level-clear (levels 2-8) upgrade-choice modal entirely — clears straight to the next board with no offer. Does not affect `enableUpgrade`. Using this flag disables high-score saving for the run.                                                                                                                                                                                                                                                                                                                                                                                                 |
| `infiniteLives`        | `1`                                              | Debug: getting caught still plays the death SFX and full death sequence (hold / reset / ready / resume), but never spends a life and never triggers Game Over. Using this flag disables high-score saving for the run.                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `lives`                | integer 1..99                                    | Debug: start the run with exactly that many lives (counting the one in play) instead of the normal 4; the level-1 regen top-up is skipped, but `enableUpgrade` / starting-card life grants still add on top. Also sets `maxLives` to the same value unless `maxLives` is given. Values above 99 clamp to 99; invalid → normal start. Disables high-score saving.                                                                                                                                                                                                                                                                                    |
| `maxLives`             | integer 1..99                                    | Debug: per-level life regen tops up to this many lives instead of 4 (Extra Life still raises it by its floor bonus). Defaults to `lives` when only `lives` is set. Lives above the cap (start lives, upgrade or store grants) are never removed. Values above 99 clamp to 99; invalid → normal cap. Disables high-score saving.                                                                                                                                                                                                                                                                                                                     |
| `godMode`              | `1`                                              | Debug: ghosts pass through Maze-Man harmlessly (no catch, no death sequence, no life spent). Using this flag disables high-score saving for the run.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `jumpToUpgrade`        | `1`                                              | Debug: immediately clears the first board (all pellets collected) into the level-clear upgrade-choice modal, after the 1.2 s level-end time drain. Without `?level=`, defaults the start level to 2 (the first level that offers an upgrade choice) instead of 1. Using this flag disables high-score saving for the run.                                                                                                                                                                                                                                                                                                                           |
| `store`                | `1`                                              | Debug: start in a store floor for the current level (level 3 unless `level` is set); skips the level-1 starting upgrade. Combine with `quarters`. Using this flag disables high-score saving for the run. See [docs/store.md](./docs/store.md).                                                                                                                                                                                                                                                                                                                                                                                                     |
| `ghosts`               | ghost names (comma-separated)                    | Replace the level's ghost roster with exactly these kinds on every level, e.g. `pinky` or `pinky,clyde` (`blinky` \ Disables high-score saving.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `pinky` \| `inky` \| `clyde`; unknown names skipped).                                                                                                                                                                                       |
| `bossGhosts`           | integer 2..10                                    | Debug: start the level-9 boss with that many Blinkys (up to 4 in the house, the rest out of the side tunnels right away). Invalid → the normal 2. Using this flag disables high-score saving for the run.                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `learnAll`             | `1` \| `0`                                       | Without `play=1`, either value boots straight into LEARN instead of the menu. `1`: LEARN treats every ghost and upgrade as seen. `0`: LEARN treats nothing as seen, even if real play has met some. Either way, read-only — never writes the seen record. See [docs/learn.md](./docs/learn.md).                                                                                                                                                                                                                                                                                                                                                     |
| `runLogFill`           | integer 0..600                                   | Agent ports only (ignored on 5173/4173): write that many synthetic `debug: true` runs into the run log at boot, to reach the RUN LOG FULL screen (see [docs/RUN_LOG.md](./docs/RUN_LOG.md)). Adds them on every load.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `seed`                 | 1-32 of `A-Z a-z 0-9 _ -`                        | Fixes every random roll in the run (generated boards, starting upgrade, ghost roster pick, upgrade offers, store stock, …) so the same URL replays the same run. Omit for a fresh random run. The run's seed (given or fresh) is shown faded in the bottom-left of the pause menu, Game Over and Run Complete screens. See [docs/VERIFICATION.md](./docs/VERIFICATION.md#seeded-runs). Disables high-score saving.                                                                                                                                                                                                                                  |
| `knobs`                | `1`                                              | Debug: hides the side HUD (Quarters, upgrades, lives, `Time`) and shows two scrollable tuning panels over the canvas gutters: sliders and color pickers for player/ghost speed, eat drag, timer, ghost AI, release, scatter, fruit, death, bonus streak and wall look (thickness, color, glow, corners, background). Values apply live and persist in localStorage (`pac-rogue.debug-tuning.v1`); they are ignored without this flag. **RESTART** (under the maze) starts a new run at the current level with the same seed; **RESET OPTIONS** clears every knob and restarts. Knob table: `src/domain/tuningKnobs.ts`. Disables high-score saving. |
| `sound`                | `1`                                              | On agent ports only: opt in to audio (muted by default). Human ports keep sound on.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

Upgrade ids: `powerPelletFreeze`, `passivePlayerSpeedUp`, `passiveGhostSlow`, `powerPelletScatterBurst`, `powerPelletGhostRecall`, `powerPelletWarpFarthest`, `passivePickupRange`, `passiveGhostHouseDelay`, `passiveExtraLife`, `passivePelletToPower`, `powerPelletExtraHungry`, `powerPelletWallPass`, `powerPelletSpeedBurst`, `powerPelletInvuln`, `powerPelletGhostHarvester`, `fruitPowerPellet`, `fruitQuarterBounty`, `fruitFecundity`, `fruitFeast`, `passiveDeathsHarvest`, `passiveOvercharge`, `passiveTunnelDash`, `passivePowerPelletRecharge`, `passiveRemoteTransference`, `passiveMyogenesis`, `passiveDefyDeath`, `passiveTurnTuning`, `passiveDeathsBounty`, `passiveMoneyTalks`, `passiveLazyLooper`, `passiveShieldPellets`, `passiveDeathSpecialist`, `passiveHarvestSpecialist`, `passiveSpeedSpecialist`, `passiveProtectionSpecialist`, `passiveDisruptionSpecialist`, `passiveMartyr`, `passiveInterest`, `passiveNearMiss`, `passiveHaunting`.

Every id also accepts a `Plus` suffix for its enhanced form (e.g. `?enableUpgrade=passivePlayerSpeedUpPlus`); see [docs/upgrades.md](docs/upgrades.md#enhanced-upgrades).

```text
http://127.0.0.1:5174/?play=1
http://127.0.0.1:5174/?play=1&maze=mazeSmall
http://127.0.0.1:5174/?maze=maze2
http://127.0.0.1:5174/?level=3
http://127.0.0.1:5174/?play=1&quarters=3
http://127.0.0.1:5174/?play=1&store=1&quarters=10
http://127.0.0.1:5174/?play=1&level=2&bonus=295
http://127.0.0.1:5174/?enableUpgrade=powerPelletScatterBurst
http://127.0.0.1:5174/?enableUpgrade=powerPelletGhostRecall&enableUpgrade=powerPelletWarpFarthest
http://127.0.0.1:5174/?enableUpgrade=powerPelletFreeze&enableUpgrade=passiveGhostSlow
http://127.0.0.1:5174/?play=1&disableLevelUpgrades=1
http://127.0.0.1:5174/?play=1&lives=1
http://127.0.0.1:5174/?play=1&lives=2&maxLives=6
http://127.0.0.1:5174/?play=1&infiniteLives=1
http://127.0.0.1:5174/?play=1&jumpToUpgrade=1
http://127.0.0.1:5174/?sound=1
http://127.0.0.1:5174/?play=1&knobs=1
http://127.0.0.1:5174/?play=1&ghosts=pinky
http://127.0.0.1:5174/?learnAll=1
http://127.0.0.1:5174/?play=1&level=9
http://127.0.0.1:5174/?play=1&level=9&bossGhosts=10
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
- [docs/upgrades.md](./docs/upgrades.md) — run upgrades from level clears
- [docs/levels.md](./docs/levels.md) — the fixed 9-level plan
- [docs/bonus.md](./docs/bonus.md) — the BONUS bar (pellet streaks pay Quarters)
- [docs/bosses.md](./docs/bosses.md) — boss levels (level 9: Double Blinky)
- [docs/learn.md](./docs/learn.md) — LEARN mode (meet seen ghosts / upgrades)
- [docs/line-art.md](./docs/line-art.md) — vector line-art sprites (3× render scale, SVG authoring rules)
- [docs/RUN_LOG.md](./docs/RUN_LOG.md) — always-on local run log (schema, field definitions, RUN LOG FULL purge)
- [Flags](#flags) — URL query params (`play`, `maze`, `level`, `quarters`, `bonus`, `enableUpgrade`, `disableLevelUpgrades`, `infiniteLives`, `lives`, `maxLives`, `godMode`, `jumpToUpgrade`, `ghosts`, `bossGhosts`, `knobs`, `learnAll`, `sound`, `runLogFill`)
- [docs/VERIFICATION.md](./docs/VERIFICATION.md) — how to prove work
- [.agents/skills/simplify-pr/SKILL.md](./.agents/skills/simplify-pr/SKILL.md) — `/simplify-pr` workflow
- [.agents/skills/no-comments/SKILL.md](./.agents/skills/no-comments/SKILL.md) — `/no-comments` workflow
- [.agents/skills/ship-plan/SKILL.md](./.agents/skills/ship-plan/SKILL.md) — `ship-plan`: verify, review, fix, push PR (cloud-safe)
- [.agents/skills/new-upgrade/SKILL.md](./.agents/skills/new-upgrade/SKILL.md) — `new-upgrade`: pitch → question round → every touch point → probe → PR for a new run upgrade

## Status

Boots to a `DOT-MAN` menu (Start / Learn / High Scores / Settings). Learn lets you drive the level-1 maze with one ghost you have already seen in play, with its live target reticle and predicted path drawn (see [docs/learn.md](./docs/learn.md)). Escape during play opens a pause menu (Resume, Settings, Quit with an inline Yes/No confirm), and Escape again resumes; quitting never writes a high score. Start opens level-1 `mazeSmall`, grants one random starting upgrade shown on a card that fades into play (no bonus fruit; override first board with `?maze=`; start later with `?level=`). The run is a **fixed 9-level plan** (see [docs/levels.md](./docs/levels.md)): clearing level 1 advances straight to level 2; clearing levels 2 through 8 first offers a pick-one upgrade choice, then advances to a **procedural** 28×34 maze (tiling solver → ASCII; carry lives, upgrades, lifetime Collected; Maze-Man and ghosts +5% speed per level; Time resets); level 9 is a **boss fight** (a `BOSS` title crashes in; two Blinkys that treat each other as walls, and 8 glowing pellets that each spawn another Blinky from a side tunnel — see [docs/bosses.md](./docs/bosses.md)); clearing it offers no upgrade and shows a `RUN COMPLETE` screen and returns to the menu. High Scores lists Game Over runs from localStorage (lifetime pellets desc, then remaining time desc). Menu music (`menu.ogg`) loops on the menu, Learn, High Scores, and Settings-from-menu screens; game-play music (`game-play.ogg`) loops during play, including while the pause menu is open. Settings stores music and SFX enable/volume (0–10) in localStorage (`pac-rogue.audio-settings.v1`; agent ports still mute unless `?sound=1`), and the Music slider adjusts whichever track is currently playing instead of previewing a clip. ECS Pac-Man traverses the active maze (blue pipe walls, centerline movement, sticky next-direction turns, side tunnels with wrap). From level 2+, bonus fruit spawns at board pellet thresholds but has no effect — pickup just despawns it (see [docs/upgrades.md](./docs/upgrades.md) for the level-clear upgrade modal). Three lives; mid-life reset keeps pellets; last-life Game Over writes high score. Ghosts unlock by level (level 1: Blinky only; level 2: Blinky + a randomly chosen Pinky or Inky, picked once per run; level 3+: all four); shared house spawn for present kinds; arcade-style house release after your first input (Blinky 0.1s; Pinky immediately; Inky after layout-scaled pellets on level 1 (maze1 baseline 30), immediately from level 2; Clyde after layout-scaled pellets on level 1 (baseline 60), 50 dots on level 2, immediately from level 3; after a death a shared dot counter releases Pinky/Inky/Clyde at 7/17/32 dots eaten since the death; if you stop eating for 4s (levels 1-4) or 3s (level 5+) the next waiting ghost is pushed out); Inky chase uses Blinky’s tile doubled through a 2-tile Pac look-ahead, SE scatter `(27, 33)`. Power pellets are inert unless an owned upgrade reacts; no arcade fright yet. Dev URL flags: [Flags](#flags).

## Art

Art courtesy of [Pixelaholic](https://pixelaholic.itch.io/pac-man-game-art)
