# Fixed level plan

The run is a fixed 8-level plan (`MAX_LEVEL` in [`src/domain/levelRules.ts`](../src/domain/levelRules.ts)) — no endless/procedural progression past level 8.

| Level | Maze                           | Ghosts                                                         | Fruit                                      | On clear                                                                                            |
| ----- | ------------------------------ | -------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| 1     | `mazeSmall` (22×21, half-size) | Blinky + a randomly chosen Pinky or Inky (2 ghosts, see below) | present after 70 pellets (awards Quarters) | No reward (level 1 already granted a starting upgrade); advance to level 2                          |
| 2     | Procedural 28×34               | Blinky, Pinky, and Inky (3 ghosts, see below)                  | present (awards Quarters)                  | Pick-one upgrade-choice modal (if any upgrade is still eligible), then advance to level 3           |
| 3-7   | Procedural 28×34               | All four (Blinky, Pinky, Inky, Clyde)                          | present (awards Quarters)                  | Pick-one upgrade-choice modal (if eligible), then advance to the next level                         |
| 8     | Procedural 28×34               | All four                                                       | present (awards Quarters)                  | Pick-one upgrade-choice modal (if eligible), then a `RUN COMPLETE` screen and return to `MenuScene` |

## Inverted maze (levels 6-7)

`isInvertedMazeLevel(levelIndex)` in `levelRules.ts` marks levels 6 and 7. For those levels, `PlayScene.startBoard()` row-reverses the generated board (`invertMazeAscii` in `mazeGenerate.ts`) before activating it: the player spawn and ghost house stamp move with the flip, so the player starts near the top of the maze and the ghost house door opens downward instead of upward. `deriveGhostHouseExit` and `deriveFruitSpawn` in `maze.ts` derive the exit/fruit direction from the ascii (which side of the door/house has the open corridor) rather than assuming "up"/"down", and `canGhostEnterDirection`'s one-way door rule blocks re-entry toward the house floor regardless of which way that is — so both orientations behave correctly without a maze-generation retry. Layout overrides (`?maze=`) are never inverted, only the procedural board.

## Second ghost (levels 1-2)

`PlayScene.create()` picks `secondGhostKind` once per run — 50/50 Pinky or Inky via `Math.random()` — and holds it for the whole run (including level advances). `ghostKindsForLevel(levelIndex, secondGhostKind)` in `levelRules.ts` uses it for level 1 (Blinky + `secondGhostKind`) and level 2 (Blinky + `secondGhostKind` + the other of Pinky/Inky, so level 2 always spawns Blinky, Pinky, and Inky); levels 3+ always spawn all four regardless of the value.

## Fruit awards Quarters

Fruit spawns/despawns as before, 10s lifetime: level 1 uses a single unscaled 70-pellet threshold, levels 2+ use layout-scaled pellet thresholds. Picking it up plays the munch SFX, removes it, and awards one Quarter (top-left HUD dot; no gameplay value yet). The upgrade-choice reward instead comes from **clearing a level** (2 through 8); see [docs/upgrades.md](./upgrades.md).

## `?level=` and the cap

`parseLevelParam` clamps any value above 8 down to 8 (e.g. `?level=99` starts at level 8). Values below 1 or non-numeric still fall back to level 1.

## Run Complete

Clearing level 8 does not write run history (same as any other level clear — only last-life Game Over does). No upgrade choice is offered; after the brief transition freeze, a `RUN COMPLETE` screen shows the lifetime `Collected` count for `RUN_COMPLETE_HOLD_MS` (2000ms), then returns to `MenuScene`.
