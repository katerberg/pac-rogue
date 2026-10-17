# Store floors

Quarters (from the [BONUS bar](./bonus.md) and the level-clear Quarters choice) are spent at **store floors**: an extra board between some levels with no ghosts, pellets, fruit or countdown. Logic: `src/domain/store.ts` (schedule, layout parse, stock roll, prompt/purchase state machine, prices), `storeRoute.ts`, `PlaySim.tickStore`; overlay `src/game/scenes/storeOverlay.ts`.

## Flow

- Schedule: `storeAfterLevel(levelIndex, midStoreLevel)` (after level 3, a mid store after 5 or 6 rolled once per run, and after 8 before the boss). The level-clear upgrade modal resolves first, then the transition, then the store.
- Entering stocks the tiles and the centre freebie and pays [Interest](./upgrades.md) if owned, all before the player can buy. There is no silent life regen on entry; the freebie replaces it.
- `?store=1|2|3` starts in the Nth store (disables high scores; combine with `quarters` and `enableUpgrade`).

## Layout and tiles

`STORE_MAZE_ASCII` (`mazeLayouts.ts`) is the same fixed map every visit: single-file corridors around four wall blocks. Entry slides in from the left middle (input ignored); then `withStoreEntranceClosed` seals that cell so it cannot be used to leave. The only exit is a jogged pocket on the right (straight-right never exits). The layout skips `parseMaze`'s matching-opening rule so it can have one exit. `parseStoreLayout` reads it:

- **Corners** are 2x2 slot blocks: `U` random unowned upgrade, `E` enhance (owned → Plus), `S` trade (lose a shown owned, gain a hidden random). Always four; an `E` with nothing enhanceable, or an `S` in the first store / with nothing owned, stocks as another upgrade instead.
- **Centre** `F` is a freebie on step-on: a free life below the natural regen floor ([levels.md](./levels.md#lives)), else a free Quarter.
- Prices: constants in `store.ts`. `createStoreState` rolls stock once: at most one rare, rares at half weight; a corner stays empty only when nothing is left to shelve.
- **School carry-over:** last upgrade/enhance bought (not trades) sets the school the next store must shelve once on a `U` (`purchaseSchool`, `PlaySim.nextStoreSchool`). Consumed on entry, skipped when that school has nothing left; buying nothing clears it.

## Movement

Same as a regular level (hold-to-wall, buffered turns, no diagonals). Speed upgrades do not apply — only the level speed curve. While a BUY / NEVER MIND prompt is open the player is held still.

## Music

Store floors loop `storeMusic` instead of `gameplayMusic`; leaving resumes it. Settings opened from the pause menu in a store controls `storeMusic` (`PlayScene.currentMusicId()`).

## Buying

Each corner's details (name, description, cost) are always shown in the wall block beside it, so nothing needs crossing to read. `storeStep` is the prompt state machine, fed the player's cell plus toggle and confirm presses:

- Stepping onto an affordable unsold corner (or clicking its tile or panel) dims the other three panels and adds `BUY` / `NEVER MIND` to its own, with NEVER MIND focused. While open, every key except toggle, confirm and Escape is ignored and the player is held in place. NEVER MIND closes it; stepping off and back on re-opens it.
- An unaffordable corner (or a swap or enhance with no valid target) shows the reason in its panel instead of the buttons.
- Upgrade, swap and enhance grant through the same path as a level-clear pick, and the panel then shows what was gained. A swap carries enhancement to the incoming upgrade (`carryEnhancement`); an Extra Life's life is kept when it is swapped out. Enhance and trade targets are re-rolled at purchase if stale, and buying an enhance relabels a trade tile showing the same upgrade.

## Leaving

Reaching the exit mouth starts the exit: no confirm, input stops, the `playerSlide` system carries the player out and the sprite fades (`storeExitAlpha`). **Click to exit:** clicking the exit mouth walks the player there at normal speed (`storeExitCellAt`, `storeRouteStep`: a 4-way BFS first step that avoids unsold tiles when another route exists, written as ordinary player input). Escape cancels the walk instead of pausing.
