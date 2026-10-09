# Fixed level plan

The run is a fixed 9-level plan (`MAX_LEVEL` in [`src/domain/levelRules.ts`](../src/domain/levelRules.ts)) — no endless/procedural progression past level 9. Level 9 is a boss fight (see [docs/bosses.md](./bosses.md)).

| Level | Maze                           | Ghosts                                                                                                                      | Fruit                                            | On clear                                                                                                                                               |
| ----- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | `mazeSmall` (22×21, half-size) | Blinky + a randomly chosen Pinky or Inky (2 ghosts, see below)                                                              | present after 70 pellets (charges the BONUS bar) | No reward (level 1 already granted a starting upgrade); advance to level 2                                                                             |
| 2     | Procedural 28×34               | Blinky, Pinky, and Inky (3 ghosts, see below)                                                                               | present (charges the BONUS bar)                  | Pick-one upgrade choice modal (or bank Quarters instead), then advance to level 3                                                                      |
| 3-8   | Procedural 28×34               | All four (Blinky, Pinky, Inky, Clyde)                                                                                       | present (charges the BONUS bar)                  | Pick-one upgrade choice modal (or bank Quarters instead), then advance to the next level; after 3, after 5 or 6, and after 8 a store floor comes first |
| 9     | Procedural 28×34               | Boss, rolled per run: Blinky Swarm (3-tunnel board, two-stage 2 → 10 Blinkys) or Chained Ghosts (see [bosses](./bosses.md)) | present (charges the BONUS bar)                  | Two-stage clear (stage-1 transition, then stage-2 clear); no upgrade offer; a `RUN COMPLETE` screen with a `NEW GAME` / `MENU` choice                  |

Ghosts default to pixel sprites on every level; Settings → STYLE switches among PIXEL (sprites + PNG pellets, glow off, the default), NEON (line art, glow on), and LINED (same line art, glow off) — see [line-art.md](./line-art.md).

Store floors (between levels 3→4, 5→6 or 6→7, and 8→9 right before the boss) are where Quarters are spent; see [docs/store.md](./store.md).

## Base speed

Maze-Man's base speed is `PLAYER_SPEED` (`src/domain/playfield.ts`), roughly matched to arcade Ms. Pac-Man. Every ghost, tunnel, Cruise Elroy, ghost-house exit and boss speed is a fixed ratio of it, so the ratios below hold at any base. Timers (upgrade durations, scatter/chase waves, idle release, fruit lifetime, the Time countdown) are real-time and do not scale with speed, as in the arcade.

## Ghost catch-up speed (levels 1-8)

Ghosts start slower than Maze-Man on level 1 and gain ground each level: `ghostBaseSpeedRatio(levelIndex)` in `levelRules.ts` scales ghost base speed to 80% of Maze-Man's base speed on level 1, +5% per level, reaching full parity (100%) by level 5, then edging past it (105% on level 6, 110% on levels 7–8, capped by `ghostRatioCap`). Ghost tunnel speed is not part of the ramp: it is a constant 50% of Maze-Man's base speed on every level, as in the arcade. The level-9 boss Blinkys ignore this ramp (see [docs/bosses.md](./bosses.md)). Blinky's Cruise Elroy tiers are unaffected — they stay fixed multiples of Maze-Man's speed regardless of level.

## Inverted maze (levels 6-7)

`isInvertedMazeLevel(levelIndex)` in `levelRules.ts` marks levels 6 and 7. For those levels, `PlaySim.startBoard()` row-reverses the generated board (`invertMazeAscii` in `mazeGenerate.ts`) before activating it: the player spawn and ghost house stamp move with the flip, so the player starts near the top of the maze and the ghost house door opens downward instead of upward. `deriveGhostHouseExit` and `deriveFruitSpawn` in `maze.ts` derive the exit/fruit direction from the ascii (which side of the door/house has the open corridor) rather than assuming "up"/"down", and `canGhostEnterDirection`'s one-way door rule blocks re-entry toward the house floor regardless of which way that is — so both orientations behave correctly without a maze-generation retry. Layout overrides (`?maze=`) are never inverted, only the procedural board.

## Timed tunnels (levels 7–8)

`isTimedTunnelLevel(levelIndex)` marks levels 7 and 8. On those boards, one tunnel row (picked from `horizontalTunnelRows` via the seeded `timedTunnel` stream) cycles **open 6s → closed 2.5s**. The last 1.5s of the open window is a **warn** phase: the left and right mouth cells blink. While closed, wrap is blocked for the player and ghosts on that row only (the corridor stays walkable); any other tunnel row still wraps. Wall Pass+ loop form suspends the mechanic for the duration. If Tunnel Dash is mid-animation when the gate closes, the dash cancels and the player snaps to the nearest in-bounds cell center. Store floors and the boss are unaffected.

## Second ghost (levels 1-2)

`PlaySim.start()` picks `secondGhostKind` once per run — 50/50 Pinky or Inky from the seeded `secondGhost` stream — and holds it for the whole run (including level advances). `ghostKindsForLevel(levelIndex, secondGhostKind)` in `levelRules.ts` uses it for level 1 (Blinky + `secondGhostKind`) and level 2 (Blinky + `secondGhostKind` + the other of Pinky/Inky, so level 2 always spawns Blinky, Pinky, and Inky); levels 3+ always spawn all four regardless of the value.

## Life regen

Runs start at `START_LIVES` (4). Natural life regen happens only when entering a [store](./store.md): `livesAfterLevelRegen` (`src/domain/lives.ts`) grants one life (`STORE_REGEN_AMOUNT`) whenever fewer than 3 HUD icons are showing (4 while `passiveExtraLife` is owned, via `levelLivesIconFloor`). This is a one-life trickle toward the icon floor, not an instant refill — a run that lost several lives climbs back across store visits. Owning `passiveExtraLife` raises the floor to 4 icons (`lifeFloorBonus`), so a run with it regenerates up to 5 lives (enhanced: floor 5, up to 6 lives); the upgrade's own life (+1, enhanced +2) is not capped. Owning `passiveMyogenesis` additionally regenerates one life on every level clear (`levelRegenAmount`), still clamped at the floor, on top of the store regen; enhanced Myogenesis refills every missing slot up to the floor on level clear. The debug flag `?maxLives=` moves the base floor to that many lives (`maxLives − 1` icons, plus any Extra Life bonus); `?lives=` sets the starting lives exactly and also sets `maxLives` unless it is given (README [Flags](../README.md#flags)).

## Fruit charges the BONUS bar

Fruit spawns/despawns as before, 10s lifetime (20s with Fruit Fecundity): level 1 uses a single unscaled 70-pellet threshold, levels 2+ use layout-scaled pellet thresholds. Picking it up plays the munch SFX, removes it, and adds half a [BONUS bar](./bonus.md) of charge (`FRUIT_BONUS_CHARGE`, 150; a whole bar with Quarter Bounty). Each bar fill pays one Quarter (top-left HUD; spent at [store floors](./store.md)), so two fruits make a Quarter. The upgrade-choice reward instead comes from **clearing a level** (2 through 8); see [docs/upgrades.md](./upgrades.md).

## `?level=` and the cap

`parseLevelParam` clamps any value above 9 down to 9, so `?level=9` (or `?level=99`) jumps straight into the boss fight. Values below 1 or non-numeric still fall back to level 1.

## Run Complete

Clearing level 9 (the boss) requires both stages (see [bosses](./bosses.md)). The final stage clear does not write run history (same as any other level clear — only last-life Game Over does). No upgrade choice and no [time bonus](./bonus.md#time-bonus) are given; after the brief transition freeze, a `RUN COMPLETE` screen shows the lifetime `Collected` count and stays up with a `NEW GAME` / `MENU` choice (Up/Down or W/S to move, Enter/Space or click to pick; Esc does nothing). For the first `RUN_END_MENU_ARM_MS` (1000ms) the rows are dimmed with nothing selected and ignore keys, hover and clicks (so a key still held from the boss clear cannot skip the screen); then they fade in and `NEW GAME` is selected. `NEW GAME` restarts `PlayScene` with the same URL flags; `MENU` returns to `MenuScene`.

## Ghost house release

Release tightens with level (arcade rules, except Blinky starts inside): nothing leaves before your first input, then Blinky leaves at 0.1s and Pinky immediately. Inky waits for the layout-scaled pellet count on level 1 and is immediate from level 2. Clyde waits for the layout-scaled count on level 1, 50 dots on level 2, and is immediate from level 3. After a death a shared counter releases Pinky, Inky and Clyde at 7, 17 and 32 dots eaten since the death. Stop eating for 4s (levels 1-4) or 3s (level 5+) and the next waiting ghost is pushed out. See [ARCHITECTURE](./ARCHITECTURE.md) for the mechanics.
