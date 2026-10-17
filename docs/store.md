# Store floors

Quarters (from the [BONUS bar](./bonus.md) and the level-clear Quarters choice) are spent at **store floors**: an extra board between some levels with no ghosts, pellets, fruit or countdown. Logic: `src/domain/store.ts` (schedule, layout parse, stock roll, prompt/purchase state machine, prices), `storeRoute.ts`, `PlaySim.tickStore`; overlay `src/game/scenes/storeOverlay.ts`.

## Flow

- Schedule: `storeAfterLevel(levelIndex, midStoreLevel)` (after level 3, a mid store after 5 or 6 rolled once per run, and after 8 before the boss). The level-clear upgrade modal resolves first, then the transition, then the store.
- Entering stocks the tiles and the centre freebie and pays [Interest](./upgrades.md) if owned, all before the player can buy. There is no silent life regen on entry; the freebie replaces it.
- `?store=1|2|3` starts in the Nth store (disables high scores; combine with `quarters` and `enableUpgrade`).

## Layout and tiles

`STORE_MAZE_ASCII` (`mazeLayouts.ts`) is the same fixed map every visit: single-file corridors around four large wall blocks. As the store starts the player slides in through an entrance at the left end of the middle row (the reverse of the exit slide, input ignored until it lands). The entrance then counts as wall for movement, routing and exits (`withStoreEntranceClosed`), so it can't be used to leave. The only exit is on the right, past a jog: the middle row runs into a short pocket that turns down before opening out, so walking straight right never leaves by accident. The store layout skips the maze builder's matching-opening rule (`parseMaze`) so it can have one exit. `parseStoreLayout` reads it:

- **Corners** are 2x2 slot blocks whose glyph sets the intended kind: `U` random unowned upgrade, `E` enhance (a random owned, unenhanced upgrade becomes its Plus form), `S` trade (lose a shown owned upgrade, gain a hidden random one). There are always four: an `E` with nothing enhanceable, or an `S` in the first store or with nothing owned, is stocked with another upgrade instead.
- **Centre** `F` is a single-cell freebie, taken by stepping on it: a free life when the player is below the natural regen floor ([levels.md](./levels.md#lives)), else a free Quarter.
- Prices: constants in `store.ts` (`slotPrice`, ...). `createStoreState` rolls stock once on entry: at most one rare shelved, rares at half weight, and a corner is left empty only when no upgrade is left to shelve.
- **School carry-over:** the last upgrade or enhance bought (trades don't count, since a trade's gain is random) sets the school that the _next_ store must shelve at least once on a `U` corner (`purchaseSchool`, `PlaySim.nextStoreSchool`). It is consumed on entry, skipped when that school has nothing eligible left, and buying nothing in a store clears it.

## Movement

Store movement is a regular level's: one press keeps the player moving until a wall, turns buffer as usual, and there are no diagonals. Speed upgrades (Afterburner and the like) do not apply, only the level speed curve. While a BUY / NEVER MIND prompt is open the player is held in place.

## Music

Store floors loop `storeMusic` instead of `gameplayMusic`; leaving resumes it. Settings opened from the pause menu in a store controls `storeMusic` (`PlayScene.currentMusicId()`).

## Buying

Each corner's details (name, description, cost) are always shown in the wall block beside it, so nothing needs crossing to read. `storeStep` is the prompt state machine, fed the player's cell plus toggle and confirm presses:

- Stepping onto an affordable unsold corner (or clicking its tile or panel) dims the other three panels and adds `BUY` / `NEVER MIND` to its own, with NEVER MIND focused. While open, every key except toggle, confirm and Escape is ignored and the player is held in place. NEVER MIND closes it; stepping off and back on re-opens it.
- An unaffordable corner (or a swap or enhance with no valid target) shows the reason in its panel instead of the buttons.
- Upgrade, swap and enhance grant through the same path as a level-clear pick, and the panel then shows what was gained. A swap carries enhancement to the incoming upgrade (`carryEnhancement`); an Extra Life's life is kept when it is swapped out. Enhance and trade targets are re-rolled at purchase if stale, and buying an enhance relabels a trade tile showing the same upgrade.

## Leaving

Reaching the exit mouth starts the exit: no confirm, input stops, the `playerSlide` system carries the player out and the sprite fades (`storeExitAlpha`). **Click to exit:** clicking the exit mouth walks the player there at normal speed (`storeExitCellAt`, `storeRouteStep`: a 4-way BFS first step that avoids unsold tiles when another route exists, written as ordinary player input). Escape cancels the walk instead of pausing.
