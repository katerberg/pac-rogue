# Fixed level plan

The run is a fixed 8-level plan (`MAX_LEVEL` in [`src/domain/levelRules.ts`](../src/domain/levelRules.ts)) — no endless/procedural progression past level 8.

| Level | Maze                           | Ghosts                                               | Fruit                     | On clear                                                                                            |
| ----- | ------------------------------ | ---------------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------- |
| 1     | `mazeSmall` (22×21, half-size) | Blinky only                                          | none                      | No reward (level 1 already granted a starting upgrade); advance to level 2                          |
| 2     | Procedural 28×34               | Blinky + a randomly chosen Pinky or Inky (see below) | present (awards Quarters) | Pick-one upgrade-choice modal (if any upgrade is still eligible), then advance to level 3           |
| 3-7   | Procedural 28×34               | All four (Blinky, Pinky, Inky, Clyde)                | present (awards Quarters) | Pick-one upgrade-choice modal (if eligible), then advance to the next level                         |
| 8     | Procedural 28×34               | All four                                             | present (awards Quarters) | Pick-one upgrade-choice modal (if eligible), then a `RUN COMPLETE` screen and return to `MenuScene` |

## Second ghost (level 2)

`PlayScene.create()` picks `secondGhostKind` once per run — 50/50 Pinky or Inky via `Math.random()` — and holds it for the whole run (including level advances). `ghostKindsForLevel(levelIndex, secondGhostKind)` in `levelRules.ts` uses it only for level 2; levels 3+ always spawn all four regardless of the value.

## Fruit awards Quarters

Fruit still spawns/despawns exactly as before (layout-scaled pellet thresholds, 10s lifetime, absent on level 1). Picking it up plays the munch SFX, removes it, and awards one Quarter (top-left HUD dot; no gameplay value yet). The upgrade-choice reward instead comes from **clearing a level** (2 through 8); see [docs/upgrades.md](./upgrades.md).

## `?level=` and the cap

`parseLevelParam` clamps any value above 8 down to 8 (e.g. `?level=99` starts at level 8). Values below 1 or non-numeric still fall back to level 1.

## Run Complete

Clearing level 8 does not write run history (same as any other level clear — only last-life Game Over does). After the level-clear upgrade choice resolves, a `RUN COMPLETE` screen shows the lifetime `Collected` count for `RUN_COMPLETE_HOLD_MS` (2000ms), then returns to `MenuScene`.
