# Store floors

Quarters (from the [BONUS bar](./bonus.md) and the level-clear Quarters choice) are spent at **store floors**: an extra board between some levels with no ghosts, pellets, fruit or countdown. Logic: `src/domain/store.ts` (schedule, slot parse, stock roll, prompt/purchase state machine, prices), `storeRoute.ts`, `PlaySim.tickStore`; overlay `src/game/scenes/storeOverlay.ts`.

## Flow

- Schedule: `storeAfterLevel(levelIndex, midStoreLevel)` (after level 3, a mid store after 5 or 6 rolled once per run, and after 8 before the boss). The level-clear upgrade modal resolves first, then the transition, then the store.
- Entering applies natural life regen ([levels.md](./levels.md#lives)), stocks the tiles, and pays [Interest](./upgrades.md) if owned, all before the player can buy.
- `?store=1|2|3` starts in the Nth store (disables high scores; combine with `quarters` and `enableUpgrade`).

## Layout and tiles

`STORE_MAZE_ASCII` (`mazeLayouts.ts`) is a hand-made room whose walls respect the rounded-stroke rules (never 1 tile thick, never touching only at a corner). Slot glyphs are walkable cells for the maze builder; `parseStoreSlots` turns each 2x2 block into a slot:

- `L` extra life, `U` random unowned upgrade, `S` trade (lose a shown owned upgrade, gain a hidden random one), `E` enhance (a random owned, unenhanced upgrade becomes its Plus form).
- Prices and counts: constants in `store.ts` (`storePriceFor`, `lifePriceForStore`, ...). `createStoreState` rolls stock once on entry: at most one rare shelved, rares at half weight, unfilled slots omitted, no `E` tile when nothing is enhanceable.
- **School carry-over:** the last upgrade or enhance bought (lives and trades don't count, since a trade's gain is random) sets the school that the _next_ store must shelve at least once on a `U` tile (`purchaseSchool`, `PlaySim.nextStoreSchool`). It is consumed on entry, skipped when that school has nothing eligible left, and buying nothing in a store clears it.

## Movement

In the store the player stops when no direction is held (`stopOnRelease`) and diagonals are always allowed. Speed upgrades (Afterburner and the like) do not apply, so the player stays controllable; only the level speed curve does. Cardinal release finishes to the next cell centre; diagonal release eases to the current centre.

## Music

Store floors loop `storeMusic` instead of `gameplayMusic`; leaving resumes it. Settings opened from the pause menu in a store controls `storeMusic` (`PlayScene.currentMusicId()`).

## Buying

`storeStep` is the prompt state machine, fed the player's cell plus toggle and confirm presses:

- Stepping onto an affordable unsold slot opens a centred modal (name, description, cost, `SURE? YES NO` with NO focused, like the pause Quit confirm). While open, every key except toggle, confirm and Escape is ignored and the player settles on the tile centre. NO closes it; stepping off and back on re-opens it.
- An unaffordable slot (or a swap or enhance with no valid target) shows only the info panel with the reason.
- Upgrade, swap and enhance grant through the same path as a level-clear pick. A swap carries enhancement to the incoming upgrade (`carryEnhancement`); an Extra Life's life is kept when it is swapped out. Enhance and trade targets are re-rolled at purchase if stale, and buying an enhance relabels a trade tile showing the same upgrade.

## Leaving

Reaching any border cell (tunnel mouth) starts the exit: no confirm, input stops, the `playerSlide` system carries the player out and the sprite fades (`storeExitAlpha`). **Click to exit:** clicking a tunnel mouth walks the player there at normal speed (`storeExitCellAt`, `storeRouteStep`: a 4-way BFS first step that avoids unsold tiles when another route exists, written as ordinary player input). Escape cancels the walk instead of pausing.
