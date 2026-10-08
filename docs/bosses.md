# Boss levels

A boss level replaces a regular board with a scripted fight. Level 9 (`isBossLevel` in
[`src/domain/bossRules.ts`](../src/domain/bossRules.ts)) is the only boss level. Its boss is
rolled once per run from the seeded `bossPick` stream (`pickBoss`): **Blinky Swarm** or
**Chained Ghosts**, 50/50.

Every boss fight has **two stages**. Clearing the board in stage 1 runs a mid-fight transition
(see [Stage transition](#stage-transition)); clearing stage 2 ends the run with `RUN COMPLETE`.

- `?level=9` (with or without `?play=1`) jumps straight into the boss fight (random boss).
- `?boss=blinkySwarm` / `?boss=chainedGhosts` forces that boss. Without `?level=` it also starts
  the run in the boss fight. Disables high-score saving.
- `?bossStageAdvance=1` (with `?boss=`) starts the stage-1→2 transition choreography as soon as
  the boss board is ready (live-check / probe helper). Disables high-score saving.

## Entrance

Instead of the `LEVEL N` banner, a large red `BOSS` title slams in (scale 3 → 1 over 220ms),
the camera shakes (400ms), the title holds for 1.2s and then fades. Play is not frozen and no
extra sound plays.

## Stage transition

When stage 1 is cleared (every required pellet gone):

1. Gameplay music stops; `levelComplete` plays.
2. Board entities fade out (400ms) while walls stay solid.
3. Maze walls flicker out (3×80ms on/off pulses).
4. `levelComplete` is cut mid-play; the same maze is refilled (pellets, power pellets, fruit
   presence reset). Ghosts despawn and respawn for stage 2. Dot-Man stays where he is.
5. Maze walls flicker back in with an **inverted wall color** (`invertRgb24`); that invert
   stays for the rest of stage 2.
6. Entities fade in (400ms); gameplay music loops again.
7. During the whole transition the timer HUD shows blinking `Time: 888` while the real countdown
   keeps ticking. No STAGE 2 banner.

Mid-stage clear grants no time bonus, upgrade, store visit, life regen, or run-complete. Death
during either stage preserves `stage`, invert flag, and (for Swarm) ghost/pellet progress.

## Blinky Swarm

| Rule             | Behavior                                                                                                                                                                                                                                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Board            | Procedural 28×34 maze generated with exactly **3** tunnel rows (`generateMazeAscii(seed, { tunnelCount: 3 })`), never inverted. Full regular + power pellet board. If no 3-tunnel board is found, a regular board is used (warning).                                                                           |
| Stages           | Stage 1: **3** BossPellets. Stage 2: board refill with **5** BossPellets. Start with 2 Blinkys; max still 10 after both stages (`2+3+5`). Ghost count carries across the stage transition; ghosts despawn/respawn for the carried count.                                                                       |
| Win              | Clear stage 1, then clear stage 2. Then `RUN COMPLETE` with a `NEW GAME` / `MENU` choice (no upgrade offer).                                                                                                                                                                                                   |
| Boss pellets     | Regular pellets (`BossPellet`) picked by `pickBossPelletCells` (farthest-point spread, never within 6 tiles of the player spawn). Tinted halfway between the maze color and white and pulsing once a second between 2× dot size at full brightness and 3× at 60% alpha.                                        |
| Spawning         | Starts with 2 Blinkys in the house. Each boss pellet eaten adds one Blinky (max 10) at the next free tunnel mouth, rotating clockwise from the bottom-left (`bossTunnelMouths`). A mouth with a Blinky within 2 tiles, or on the player's current row, is skipped (the spawn waits if every mouth is skipped). |
| Blinkys as walls | When choosing a direction, a Blinky treats any corridor (up to the next junction) holding another active Blinky as closed (`corridorOccupied`), unless every direction is closed. Two Blinkys meeting head-on both turn around.                                                                                |
| Targeting        | Normal scatter/chase waves. Chase targets the player (no Cruise Elroy). Each Blinky scatters to its own randomly assigned corner (several may share one).                                                                                                                                                      |
| Speed            | Flat `BOSS_GHOST_SPEED` (= base Maze-Man speed), half in tunnels, no level multiplier, no Elroy. `passiveGhostSlow` and Freeze still apply. Maze-Man keeps the level-9 speed.                                                                                                                                  |
| House            | Up to 4 Blinkys wait in the house and leave 0.6s apart (0.1s, 0.7s, 1.3s, 1.9s after the first input).                                                                                                                                                                                                         |
| Death            | Keeps the Blinky count, eaten pellets, and stage. The first 4 Blinkys restart in the house; the rest come out of the tunnels right away.                                                                                                                                                                       |
| Other            | Fruit behaves as on a normal level. Power pellets and upgrades work as usual, except Lazy Looper (owned or Plus) does not mark optional pellets — every pellet is required. Boss pellets are not power pellets.                                                                                                |

Debug: the **Swarm start Blinkys** knob (`?knobs=1`, Boss group, 2..10) starts the swarm with that
many Blinkys (clamped to the overall max of 10).

## Chained Ghosts

| Rule      | Behavior                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Board     | Regular procedural 28×34 maze. Full regular + power pellet board, no boss pellets.                                                                                                                                                                                                                                                                                                                                                            |
| Stages    | Stage 1: all four ghosts present; only Blinky↔Clyde is chained. Stage 2: after the transition, all four reset to the house with both Blinky↔Clyde and Pinky↔Inky chains. Dot-Man stays put.                                                                                                                                                                                                                                                   |
| Win       | Clear stage 1, then clear stage 2 (same as Blinky Swarm).                                                                                                                                                                                                                                                                                                                                                                                     |
| Ghosts    | Blinky, Pinky, Inky, and Clyde, all in the house. Classic release: Blinky 0.1s after first input, then Pinky, Inky, Clyde at +1.5s each. No more ghosts ever spawn.                                                                                                                                                                                                                                                                           |
| Chain     | Lightning chains join a pair's centers once both ends are out of the house. Stage 1 only tags Blinky↔Clyde. Stage 2 tags both pairs. Chains cut straight through walls. Touching a chain catches Maze-Man like a ghost does (his center within half his radius of the line; the death is recorded against the nearer end of that chain). Linked partners do not block each other; other boss ghosts still treat each other as corridor walls. |
| Off       | A pair's chain is off while either end is in the house, frozen (Freeze) or mid Scatter Burst glide. Invulnerability and `godMode` ignore chains like any ghost.                                                                                                                                                                                                                                                                               |
| Tunnels   | All four ghosts are kept out of the side-tunnel wrap so the chains never jump across the board.                                                                                                                                                                                                                                                                                                                                               |
| Targeting | Normal scatter/chase waves. Each kind keeps its usual chase (Blinky, Pinky lookahead, Inky, Clyde shy). In scatter each heads for its own randomly assigned corner.                                                                                                                                                                                                                                                                           |
| Speed     | Same flat boss speed as Blinky Swarm.                                                                                                                                                                                                                                                                                                                                                                                                         |
| Look      | Flickering lightning bolts (blue glow, pale blue bolt, white core) redrawn every 50ms for each live pair, under the ghost sprites.                                                                                                                                                                                                                                                                                                            |
| Death     | All four ghosts restart in the house; stage and invert flag are preserved; each active chain comes back once both of its ends are out again.                                                                                                                                                                                                                                                                                                  |

## Code map

- `src/domain/bossRules.ts` — `BossDef` table (with `stages`), `isBossLevel`, `pickBoss`, `bossStartGhosts`, `BossState`, `advanceBossStage`, `invertRgb24`, `bossTimerLabel`, `splitBossGhosts`, `?boss` parse.
- `src/domain/bossStageTransition.ts` — pure stage-transition choreography (alphas, flicker, SFX/music flags).
- `src/domain/bossChain.ts` — chain hit test (`chainHitsCircle`) and the lightning polyline (`lightningPoints`).
- `src/domain/bossBoard.ts` — tunnel mouth order and boss pellet placement.
- `src/domain/bossGhostBlocking.ts` — corridor occupancy walk used by `ghostAi`.
- `src/game/components/BossGhost.ts`, `BossPellet.ts`, `ChainedGhost.ts` — markers (per-ghost scatter corner and house release delay; chain ends with `pair` id).
- `src/game/systems/bossGhosts.ts` — head-on reversal, free-mouth pick, boss pellet count (Blinky Swarm).
- `src/game/systems/bossChain.ts` — live chain segments (`bossChains`) and `chainCatch`, run after `catchPlayer`; `render.ts` draws bolts from `SimRenderOptions.bossChains`.
- `ghostAi`, `ghostRelease`, `applyGhostSpeed` switch behavior on the `BossGhost` component.
- `PlaySim` owns it: `startBoss` / `tagBossPellets` in `startBoard`, `tickBoss` each frame, stage transition + `refillBossStageBoard`, `spawnBossGhostsForLife` on death reset. `PlayScene` shows the boss banner and applies draw/SFX from sim events.

## Adding a boss

1. Add an id to `BOSS_IDS` and a `BossDef` entry in `BOSS_DEFS` (it joins the level-9 roll and the `?boss=` flag). Include a `stages` array (v1 bosses use two stages).
2. Reuse the `BossGhost` / `BossPellet` markers where the rules match, or add new fields/systems for new rules.
3. Document it in a new section above and in [docs/levels.md](./levels.md).
