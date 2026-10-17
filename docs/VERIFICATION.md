# Verification

Verification is a hard blocker. Compiling is not enough for gameplay or visual work. UNVERIFIED IS NOT PASS. This file is the source of truth; `AGENTS.md` and the `verification` skill point here.

## Workflow

1. **Before coding:** pick the level from [What each change class requires](#what-each-change-class-requires). If the diff spans classes, use the stricter one.
2. **After coding:** run the checks for that level (always at least `npm run verify`), read failures, fix the cause, rerun until green.
3. **Gameplay / presentation / canvas:** also do the [live check](#live-check).

Never: assume visual correctness from compile, lint, tests or a green `visual` exit; claim "looks correct" without launching and reading a screenshot; claim a behavior works because a screenshot "looks like" it changed (assert it); skip, weaken, delete or `--no-verify` around a gate; probe only one mode when the diff reaches others; leave a task "done" when visual checks could not run (say so, leave it incomplete).

## Gate

`npm run verify` runs `typecheck`, `lint`, `format:check`, `check:ecs`, `check:docs` (broken doc links and a markdown size budget), `test`, `build`, then `visual` (see `package.json`). `verify:precommit` is the first six and is what `.githooks/pre-commit` runs. CI (`.github/workflows/verify.yml`) runs `verify` and posts the smoke screenshot on PRs.

`npm run visual` serves `dist/` on the agent preview port and captures the menu-to-play, upgrade-offer and fractional-scale (stray-pixel) screenshots into `artifacts/`; see `scripts/visual-smoke.mjs`. **Read the images** when claiming visual verification; a zero exit is not evidence.

## Ports

Defined in `scripts/ports.json`. Humans use 5173 (dev) / 4173 (preview); agents use `dev:agent` (5174) and `preview:agent` / `visual` (4174). Agents may kill and restart agent ports and must never bind to or kill human ports. Agent ports mute audio unless `?sound=1`.

Cloud sessions: `.claude/settings.json` runs `scripts/cloud-setup.sh` on start. The environment must allow npm, `github.com`, `raw.githubusercontent.com`, `nodejs.org` and `cdn.playwright.dev`.

## Live check

Required for gameplay and presentation changes. `npm run probe` drives the game on 5174 (started if needed) with real Playwright input and fails on page errors or `console.error`. `npm run probe -- --help` lists the step syntax; `--viewport WxH --dpr N` checks fractional or hi-DPI scales.

### Evidence rules

- **Behavior is asserted:** every claim about game state needs an `expect:` or `waitFor:` step against the game-state snapshot.
- **Visuals are inspected:** every claim about look needs a `shot:` you Read, and you say what you saw.
- **Wait on state, not time:** prefer `waitFor:<cond>` to `wait:<ms>`.
- **Record** in the PR body the exact probe commands, what they asserted and what the screenshots showed.

### Recipe

```bash
npm run probe -- --query "play=1&maze=mazeSmall&seed=recipe" --name left --steps \
  "waitFor:play.startingUpgradeCardOpen==true,press:Space,waitFor:play.startingUpgradeCardOpen==false,waitFor:play.inputSuppressed==false,hold:ArrowLeft:600,waitFor:play.player.col<10:3000,expect:play.player.facing==left,expect:play.boardCollected>0,shot:moved"
```

- Level 1 opens a starting-upgrade card that swallows the first keypress and suppresses input until keys release, so open every level-1 run as above. `level>1`, `store=1` and `jumpToUpgrade=1` skip it.
- **Always pass `seed=`** so reruns replay the same run; `play.seed` reports the seed in use for replaying a surprising run.
- Reach states with URL flags (documented on `parsePlayOptions` in `src/domain/playOptions.ts`).
- A failed step writes `artifacts/<name>-failure.json` (snapshot) and `.png`. Read both before changing code.

### Game-state snapshot

On agent ports `window.__PAC_ROGUE_DEBUG__.snapshot()` returns read-only JSON (wired in `src/game/scenes/installDebugHook.ts`). Its shape is `PlaySim.snapshot()` (the `play.*` sim fields) plus the scene-only fields in `PlayScene.debugSnapshot()` and `SettingsScene.debugSnapshot()`, with top-level `scenes`, `settings`, `highScores`, `runLog` and `sounds`. To see it, add a `dump:<name>` step to a probe. When a check needs state the snapshot lacks, add a read-only field in the same PR instead of reading pixels.

### Modes touched

A change in shared code (movement, input, render, systems) can reach every `PlayScene` path. List the modes the diff can reach and probe each; anything unprobed goes under "not checked" in the PR body.

- Level 1 board: `play=1&maze=mazeSmall`
- Pool base map (levels 2-8, same map every level for a seed): `play=1&level=2`; inverted (6-7): `level=6`; force index: `maze=0`
- Store floor: `play=1&store=1&quarters=10`
- Boss (level 9): `play=1&boss=blinkySwarm` / `boss=chainedGhosts`; stage transition: `bossStageAdvance=1`
- Level-clear upgrade modal: `play=1&jumpToUpgrade=1`
- Death / respawn: `play=1&level=2&infiniteLives=1`, then get caught
- Pause / Settings / Resume: `press:Escape`, then `click:` menu rows
- Knobs panel: `play=1&knobs=1` (DOM: `domFill:` / `domClick:` / `pageShot:`)
- `/data` page: `runLogFill=120`, then `goto:/data`; assert `data.*`
- LEARN sandbox: menu, Learn, or `learnAll=1` (snapshot has only `scenes.LearnScene`, so screenshot-only). Probe it for any change that has a main-game counterpart ([parity](./learn.md#parity))

## Seeded runs

`?seed=<1-32 of A-Za-z0-9_->` fixes every random decision (`src/domain/runRandom.ts`). Scenes draw only from named `RunRandom` streams, each independent and keyed by level where per-board, so one consumer's draws never shift another's. Not seeded: frame timing (`delta`) and `localStorage` state. ESLint bans `Math.random`, `crypto` randomness, Phaser's RNG and camera `shake` outside `runRandom.ts`; new randomness adds a `RandomStream` name.

## Scene and render logic

Simulation runs in headless sims (`src/game/sim/`); scenes, modals and the `render.ts` / `playerInput.ts` bridges are adapters with no unit tests, and shipped bugs have lived there.

- A **decision** (condition, gate, threshold, selection, state transition) belongs in the sim, a Phaser-free system or `src/domain/**`, never inline in a scene or bridge. If you touch one in a scene, move it out and leave the call.
- Add a unit test that fails without the change; for a bug fix, confirm it fails against the old logic and say so in the PR.
- Only the decision you touch; no neighboring refactors.
- Exempt: pure wiring and presentation plumbing (GameObjects, tweens, depths, text layout, colour/size constants) and one-line pass-throughs to tested functions.

The probe still covers that the scene calls the decision in every mode touched.

## Sim integration tests

Every gameplay feature or bug fix adds or extends a `PlaySim` test in `src/game/sim/playSim.test.ts`; for a bug fix it fails before the fix. Helpers and the event list are in [src/game/sim/README.md](../src/game/sim/README.md). The live check is still required for presentation.

`src/game/sim/registrySync.test.ts` requires every `BaseUpgradeId` to appear in `playSim.test.ts`. `KNOWN_UNTESTED_UPGRADES` only shrinks; a new upgrade ships with a sim test.

## What each change class requires

- **Tooling / docs / pure domain logic:** `npm run verify`.
- **Phaser presentation / gameplay:** `verify` + [live check](#live-check) (every mode touched).
- **Decision logic in a scene / `render.ts`:** the above + the decision moved to a tested pure function.
- **Gameplay rule / flow (sim, systems):** the above + a new or extended `PlaySim` test.
- **Boot / canvas path:** `verify` + read `artifacts/visual-smoke.png`.
