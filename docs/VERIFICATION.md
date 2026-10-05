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

In addition to the automated gate, do a [live check](#live-check): launch the game, drive the changed behavior, **assert** the resulting game state, **look at** the screenshots, and record what you checked and saw.

### Never

- Assume visual correctness from compile, lint, unit tests, or a green `visual` script exit alone.
- Declare unverified work done.
- Skip, weaken, delete, or `--no-verify` around the gate to make a task “pass.”
- Claim “looks correct” without launching and inspecting.
- Claim a behavior works because a screenshot "looks like" it moved or changed: assert it with `expect:` / `waitFor:`.
- Probe only the mode you changed when the diff reaches others (see [Modes touched](#modes-touched)).

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

`.claude/settings.json` runs `scripts/cloud-setup.sh` on session start. It does nothing locally and is a fast no-op when the environment's own setup script (`nvm install 24 && npm ci && npx playwright install --with-deps chromium`) already ran; otherwise it performs the same setup (see the script). The cloud environment must allow network access to the npm registry, `github.com`, `raw.githubusercontent.com` (nvm), `nodejs.org`, and `cdn.playwright.dev`.

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

## Live check

Required for gameplay and presentation changes. `npm run probe` is the default tool everywhere, including cloud sessions with no browser pane. It drives the game on the agent dev port (**5174**, started automatically if nothing is listening) with real Playwright keyboard/mouse input. It fails on page errors or `console.error`. Run `npm run probe -- --help` for the full step syntax.

### Evidence rules

- **Behavior is asserted, not eyeballed.** Every claim about game state (the player moved, a ghost left the house, a life was spent, the store opened, a count changed) needs an `expect:` or `waitFor:` step. "The screenshot shows the player moved" does not count.
- **Visuals are inspected.** Anything about how something looks (color, tint, fade, layout, text) needs a `shot:` that you then **Read**. Say what you saw.
- **Wait on state, not time.** Use `waitFor:<cond>` instead of guessed `wait:<ms>` whenever a state change marks the moment (scene up, card closed, ghost released). Keep `wait:`/`hold:` only for "let time pass" and for key holds.
- **Record** in the PR body the exact probe command(s) you ran, what they asserted, and what the screenshots showed.

### Recipe

```bash
npm run probe -- --query "play=1&maze=mazeSmall&seed=recipe" --name left --steps \
  "waitFor:play.startingUpgradeCardOpen==true,press:Space,waitFor:play.startingUpgradeCardOpen==false,waitFor:play.inputSuppressed==false,hold:ArrowLeft:600,waitFor:play.player.col<10:3000,expect:play.player.facing==left,expect:play.boardCollected>0,shot:moved"
```

Level 1 opens a **starting-upgrade card** that swallows the first keypress. After it closes, input is suppressed until every key is released. So always open a level-1 run with `waitFor:play.startingUpgradeCardOpen==true,press:Space,waitFor:play.startingUpgradeCardOpen==false,waitFor:play.inputSuppressed==false`. Levels other than 1, `store=1` and `jumpToUpgrade=1` skip the card.

Without `seed=`, every run rolls fresh randomness: generated boards (levels 2+), the starting upgrade, the second ghost, upgrade offers, Store stock and more. **Pass `seed=<anything>` on every probe** so reruns see the same run (see [Seeded runs](#seeded-runs)). `maze=maze1|maze2|mazeSmall` additionally pins a hand-made layout for the first board. `play.seed` reports the seed in use, including the fresh one an unseeded run picked (players see it faded bottom-left on the pause, Game Over and Run Complete screens), so a flaky or surprising run can be replayed with `seed=<play.seed>`.

Use URL flags from the README to reach the state under test (`level`, `maze`, `quarters`, `store`, `enableUpgrade`, `ghosts`, `bossGhosts`, `infiniteLives`, `lives`, `maxLives`, `godMode`). On any failed step the probe writes `artifacts/<name>-failure.json` (snapshot) and `artifacts/<name>-failure.png`. Read both before changing code.

### Modes touched

`PlayScene` runs separate paths, and a change in shared code (movement, input, render, systems) can reach all of them. Before the live check, list which of these the diff can reach, and probe each one. Anything left unprobed goes under "not checked" in the PR body.

| Mode                         | How to reach it                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Level 1 board (fixed layout) | `play=1&maze=mazeSmall` (starting-upgrade card)                                                                                 |
| Generated board (levels 2–8) | `play=1&level=2`                                                                                                                |
| Inverted board (levels 6–7)  | `play=1&level=6`                                                                                                                |
| Store floor (`tickStore`)    | `play=1&store=1&quarters=10`                                                                                                    |
| Boss (`tickBoss`, level 9)   | `play=1&level=9` (`bossGhosts=N` for more Blinkys)                                                                              |
| Level-clear upgrade modal    | `play=1&jumpToUpgrade=1`                                                                                                        |
| Death / respawn              | `play=1&level=2&infiniteLives=1`, then get caught                                                                               |
| Pause → Settings → Resume    | `press:Escape`, then `click:` menu rows                                                                                         |
| Knobs panel (`?knobs=1`)     | `play=1&knobs=1` (DOM panels: drive with `domFill:` / `domClick:`, capture with `pageShot:`)                                    |
| LEARN sandbox (`LearnScene`) | menu → Learn (own copy of several systems; snapshot has only `scenes.LearnScene`, so LEARN behavior is screenshot-only for now) |

### Game-state snapshot

On agent ports only (**5174** / **4174**), `window.__PAC_ROGUE_DEBUG__.snapshot()` returns read-only JSON. It is wired in `src/game/scenes/installDebugHook.ts` from `PlayScene.debugSnapshot()`, which merges `PlaySim.snapshot()` (the same object sim tests assert on) with the scene-only UI fields. Human ports and the deployed site do not expose it. Use `dump:<label>` to see a full example.

| Path                                                                                                                                                                                                       | Meaning                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scenes.<Key>`                                                                                                                                                                                             | `running` \| `paused` \| `sleeping`; absent when stopped                                                                                                                                                                                                                                                |
| `play`                                                                                                                                                                                                     | `null` unless `PlayScene` is running or paused                                                                                                                                                                                                                                                          |
| `play.knobs`, `play.tuning.<key>`                                                                                                                                                                          | `?knobs=1` on; effective tuning values (`play.tuning.timerMax`, `play.tuning.playerSpeedTiles`, …; defaults without the flag)                                                                                                                                                                           |
| `play.seed`                                                                                                                                                                                                | the run's seed (from `?seed=`, or freshly rolled)                                                                                                                                                                                                                                                       |
| `play.level`, `play.layout`                                                                                                                                                                                | level index; layout id (`mazeSmall`, `maze1`, `generated`, `store`, …)                                                                                                                                                                                                                                  |
| `play.lives`, `play.quarters`, `play.timeRemaining`                                                                                                                                                        | HUD values                                                                                                                                                                                                                                                                                              |
| `play.bonus.{charge,streak,max,draining}`                                                                                                                                                                  | BONUS bar charge, pellet streak, bar size, level-end time drain running ([docs/bonus.md](./bonus.md))                                                                                                                                                                                                   |
| `play.deathsThisBoard`                                                                                                                                                                                     | catches this board (Death's Bounty decay)                                                                                                                                                                                                                                                               |
| `play.hauntedGhost`                                                                                                                                                                                        | name of the ghost Haunting holds in the house, or `null`                                                                                                                                                                                                                                                |
| `play.nearMissesPaid`                                                                                                                                                                                      | Near Miss passes paid this board                                                                                                                                                                                                                                                                        |
| `play.boardCollected`, `play.pelletsRemaining`                                                                                                                                                             | pellet progress                                                                                                                                                                                                                                                                                         |
| `play.pellets`, `play.powerPellets`, `play.bossPellets`, `play.optionalPellets`, `play.fruit`                                                                                                              | entities currently on the board (`pellets` excludes power pellets, includes boss pellets and the Lazy Looper `optionalPellets` a clear does not need)                                                                                                                                                   |
| `play.player.{x,y,col,row,facing}`                                                                                                                                                                         | player position (px + maze cell) and facing (`left`, `upLeft`, `none`, …)                                                                                                                                                                                                                               |
| `play.ghosts.<i>.{eid,kind,phase,col,row,x,y,facing,boss}`                                                                                                                                                 | each ghost; `phase` is `inHouse` \| `leaving` \| `active`                                                                                                                                                                                                                                               |
| `play.ghostMode`                                                                                                                                                                                           | `scatter` \| `chase`                                                                                                                                                                                                                                                                                    |
| `play.upgrades`, `play.effectiveUpgrades`, `play.timers.{freezeMs,wallPassMs,invulnMs,speedBurstMs,ghostHarvestMs,defyDeathMs,hauntMs,shieldsBanked,turnBoostMs,turnFlashMs,warpGlideMs,ghostWarpGlideMs}` | owned upgrade ids; effective ids after School Specialists; active power-pellet timers (`hauntMs`: Haunting cage left, `-1` for rest of level; `shieldsBanked`: Shield Pellets bank; `warpGlideMs`: Warp Farthest glide left, controls held; `ghostWarpGlideMs`: longest Scatter Burst ghost glide left) |
| `play.startingUpgradeCardOpen`, `play.inputSuppressed`                                                                                                                                                     | level-1 card up; player input held until all keys release                                                                                                                                                                                                                                               |
| `play.upgradeModalOpen`, `play.levelTransition`, `play.dying`, `play.reviveProgress`, `play.moneyTalksElapsedMs`                                                                                           | blocking states (the sim is frozen in each)                                                                                                                                                                                                                                                             |
| `play.shieldCrackProgress`                                                                                                                                                                                 | Shield Pellets break animation, 0 to 1 (`null` when idle; play keeps running)                                                                                                                                                                                                                           |
| `play.interestPop`                                                                                                                                                                                         | Interest store-entry pop-in: `{ count, shown }` coins paid and revealed in the HUD so far (`null` when idle; the store keeps running)                                                                                                                                                                   |
| `play.runComplete`, `play.runEndMenuArmed`, `play.runEndMenu.{open,selected}`                                                                                                                              | Run Complete screen up; its `NEW GAME` / `MENU` choice accepts input; selected row (`newGame` / `menu`, `null` until armed)                                                                                                                                                                             |
| `play.upgradeOffer`                                                                                                                                                                                        | upgrade ids offered by the open level-clear modal, else `null`                                                                                                                                                                                                                                          |
| `play.highScoresDisabled`                                                                                                                                                                                  | a debug flag is in the URL, so Game Over and Run Complete will not save a high score                                                                                                                                                                                                                    |
| `play.lineArtGhosts`                                                                                                                                                                                       | ghost kinds drawn as vector line art this board (`["clyde"]` on levels 5–8 when Clyde is present, else `[]`; [docs/line-art.md](./line-art.md))                                                                                                                                                         |
| `play.inStore`, `play.boss.ghostCount`                                                                                                                                                                     | store floor; boss Blinky count (`play.boss` is `null` off-boss)                                                                                                                                                                                                                                         |
| `play.storePrompt`                                                                                                                                                                                         | Open store prompt kind (`confirm`, `needQuarters`, `nothingToSwap`, `nothingToEnhance`), else `null`                                                                                                                                                                                                    |
| `play.storeRoute`                                                                                                                                                                                          | Store click-to-exit target cell `{col,row}` while Pac-Man walks to a clicked tunnel, else `null`                                                                                                                                                                                                        |
| `play.cursor`                                                                                                                                                                                              | Canvas CSS cursor (`default`, `pointer` over a store tile or tunnel mouth)                                                                                                                                                                                                                              |
| `play.storeStock`                                                                                                                                                                                          | Unsold store tiles in slot order (upgrade id, `swap:<outgoing id>`, `enhance:<target id>`, `life`), else `null`                                                                                                                                                                                         |

When a check needs state the snapshot lacks, add the field (read-only) in the same PR instead of falling back to reading pixels.

### Seeded runs

`?seed=<1-32 of A-Z a-z 0-9 _ ->` fixes **every** random decision in a run (`src/domain/runRandom.ts`). `PlayScene` and `LearnScene` draw only from named streams of one `RunRandom`: `secondGhost`, `midStore`, `startingUpgrade`, `upgradeOffer`, `upgradeFx`, `storeStock`, `storePurchase`, `pelletToPower`, `fruitPowerConvert`, `bossScatter` and `bossShake`. Generated boards come from the seed through `boardMazeSeed`. Per-board streams are keyed by level, and each stream is independent. So how much one consumer draws (store purchases, modal effects) never shifts another, and level N's draws never depend on earlier levels' draws. The results can still depend on player choices (an offer only picks from upgrades you don't own).

Not covered by the seed (not randomness): real frame timing (`delta`), which moves ghosts and timers by wall-clock time, and `localStorage` state (settings, the LEARN seen record, high scores).

ESLint bans `Math.random`, `crypto.getRandomValues` / `randomUUID`, Phaser's RNG and array randomizers, and Phaser camera `shake` (it calls `Math.random` internally) everywhere in `src/` except `runRandom.ts`. **New randomness must add a `RandomStream` name and draw from it**, never bypass the rule.

## Scene and render logic

The game's simulation runs in headless sims (`src/game/sim/`: `PlaySim`, `LearnSim`); `PlayScene` / `LearnScene` are adapters. The scenes, modals/overlays and the `render.ts` / `playerInput.ts` bridges still have no unit tests, and shipped bugs have lived in that kind of code: #116 (Store diagonal gating) and #114 (the wall-colour redraw check in `render.ts`). Apply this rule:

- **When a fix or feature changes a decision** (a condition, gate, threshold, selection or state transition that decides what happens or what gets drawn), it belongs in the sim, a Phaser-free system or `src/domain/**` — never inline in a scene or bridge. If you find one in a scene or `render.ts`, move it out and leave only the call.
- **Add a unit test that fails without the change.** For a bug fix, check it fails against the old logic before applying the fix, and say so in the PR.
- **Only the decision you touch.** Don't refactor neighbouring scene code in the same PR (AGENTS.md: keep changes focused).
- **Exempt:** pure wiring and presentation plumbing (creating GameObjects, tweens, depths, text layout, colour and size constants) and one-line pass-throughs to an already-tested function.

The live check still applies: the unit test covers the decision, and the probe covers that the scene calls it in every mode touched.

## Sim integration tests

`PlaySim` runs a whole game headlessly, so gameplay flows are tested in `npm run test` without a browser. **Every gameplay feature or bug fix adds or extends a `PlaySim` test** (`src/game/sim/playSim.test.ts`); for a bug fix, the test fails before the fix.

- Build a sim with `new PlaySim({ ...defaultPlayOptions(), ...overrides }, "<seed>")`, then `sim.start()`. `overrides` are the same knobs as the URL flags (`level`, `maze`, `store`, `quarters`, `jumpToUpgrade`, `bossGhosts`, `enableUpgrades`, …).
- Drive it with `runFrames(sim, n, { keys: held("left") })` / `runUntil(sim, () => cond, maxFrames)` from `src/game/sim/simTesting.ts`. They step at a fixed `1000/60` ms, so runs are exact and repeatable.
- Assert on `sim.snapshot()` (the same fields as the probe's `play.*`) and on the returned `SimEvent`s (`{ type: "sfx", id: "death" }`, `saveRun`, `upgradeOffer`, …). Set up hard-to-reach states by editing components directly (e.g. teleport the player onto a boss pellet via `Position`).
- Upgrade offers: `sim.offer()` / `sim.chooseUpgrade(option)`. Store prompts: pass `storeToggle` / `storeConfirm` in the input.
- Details and the event list: [src/game/sim/README.md](../src/game/sim/README.md).

The live check is still required for presentation (sounds, drawing, HUD, UI), which the sim only describes through events.

## What each change class requires

| Change type                             | Verification level                          | Minimum bar                                                                                                       |
| --------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Tooling / docs / pure domain logic      | `verify`                                    | `npm run verify`                                                                                                  |
| Phaser presentation / gameplay          | `verify` + live check                       | `npm run verify` **and** [live check](#live-check) (asserted probe + read screenshots, every mode touched)        |
| Decision logic in a scene / `render.ts` | `verify` + live check + extracted unit test | as above **and** the decision moved to a pure tested function ([Scene and render logic](#scene-and-render-logic)) |
| Gameplay rule / flow (sim, systems)     | `verify` + live check + sim test            | as above **and** a new or extended `PlaySim` test ([Sim integration tests](#sim-integration-tests))               |
| Anything touching boot/canvas path      | `verify` + inspect smoke screenshot         | Confirm `artifacts/visual-smoke.png`                                                                              |

Choose the level **before** coding. If the change spans classes, use the stricter level.

## Agent rules

- Read this file and `docs/ARCHITECTURE.md` before substantial changes.
- This file is the source of truth. `AGENTS.md` and `.agents/skills/verification/SKILL.md` point here instead of restating it.
- Determine verification level before implementation; run → inspect → fix → rerun after.
- Gameplay changes must keep `check:ecs` green and still require a [live check](#live-check) on **5174**.
- Use agent ports only; leave human ports alone.
- If verification fails, fix it — do not redefine success.
- If you cannot run visual checks in the environment, say so explicitly and leave the task incomplete.
- UNVERIFIED IS NOT PASS.
