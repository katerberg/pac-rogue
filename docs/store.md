# Store floors

Quarters are spent at **store floors** — an extra board between some levels with no ghosts, pellets, fruit, or countdown.

## Schedule

`storeAfterLevel(levelIndex, midStoreLevel)` in [`src/domain/store.ts`](../src/domain/store.ts):

- after clearing **level 3** (before level 4)
- after clearing **level 5 or 6** — `pickMidStoreLevel` rolls 50/50 once per run in `PlayScene.create()`
- after clearing **level 8** (`STORE_FINAL_LEVEL`), right before the level-9 boss

On a level that also offers the level-clear upgrade modal (3, 5, 6, 8), the modal resolves first, then the usual transition freeze, then the store. Entering the store does not apply per-level life regen; the regen happens on the normal advance after the store.

## Layout

`STORE_MAZE_ASCII` in [`src/domain/mazeLayouts.ts`](../src/domain/mazeLayouts.ts): a 28×31 grid of solid 5-wide wall blocks separated by 1-tile corridors (about half the interior is wall), with each slot cut into a block corner so it opens onto two corridors. It is activated with `activateAsciiLayout(ascii, "store")`, the only layout id allowed to have zero pellets **and no ghost house** (ghost-house spawn/exit and fruit cell fall back to the player spawn; the store never spawns ghosts or fruit). Tunnels open on all four sides (row 14, cols 13–14).

Slot glyphs are walkable empty cells to the maze builder; `parseStoreSlots` turns each 2×2 block into a slot (row, then col order):

| Glyph | Slot                                                       | Price                                                                      |
| ----- | ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| `L`   | Extra life (+1 life), unlimited                            | `STORE_LIFE_PRICE` (1)                                                     |
| `U`   | Random unowned upgrade                                     | `storePriceFor(id)` — `UpgradeDef.storePrice` or `STORE_UPGRADE_PRICE` (3) |
| `S`   | Swap: lose a shown owned upgrade, gain a hidden random one | `STORE_SWAP_PRICE` (1)                                                     |

`createStoreState` rolls stock once on entry: three distinct unowned upgrades (fewer if the pool is short — unfilled slots are omitted) and, if anything is owned, a swap whose outgoing upgrade is picked at random. No restock.

## Movement

In the store the player stops when no direction is held: `playerInput.apply(world, true)` writes `none` on release, and `movement(..., playerStopOnRelease = true)` finishes the move to the next cell center and stops there. Maze boards are unchanged.

## Music

Store floors loop `storeMusic` (`sound/store.ogg`, music category) instead of `gameplayMusic`: entering stops the level track and starts the store track (after the level-complete fanfare if it is still playing); leaving stops it and the next level resumes `gameplayMusic`. Settings opened from the pause menu in a store controls `storeMusic` (`PlayScene.currentMusicId()` is passed through `PauseScene`).

## Buying

`storeStep` is the prompt state machine, fed the player cell (`playerCell` system) plus the frame's toggle (Left/Right/A/D) and confirm (Enter/Space) `JustDown`s:

- Stepping onto an unsold slot you can afford opens a big centered modal (`storeOverlay.ts`, same card size as the upgrade-choice modal): name, description, `COST n`, and `SURE?  YES  NO` with **NO** focused — the same pattern as the pause menu's Quit confirm.
- While the modal is open every key except Left/Right (toggle YES/NO), Enter/Space (choose), and Escape (pause) is ignored; `PlayScene` clears the player's direction input so the player settles on the tile center.
- Choosing **NO** closes the modal; stepping off and back on re-opens it. After the modal closes, movement waits for held keys to be released.
- A slot you can't buy (too few Quarters → `NEED n QUARTERS`, or a swap with an empty pool → `NOTHING TO SWAP`) only shows the right-hand info panel; no modal.
- Life: +1 life; the modal stays open with **YES** focused so Enter repeats until you run out of Quarters.
- Upgrade: granted (same side effects as a level-clear pick), tile disappears, the side panel shows `GOT IT!` for 2s.
- Swap: incoming upgrade is drawn at purchase from upgrades that are unowned and not still on the shelf; the outgoing one is revoked (an Extra Life's life is kept) and the incoming one granted and revealed. Empty pool → `NOTHING TO SWAP`.
- Hovering a tile with the mouse shows its info in the side panel when no modal or toast is showing.
- Tiles are outlined with a thin dotted line in the maze color so they read as buttons, not walls.
- Each tile shows its letter (centered on the glyph's ink via `glyphInkCenterOffsetX`, since VGA glyphs sit left in their 8px cell) — or the life icon / `?` — above a row of quarter icons, one per Quarter of price. A price too wide for the tile packs the icons so they overlap.

## Leaving

Reaching any border cell (a tunnel mouth) leaves immediately — no confirm, no time limit. This advances to the next level (`LEVEL N` banner; after level 8 the `BOSS` banner for level 9). Only a `?store=1&level=9` debug store ends in `RUN COMPLETE`.

## Debug

`?store=1` starts the run in a store for the current level (level 3 when `?level` is omitted), skips the level-1 starting upgrade, and disables high-score saving. Combine with `?quarters=` and `?enableUpgrade=`.
