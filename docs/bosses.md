# Boss levels

Level 9 (`isBossLevel`, `src/domain/bossRules.ts`) is the only boss level. `pickBoss` rolls **Blinky Swarm**, **Chained Ghosts** or **Slime Trail** once per run from the seeded `bossPick` stream. The `BossDef` table in `bossRules.ts` holds counts, stages and release delays; `PlaySim` owns the fight (`startBoss`, `tickBoss`, `refillBossStageBoard`, `spawnBossGhostsForLife`) and `PlayScene` only shows the banner and applies events.

Every fight has **two stages**. Clearing stage 1 runs a transition; clearing stage 2 ends the run with `RUN COMPLETE`. A mid-stage clear gives no time bonus, upgrade, store, regen or run-complete. Death in either stage preserves the stage, wall-invert flag and (Swarm) ghost and pellet progress.

Flags (also on `parsePlayOptions`; all disable high scores): `level=9` rolls a boss, `boss=blinkySwarm|chainedGhosts|slimeTrail` forces one, `bossStageAdvance=1` jumps straight to the transition (wins over `store=1`). Swarm start count is a `?knobs=1` knob.

## Common rules

- A red `BOSS` title replaces the `LEVEL N` banner; play is not frozen.
- Chase only (no scatter waves, no Elroy). Boss ghosts use a flat `BOSS_GHOST_SPEED` with no level multiplier; Ghost Slow and Freeze still apply.
- Lazy Looper does not run: every pellet is required. Fruit, power pellets and other upgrades work as usual.
- Stage transition (`bossStageTransition.ts`, pure choreography): music stops, entities fade, walls flicker out, the same maze refills and ghosts respawn, an empty-board hold, walls flicker back in with an **inverted wall colour** (`invertRgb24`) kept for stage 2, entities fade in. The timer HUD blinks `888` while the real countdown keeps ticking.

## Blinky Swarm

- Board: generated with exactly three tunnel rows (falls back to a regular board with a warning if none is found).
- A few regular pellets are tagged `BossPellet` (`pickBossPelletCells`: farthest-point spread, away from the spawn). Each one eaten adds a Blinky at the next free tunnel mouth (`bossTunnelMouths`, skipping mouths with a Blinky nearby or on the player's row). The ghost count carries across the stage transition; capped by `maxBossGhosts` in `bossRules.ts`.
- Blinkys treat a corridor holding another active Blinky as closed (`corridorOccupied`), so head-on Blinkys turn around.
- On death the first few Blinkys restart in the house and the rest come straight out of the tunnels.

## Chained Ghosts

- A regular board with all four ghosts in the house and classic staggered release. Lightning chains join pairs' centres once both ends are out: Blinky-Clyde in stage 1, plus Pinky-Inky in stage 2. Chains pass through walls and catch the player like a ghost (`chainHitsCircle`; the death is recorded against the nearer end).
- A chain is off while either end is in the house, frozen or mid Scatter Burst glide. Invulnerability and `godMode` ignore chains. Ghosts are kept out of the side-tunnel wrap so chains never jump across the board.
- On death all four restart in the house; each chain returns once both ends are out.

## Slime Trail

- Board: the run's level 2-8 pool map as level 8 had it (`poolBoard` in `BossDef`, `POOL_BOSS_BOARD_LEVEL`): every collapse, the sinkhole, bored tunnels, level 8's speed lanes (no drift on entry), lava and timed tunnel, all replayed from the same seed streams. `?levelModifiers=0` turns the modifiers off here as on level 8.
- Ghosts: the run's level-8 roster (`withBossRoster`), released from the house with the boss stagger; each keeps its own targeting.
- Slime (`src/domain/slimeTrail.ts`, `game/systems/slimeTrail.ts`): in stage 1 Blinky lays a trail of its last few tiles; in stage 2 every ghost, Blinky included, lays a shorter one (lengths in `BossStageDef.slime`, `bossRules.ts`). Only active ghosts that are neither frightened nor mid corner glide add tiles; slime already laid stays until its ghost moves on, and a parked ghost's trail never fades.
- Touching slime kills Dot-Man like lava (shields, Mirror and Defy Death apply), recorded against the ghost that laid it. Floating, invulnerability and `godMode` ignore it; ghosts cross it freely. Trails clear on a life loss and at the stage transition.

## Code map

`bossRules.ts`, `bossStageTransition.ts`, `bossChain.ts`, `bossBoard.ts`, `bossGhostBlocking.ts`, `slimeTrail.ts` (domain); `game/components/{BossGhost,BossPellet,ChainedGhost}.ts`; `game/systems/{bossGhosts,bossChain,slimeTrail}.ts`. `ghostAi`, `ghostRelease` and `applyGhostSpeed` switch on the `BossGhost` component; `render.ts` draws bolts from `SimRenderOptions.bossChains` and slime from `slimeTiles`.
