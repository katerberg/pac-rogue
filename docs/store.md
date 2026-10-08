# Store floors

Quarters (from the [BONUS bar](./bonus.md), which fruit and pellet streaks charge, and the level-clear bank choice) are spent at **store floors** — an extra board between some levels with no ghosts, pellets, fruit, or countdown.

## Schedule

`storeAfterLevel(levelIndex, midStoreLevel)` in [`src/domain/store.ts`](../src/domain/store.ts):

- after clearing **level 3** (before level 4)
- after clearing **level 5 or 6** — `pickMidStoreLevel` rolls 50/50 once per run in `PlaySim.start()`
- after clearing **level 8** (`STORE_FINAL_LEVEL`), right before the level-9 boss

On a level that also offers the level-clear upgrade modal (3, 5, 6, 8), the modal resolves first, then the usual transition freeze, then the store. Entering the store applies natural life regen (`STORE_REGEN_AMOUNT`, one life toward the icon floor — see [levels.md](./levels.md#life-regen)) before stocking tiles, then pays [Interest](./upgrades.md#interest) when owned (1 Quarter per 3 held, per 2 enhanced) before you can buy. Debug `?store=1` applies the same store-entry regen.

## Layout

`STORE_MAZE_ASCII` in [`src/domain/mazeLayouts.ts`](../src/domain/mazeLayouts.ts): a 22×21 room (the intro `mazeSmall` footprint) with roomier corridors than the intro: varied shapes built from 2×2 wall cells (L-shapes, a cup around the center upgrade, a T, bars), about 40% of the interior. Walls are never 1 tile thick and never touch only at a corner, which the rounded wall stroke needs. It is activated with `activateAsciiLayout(ascii, "store")`, the only layout id allowed to have zero pellets **and no ghost house** (ghost-house spawn/exit and fruit cell fall back to the player spawn; the store never spawns ghosts or fruit). Tunnels open on all four sides (row 10, cols 10–11).

Slot glyphs are walkable empty cells to the maze builder; `parseStoreSlots` turns each 2×2 block into a slot (row, then col order):

| Glyph | Slot                                                                         | Price                                                      |
| ----- | ---------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `L`   | Extra life (+1 life); two tiles, each sold once                              | `STORE_LIFE_PRICE` (1)                                     |
| `U`   | Random unowned upgrade; two tiles                                            | `storePriceFor(id)` — `UpgradeDef.storePrice` (3; rares 4) |
| `S`   | Trade: lose a shown owned upgrade, gain a hidden random one (same form)      | `STORE_SWAP_PRICE` (1)                                     |
| `E`   | Enhance: a random owned, unenhanced upgrade becomes its enhanced `Plus` form | `STORE_ENHANCE_PRICE` (2)                                  |

`createStoreState(cells, owned, rng, firstStore)` rolls stock once on entry: two distinct unowned upgrades, at most one of them [rare](./upgrades.md#rarity) and rares drawn at half weight (fewer if the pool is short — unfilled slots are omitted), both life tiles, and an enhancement whose target is picked at random from owned upgrades that are not yet enhanced (no such upgrade → no `E` tile). Later stores also stock a trade whose outgoing upgrade is picked at random from anything owned (the incoming one is drawn on purchase, rares at half weight, see [Rarity](./upgrades.md#rarity)); the **first store** (after level 3, `STORE_FIRST_LEVEL`) omits the trade. No restock.

## Movement

In the store the player stops when no direction is held: `applyHeldKeys(world, keys, { diagonalAllowed: true, stopOnRelease: true })` (in `PlaySim.tickStore`) writes `none` on release, and `movement(..., undefined, playerStopOnRelease = true)` settles onto a cell center and stops there. Cardinal release finishes along the facing to the next cell center; diagonal release eases to the **current** cell center (so a single cardinal key can resume after a store confirm). Maze boards are unchanged. Diagonal movement is always allowed here (unlike maze boards, where it's gated behind the `powerPelletWallPass` upgrade) since the store's roomier corridors have genuinely open diagonals and the store never has wallPass — `clearUpgradeTimers` zeroes every timed power-pellet effect, including `wallPassRemainingMs`, on entry, and there are no power pellets inside to retrigger any of them. `movement`'s diagonal branch still requires real open space on all three cells (both flanking cells and the diagonal cell itself) — see [docs/upgrades.md](./upgrades.md#wall-pass) — so the player can't cut through a wall corner even without wallPass.

## Music

Store floors loop `storeMusic` (`sound/store.ogg`, music category) instead of `gameplayMusic`: entering stops the level track and starts the store track (after the level-complete fanfare if it is still playing); leaving stops it and the next level resumes `gameplayMusic`. Settings opened from the pause menu in a store controls `storeMusic` (`PlayScene.currentMusicId()` is passed through `PauseScene`).

## Buying

`storeStep` is the prompt state machine, fed the player cell (`playerCell` system) plus the frame's toggle (Left/Right/A/D) and confirm (Enter/Space) `JustDown`s:

- Stepping onto an unsold slot you can afford opens a big centered modal (`storeOverlay.ts`, same card size as the upgrade-choice modal): name, description, `COST n`, and `SURE?  YES  NO` with **NO** focused — the same pattern as the pause menu's Quit confirm.
- While the modal is open every key except Left/Right (toggle YES/NO), Enter/Space (choose), and Escape (pause) is ignored; `PlayScene` clears the player's direction input so the player settles on the tile center.
- Choosing **NO** closes the modal; stepping off and back on re-opens it. After the modal closes, movement waits for held keys to be released.
- A slot you can't buy (too few Quarters → `NEED n QUARTERS`, a swap with an empty pool → `NOTHING TO SWAP`, or no unenhanced upgrade left → `NOTHING TO ENHANCE`) only shows the right-hand info panel; no modal.
- Life: +1 life, and the tile disappears (two life tiles per store).
- Upgrade: granted (same side effects as a level-clear pick), tile disappears, the side panel shows `GOT IT!` for 2s.
- Swap: incoming upgrade is drawn at purchase from upgrades that are unowned and not still on the shelf; the outgoing one is revoked (an Extra Life's life is kept) and the incoming one granted and revealed. If the outgoing upgrade was enhanced, the incoming one is granted enhanced (`carryEnhancement`). Empty pool → `NOTHING TO SWAP`.
- Enhance: swaps the target (shown on the tile, re-rolled at purchase if it is no longer owned and unenhanced) for its `Plus` form in place; Extra Life grants its extra life; the side panel shows `GOT IT!` with the `+` label. The enhance tile's modal and info panel are titled with the new name (`Freeze+`) and show the def's `enhanceNote`. Buying it also relabels a trade tile that shows the same upgrade.
- Hovering a tile with the mouse shows its info in the side panel when no modal or toast is showing.
- Tiles are outlined with a thin dotted line in the maze color so they read as buttons, not walls. The `E` tile uses a gold line (`STORE_ENHANCE_BORDER_COLOR`) and a pulsing halo behind it (`enhanceGlowAlpha`).
- Each tile shows its letter (centered on the glyph's ink via `glyphInkCenterOffsetX`, since VGA glyphs sit left in their 8px cell) — or the life icon / `?` — above a row of quarter icons, one per Quarter of price. A price too wide for the tile packs the icons so they overlap.

## Leaving

Reaching any border cell (a tunnel mouth) starts the exit — no confirm, no time limit. `storeExitDirection` picks the outward direction, input and prompts stop, and the `playerSlide` system carries Pac-Man straight out through the tunnel (no wrap) for `STORE_EXIT_SLIDE_TILES` (2) tiles. The sprite fades out once it passes the maze edge (`storeExitAlpha`, passed to `render` as `playerAlpha`, which also hides the tunnel twin), then the transition runs. This advances to the next level (`LEVEL N` banner; after level 8 the `BOSS` banner for level 9). Only a `?store=1&level=9` debug store ends in `RUN COMPLETE`.

**Click to exit:** clicking a tunnel mouth (any open border cell, or the tile just outside one; `storeExitCellAt` in [`src/domain/storeRoute.ts`](../src/domain/storeRoute.ts)) walks Pac-Man there at normal speed. Each frame `PlaySim.tickStore` takes the first step of a shortest path (`storeRouteStep`, a 4-way BFS that avoids unsold tiles when another way exists) and writes it as the player's input, so movement, speed and the exit slide are the same as walking by hand. The route ends when the player reaches the exit, or is cancelled by any held direction key, Escape (which then does not open the pause menu), a click anywhere that is not a tunnel, or a tile prompt opening. Hovering a tunnel mouth shows the hand cursor, like the tiles (`PlaySim.storeExitUnder`; `play.cursor` in the snapshot). `play.storeRoute` in the snapshot is the target cell, else `null`.

## Debug

`?store=1|2|3` starts the run in the 1st, 2nd or 3rd store (level 3, the seeded mid store at level 5 or 6, level 8); an explicit `?level` overrides the level, skips the level-1 starting upgrade, and disables high-score saving. Combine with `?quarters=` and `?enableUpgrade=`.
