# Boss levels

Level 9 (`isBossLevel`, `src/domain/bossRules.ts`) is the only boss level. `pickBoss` rolls **Blinky Swarm** or **Chained Ghosts** once per run from the seeded `bossPick` stream. The `BossDef` table in `bossRules.ts` holds counts, stages and release delays; `PlaySim` owns the fight (`startBoss`, `tickBoss`, `refillBossStageBoard`, `spawnBossGhostsForLife`) and `PlayScene` only shows the banner and applies events.

Every fight has **two stages**. Clearing stage 1 runs a transition; clearing stage 2 ends the run with `RUN COMPLETE`. A mid-stage clear gives no time bonus, upgrade, store, regen or run-complete. Death in either stage preserves the stage, wall-invert flag and (Swarm) ghost and pellet progress.

Flags (also on `parsePlayOptions`; all disable high scores): `level=9` rolls a boss, `boss=blinkySwarm|chainedGhosts` forces one, `bossStageAdvance=1` jumps straight to the transition (wins over `store=1`). Swarm start count is a `?knobs=1` knob.

## Common rules

- A red `BOSS` title replaces the `LEVEL N` banner; play is not frozen.
- Chase only (no scatter waves, no Elroy). Boss ghosts use a flat `BOSS_GHOST_SPEED` with no level multiplier; Ghost Slow and Freeze still apply.
- Lazy Looper does not run: every pellet is required. Fruit, power pellets and other upgrades work as usual.
- Stage transition (`bossStageTransition.ts`, pure choreography): music stops, entities fade, walls flicker out, the same maze refills and ghosts respawn, an empty-board hold, walls flicker back in with an **inverted wall colour** (`invertRgb24`) kept for stage 2, entities fade in. The timer HUD blinks `888` while the real countdown keeps ticking.

## Blinky Swarm

- Board: the authored `SWARM_BOSS_MAZE_ASCII` (`mazeLayouts.ts`, layout id `swarmBoss`), a lattice of one-tile pillars with a few bars and Ls, **no ghost house**, a side wrap tunnel and two vertical wrap tunnels whose corridors run past the field so a Blinky has a lead-in. Dot-Man starts mid-field. `?maze=` still overrides it.
- Blinkys enter only through tunnel mouths (`bossTunnelMouths`: vertical mouths first, then the side tunnel, alternating opposite sides). Starting Blinkys are placed on the mouths at once but held until Dot-Man's first input, like house ghosts.
- A few regular pellets are tagged `BossPellet` (`pickBossPelletCells`: farthest-point spread, away from the spawn). Each one eaten adds a Blinky at the next free mouth (skipping mouths with a Blinky nearby or on the player's row). The ghost count carries across the stage transition; capped by `maxBossGhosts` in `bossRules.ts`.
- Blinkys treat a corridor holding another active Blinky as closed (`corridorOccupied`), so head-on Blinkys turn around.
- On death (and at the stage refill) every Blinky restarts from a mouth.
- With no house, "send to the house" (Hunter, Reactive Armor, Ghost Recall) puts the Blinky back at the mouth farthest from Dot-Man, and Haunting has nothing to cage a Blinky in, so it does nothing on this boss.

## Chained Ghosts

- A regular board with all four ghosts in the house and classic staggered release. Lightning chains join pairs' centres once both ends are out: Blinky-Clyde in stage 1, plus Pinky-Inky in stage 2. Chains pass through walls and catch the player like a ghost (`chainHitsCircle`; the death is recorded against the nearer end).
- A chain is off while either end is in the house, frozen or mid Scatter Burst glide. Invulnerability and `godMode` ignore chains. Ghosts are kept out of the side-tunnel wrap so chains never jump across the board.
- On death all four restart in the house; each chain returns once both ends are out.

## Code map

`bossRules.ts`, `bossStageTransition.ts`, `bossChain.ts`, `bossBoard.ts`, `bossGhostBlocking.ts`, `mazeLayouts.ts` (domain); `game/components/{BossGhost,BossPellet,ChainedGhost}.ts`; `game/systems/{bossGhosts,bossChain}.ts`. `ghostAi`, `ghostRelease` and `applyGhostSpeed` switch on the `BossGhost` component; `render.ts` draws bolts from `SimRenderOptions.bossChains`.
