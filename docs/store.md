# Store floors

Quarters (from the [BONUS bar](./bonus.md) and the level-clear Quarters choice) are spent at **store floors**: an extra board between some levels with no ghosts, pellets, fruit or countdown. Logic: `src/domain/store.ts` (schedule, layout parse, stock roll, prompt/purchase state machine, prices), `storeRoute.ts`, `PlaySim.tickStore`; overlay `src/game/scenes/storeOverlay.ts`.

## Flow

- Schedule: `storeAfterLevel(levelIndex, midStoreLevel)` (after level 3, a mid store after 5 or 6 rolled once per run, and after 8 before the boss). The level-clear upgrade modal resolves first, then the transition, then the store.
- Entering stocks the tiles and the centre freebie and pays [Interest](./upgrades.md) if owned, all before the player can buy. There is no silent life regen on entry; the freebie replaces it.
- `?store=1|2|3` starts in the Nth store (disables high scores; combine with `quarters`, `enableUpgrade`).

## Layout and tiles

`STORE_MAZE_ASCII` (`mazeLayouts.ts`) is the same fixed, deliberately low-fi map every visit: a tiny room of one-cell corridors around wall blocks, entered along a short corridor from the left. The entrance stays open and is also the exit. `parseStoreLayout` reads it:

- **Corners** are single cells: `U` random unowned upgrade, `E` enhance (owned → Plus), `S` SACRIFICE (lose an owned power of the player's choosing, gain a hidden random one of the shown school). Always four; an `E` or `S` with nothing to act on stocks as another upgrade.
- **Centre** `F` is a freebie on step-on: a free life below the natural regen floor ([levels.md](./levels.md#lives)), else a free Quarter.
- **Dots** (`.`) are decoration only: the overlay draws them on open room cells, never collectible, never counted as pellets.
- Prices: constants in `store.ts`. `createStoreState` rolls stock once: at most one rare, rares at half weight; a corner stays empty only when nothing is left to shelve. Nothing shows twice in a store or again in a later one (`offeredUpgradeIds`); `E` only prefers a fresh target.
- **School carry-over:** last upgrade/enhance bought (not trades) sets the school the next store must shelve once on a `U` (`purchaseSchool`, `PlaySim.nextStoreSchool`). Consumed on entry; buying nothing clears it.

Each item's card sits in the play-area corner on the item's side of the freebie (`storeCorner`). Cards have no border or school-coloured wall for now.

## Movement

Same as a regular level (hold-to-wall, buffered turns, no diagonals). Speed upgrades do not apply — only the level speed curve. While a BUY / NEVER MIND prompt is open the player is held still.

## Music

Store floors loop `storeMusic` instead of `gameplayMusic`; leaving resumes it. Settings opened from the pause menu in a store controls `storeMusic` (`PlayScene.currentMusicId()`).

## Buying

Each corner's details show in its card. `storeStep` is the prompt state machine (player cell, focus and confirm presses):

- Stepping onto an affordable unsold corner (or clicking its tile or panel) dims the other three panels and adds `BUY` / `NEVER MIND` to its own, NEVER MIND focused. Up/W focuses BUY, Down/S NEVER MIND; Enter/Space picks. While open, other keys except Escape are ignored and the player is held. NEVER MIND closes it; stepping back on re-opens it.
- An unaffordable corner (or a swap/enhance with no valid target) shows the reason instead of the buttons.
- **SACRIFICE** has its own card and no BUY / NEVER MIND: two faded symbols (the owned power over its school art, and the school it pays out). Stepping on it selects the power: Up/Down walk the owned list (`StoreState.sacrifice`), Left is BACK (leaves like NEVER MIND), Right or Enter moves to the school symbol, where Left goes back to the power and Right or Enter confirms. The stocked power is only the starting selection. Hints per stage: `sacrificeHints`; up/down triangles show only on the power stage, and clicks on them or the BACK / BUY labels feed the same directions.
- Upgrade, swap and enhance grant through the same path as a level-clear pick, and the panel then shows what was gained. A swap carries enhancement to the incoming upgrade (`carryEnhancement`); an Extra Life's life is kept when it is swapped out. Enhance and trade targets are re-rolled at purchase if stale, and buying an enhance relabels a trade tile showing the same upgrade.

## Leaving

Walking back out the left entrance starts the exit: no confirm, input stops, the `playerSlide` system carries the player out and the sprite fades (`storeExitAlpha`). **Click to exit:** clicking the entrance corridor mouth walks the player there at normal speed (`storeExitCellAt`, `storeRouteStep`: a BFS step that avoids unsold tiles, sent as ordinary player input). Escape cancels the walk instead of pausing.
