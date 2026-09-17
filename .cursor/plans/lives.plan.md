# Lives + life-loss respawn

## Goal

Ship a 3-life run: ghost contact spends a life with the existing death SFX and a freezeframe, then (while lives remain) resets actors without restoring pellets, ready-pauses 1s, and waits for player direction like a fresh start. Spending the last life uses a longer hold, fades to a Game Over screen that shows the collected count, then returns to the menu.

## Locked decisions

| ID  | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Source                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| 1   | Final life: hold for death-SFX length → fade → **GAME OVER** text + collected count → then `MenuScene` (no score write).                                                                                                                                                                                                                                                                                                                                                                                                              | user                   |
| 2   | Non-final and final pre-fade hold duration = controllable knob `DEATH_HOLD_MS`, default **845** (measured `public/sound/death.ogg` ≈ 844.65ms). Replace today’s hard-coded use of `DEATH_FADE_START_MS` as the hold. Keep `DEATH_FADE_DURATION_MS = 500` for the fade into Game Over.                                                                                                                                                                                                                                                 | user                   |
| 3   | Lives HUD = **remaining Pac-Man icons**, bottom-left of the playfield (reuse existing player art / closed-mouth frame). Icon count = current `lives` (3 at start).                                                                                                                                                                                                                                                                                                                                                                    | user                   |
| 4   | After ready pause, resume pipeline with cleared input; **wait for player direction** before run/release clocks start (same as level start).                                                                                                                                                                                                                                                                                                                                                                                           | user                   |
| 5   | On life-loss reset: **despawn fruit** (clear fruit entities + clear active fruit presence; do **not** rewind `nextThresholdIndex`).                                                                                                                                                                                                                                                                                                                                                                                                   | user                   |
| 6   | On life-loss reset: **clear** `freezeRemainingMs` and `scatterBurstRemainingMs`; keep `owned` upgrades.                                                                                                                                                                                                                                                                                                                                                                                                                               | user                   |
| 7   | Dossier after-life release is a **global pellet counter** (Pinky 7 / Inky 17 / Clyde 32) plus inactivity force-out — not a clean map onto our Blinky/Pinky **time** delays, Clyde **absolute** pellet threshold, and missing Inky. **Lock fallback:** after life loss, fresh `GhostReleaseClock`; Blinky/Pinky keep existing delays; Clyde ignores absolute pellets and uses new knob `CLYDE_POST_LIFE_RELEASE_DELAY_MS = 9000` until the next `PlayScene` create. First life of a run still uses today’s pellet threshold for Clyde. | user + research        |
| A   | `START_LIVES = 3`; decrement by 1 at catch when `lives > 0` before decrement… actually: at catch, if `lives > 1` after decrement path: `lives -= 1` then respawn sequence; if `lives === 1` at catch, set `lives = 0` and enter Game Over sequence. Non-final never opens the menu.                                                                                                                                                                                                                                                   | default (approve skip) |
| B   | No pellet/power-pellet restore; `pelletProgress` unchanged across life loss.                                                                                                                                                                                                                                                                                                                                                                                                                                                          | default                |
| C   | Death SFX = existing `death` one-shot; siren stops on catch; restart siren when ready pause ends (as play becomes interactive again).                                                                                                                                                                                                                                                                                                                                                                                                 | default                |
| D   | No black fade on **non-final** deaths. Fade only on final-life → Game Over path.                                                                                                                                                                                                                                                                                                                                                                                                                                                      | default (updated by 1) |
| E   | Ready pause = `READY_PAUSE_MS = 1000` after actors snap back; full freeze (no sim).                                                                                                                                                                                                                                                                                                                                                                                                                                                   | default                |
| F   | Life-loss reset: player → `playerSpawnCenter`, clear velocity/input/facing; all ghosts → `ghostHouseSpawnCenter`, `inHouse`, speed 0, clear AI decision tiles; reset `GhostReleaseClock` + `GhostModeClock` to create/inactive defaults (waves restart on next first exit). All ghosts in house (product pitch; not arcade Blinky-outside).                                                                                                                                                                                           | default                |
| G   | Keep `RunClock.remaining` (+ carry), `pelletProgress`, `runUpgrades.owned`, maze/layout across life loss.                                                                                                                                                                                                                                                                                                                                                                                                                             | default                |
| H   | Domain-first death/life sequence state machine (extend `deathSequence.ts` or split companion) unit-tested without Phaser; `PlayScene` applies world resets, HUD icons, Game Over text, scene transition.                                                                                                                                                                                                                                                                                                                              | default                |
| I   | Docs same PR: `docs/ARCHITECTURE.md` (flow + catch bullet) + README Status (contact no longer always → menu).                                                                                                                                                                                                                                                                                                                                                                                                                         | default                |
| J   | Unit tests for sequence phases/timings/lives branch + Clyde post-life time release; `npm run verify`; live visual on agent port.                                                                                                                                                                                                                                                                                                                                                                                                      | default                |
| K   | Out of scope: score extra lives, continue screen, fright/Inky, URL life count, dossier global-dot counter, new art beyond existing Pac frames for icons.                                                                                                                                                                                                                                                                                                                                                                              | default                |
| L   | Verification level: gameplay + presentation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | default                |
| M   | Late: `/simplify-pr` then `/no-comments` on scoped diff.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | default                |
| N   | Game Over hold on screen: `GAME_OVER_HOLD_MS = 2000` after fade completes, then `scene.start("MenuScene")`. Copy: title `GAME OVER`; second line `Collected: ${collectedCount}` using existing pixel font helpers.                                                                                                                                                                                                                                                                                                                    | default (needed by 1)  |
| O   | `afterLifeRelease` flag: `false` on `PlayScene.create`; set `true` on every life-loss reset; while true, `shouldReleaseKind` (or successor) treats Clyde as time-gated via `CLYDE_POST_LIFE_RELEASE_DELAY_MS`.                                                                                                                                                                                                                                                                                                                        | default (from 7)       |

## Today’s world (brief)

- Catch → stop siren → play `death` → `beginDeathSequence` → pipeline halted → at 500ms start 500ms black fade → `MenuScene`.
- No lives; one death ends the run.
- Spawns only in `create()`; Clyde leaves when `collectedCount >=` layout pellet threshold; Blinky/Pinky use release clock delays after first input.
- Fruit/upgrades/clocks are scene state; death does not reset actors.

## Approach

### 1. Domain: lives + death sequence

**New** `src/domain/lives.ts` (or constants colocated if tiny):

- `START_LIVES = 3`
- `livesRemainingAfterCatch(lives: number): { lives: number; gameOver: boolean }` — if `lives <= 1` → `{ lives: 0, gameOver: true }`, else `{ lives: lives - 1, gameOver: false }`.

**Rewrite** `src/domain/deathSequence.ts` into an explicit phase machine (names may vary; behavior locked):

Phases:

| Phase            | Meaning                                                 | Exit                                        |
| ---------------- | ------------------------------------------------------- | ------------------------------------------- |
| `hold`           | Complete freeze after catch; death SFX already playing  | after `DEATH_HOLD_MS`                       |
| `ready`          | Non-final only: actors already reset; freeze            | after `READY_PAUSE_MS` → `doneResume`       |
| `fadeToGameOver` | Final only: black overlay fading in                     | after `DEATH_FADE_DURATION_MS` → `gameOver` |
| `gameOver`       | Final only: GO UI visible                               | after `GAME_OVER_HOLD_MS` → `doneMenu`      |
| `doneResume`     | Signal PlayScene to clear death state and restart siren | terminal                                    |
| `doneMenu`       | Signal PlayScene to `scene.start("MenuScene")`          | terminal                                    |

API sketch (implementer may adjust names; semantics locked):

```ts
export const DEATH_HOLD_MS = 845;
export const READY_PAUSE_MS = 1000;
export const GAME_OVER_HOLD_MS = 2000;
// keep DEATH_FADE_DURATION_MS = 500

beginDeathSequence(gameOver: boolean): DeathSequenceState
tickDeathSequence(state, deltaMs): { state; events: DeathSequenceEvent[] }
// events include: 'resetActors' (once, non-final, when leaving hold),
//                 'startFade' (final), 'showGameOver' (final),
//                 'resume' | 'goToMenu'
```

- Non-final: `hold` → emit `resetActors` → `ready` → `resume`.
- Final: `hold` → `fadeToGameOver` (emit `startFade`) → `gameOver` (emit `showGameOver`) → `goToMenu`.
- No fade on non-final.

Update `deathSequence.test.ts` for both branches and knob thresholds.

### 2. Domain: post-life Clyde release

In `src/domain/ghostRelease.ts`:

- Add `CLYDE_POST_LIFE_RELEASE_DELAY_MS = 9000`.
- Extend `shouldReleaseKind` (or add `shouldReleaseKindWithMode`) with `afterLifeRelease: boolean`.
- When `afterLifeRelease` and kind is Clyde: `shouldReleaseGhostAt(clock, CLYDE_POST_LIFE_RELEASE_DELAY_MS)` — **not** absolute pellets.
- When `!afterLifeRelease` and Clyde: today’s pellet rule.
- Blinky/Pinky unchanged.
- Unit tests: pellet path still works on first life; after-life path ignores high `collectedCount` until clock elapsed.

Wire `afterLifeRelease` from `PlayScene` into `ghostRelease(...)`.

### 3. PlayScene wiring

State:

- `private lives = START_LIVES`
- `private afterLifeRelease = false`
- `private death: DeathSequenceState | null = null`
- Lives icon GameObjects array (or container) bottom-left.

On catch (existing site after `catchPlayer`):

1. Stop siren; `playSfx(this, "death")`.
2. `const result = livesRemainingAfterCatch(this.lives); this.lives = result.lives;` refresh lives icons.
3. `this.death = beginDeathSequence(result.gameOver)`.

In `update`, when `death !== null`: tick machine; handle events:

- `resetActors`: call private `resetAfterLifeLoss()` then refresh render once so icons/positions show during ready.
- `startFade`: reuse overlay tween pattern; on complete advance is driven by tick/fade duration — prefer driving fade timing via domain `fadeToGameOver` phase (scene starts tween when event fires; domain already accounts for `DEATH_FADE_DURATION_MS`, **or** scene reports fade complete into tick — pick **domain-owned fade duration** matching today’s tween length so tests stay pure: scene starts visual tween of `DEATH_FADE_DURATION_MS` when event fires; domain independently moves hold→fade→gameOver using same constant).
- `showGameOver`: add centered BitmapText `GAME OVER` + `Collected: N` (use `this.pelletProgress.collectedCount`); depth above overlay.
- `resume`: `this.death = null`; `startLoopingSfx(this, "siren")`.
- `goToMenu`: `this.scene.start("MenuScene")`.

`resetAfterLifeLoss()`:

1. Reposition player + clear velocity/input/facing.
2. Reposition each ghost to house; `GhostPhase = inHouse`; speed 0; clear Input/Facing/Ghost decided tiles.
3. `ghostReleaseClock = createGhostReleaseClock()`; `ghostModeClock = createGhostModeClock()`; sync `previousEffectiveGhostMode`.
4. `afterLifeRelease = true`.
5. Despawn fruit entities; set fruit presence `{ ...state, active: false, remainingMs: 0 }` (keep `nextThresholdIndex`).
6. Clear upgrade transient ms (`freezeRemainingMs = 0`, `scatterBurstRemainingMs = 0`).
7. Do **not** touch pellets, `pelletProgress`, `clock.remaining`, `owned`.

Lives icons:

- Bottom-left under maze / playfield margin (e.g. y near `PLAYFIELD_HEIGHT - pad`, x starting ~12).
- One image per life using existing pac closed-mouth texture from `preloadPlayArt`.
- Rebuild/refresh on create and whenever `lives` changes.
- Not ECS entities — scene presentation only (like HUD text).

### 4. Catch / systems

- `catchPlayer` unchanged.
- `ghostRelease` system gains `afterLifeRelease` boolean forwarded to domain helper.

### 5. Docs

- `docs/ARCHITECTURE.md`: scene flow `caught → life loss | game over`; pipeline death phases; lives icons; post-life Clyde time gate; update catch bullet (no longer always menu).
- README Status: contact spends a life / Game Over on last life.

## Data / contracts

- `START_LIVES`, `DEATH_HOLD_MS`, `READY_PAUSE_MS`, `GAME_OVER_HOLD_MS`, `CLYDE_POST_LIFE_RELEASE_DELAY_MS` — exported named constants (knobs).
- No persistence / localStorage changes.
- No URL flags for lives in v1.

## Failure behavior

- Catch while `lives === 1`: Game Over path; never respawn; never write high score.
- Catch while freeze upgrade active: still impossible via existing `catchPlayer` skip; unchanged.
- Shutdown during death/GO: existing SHUTDOWN stops siren/death keys; scene teardown is enough (no extra persistence).
- If death SFX file changes length later: update `DEATH_HOLD_MS` knob deliberately (do not auto-detect at runtime in v1).

## Docs

- Update `docs/ARCHITECTURE.md`
- Update README Status paragraph
- No new doc file

## Acceptance tests

**Automated**

- `deathSequence` unit: non-final emits reset then resume after `DEATH_HOLD_MS + READY_PAUSE_MS`; final never emits reset/resume; final reaches menu after hold + fade + `GAME_OVER_HOLD_MS`; large delta crosses thresholds once.
- `livesRemainingAfterCatch` unit: 3→2 not GO; 1→0 GO.
- `ghostRelease` / `shouldReleaseKind`: first life Clyde still pellet-gated; `afterLifeRelease` + high pellets + clock not started → false; clock elapsed ≥ 9000 → true.
- `npm run verify` green.

**Manual / visual** (`npm run dev:agent` → `http://127.0.0.1:5174`)

1. Start run: 3 pac icons bottom-left.
2. Die with lives left: death SFX, freeze ~0.85s, actors snap home/start, fruit gone if present, 1s ready freeze, icons decremented, no fade; after unfreeze nothing moves until a direction is pressed; then Blinky/Pinky/Clyde leave on post-life timers (Clyde not instantly).
3. Die on last life: hold → fade → `GAME OVER` + collected → ~2s → menu.
4. Pellets remain eaten across life loss; timer remaining preserved; owned upgrades labels still show; freeze/burst not stuck on.

Record what was launched/exercised/observed per `docs/VERIFICATION.md`.

## Out of scope

- Arcade global post-death pellet counter / Inky / Blinky-outside spawn
- Extra lives from score; continue/credit; fright mode
- `?lives=` flag; auto-measuring hold from audio buffer
- Restoring pellets or resetting run clock on death

## Implementation order

1. Domain lives helper + death sequence phase machine + tests.
2. Clyde `afterLifeRelease` time gate + tests; thread through `ghostRelease` system.
3. `PlayScene`: lives state, catch branch, reset helper, ready/GO UI, lives icons HUD.
4. Docs (`ARCHITECTURE.md`, README Status).
5. `npm run verify`; live visual verification; fix until green.
6. **`/simplify-pr`** on scoped diff (apply in-scope cuts).
7. **`/no-comments`** on scoped diff (required last).
