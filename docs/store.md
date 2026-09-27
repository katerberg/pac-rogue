# Store floors

Quarters are spent at **store floors** — an extra board between some levels with no ghosts, pellets, fruit, or countdown.

## Schedule

`storeAfterLevel(levelIndex, midStoreLevel)` in [`src/domain/store.ts`](../src/domain/store.ts):

- after clearing **level 3** (before level 4)
- after clearing **level 5 or 6** — `pickMidStoreLevel` rolls 50/50 once per run in `PlayScene.create()`
- after clearing **level 8** (before `RUN COMPLETE`)

On a level that also offers the level-clear upgrade modal (3, 5, 6), the modal resolves first, then the usual transition freeze, then the store. Entering the store does not apply per-level life regen; the regen happens on the normal advance after the store.

## Layout

`STORE_MAZE_ASCII` in [`src/domain/mazeLayouts.ts`](../src/domain/mazeLayouts.ts): a 28×31 open room with a few 3×2 blocks and the (empty) ghost house as the centerpiece. It is activated with `activateAsciiLayout(ascii, "store")`, the only layout id allowed to have zero pellets. Tunnels open on all four sides (row 14, cols 13–14).

Slot glyphs are walkable empty cells to the maze builder; `parseStoreSlots` turns each 2×2 block into a slot (row, then col order):

| Glyph | Slot                                                       | Price                                                                      |
| ----- | ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| `L`   | Extra life (+1 life), unlimited                            | `STORE_LIFE_PRICE` (1)                                                     |
| `U`   | Random unowned upgrade                                     | `storePriceFor(id)` — `UpgradeDef.storePrice` or `STORE_UPGRADE_PRICE` (3) |
| `S`   | Swap: lose a shown owned upgrade, gain a hidden random one | `STORE_SWAP_PRICE` (1)                                                     |

`createStoreState` rolls stock once on entry: three distinct unowned upgrades (fewer if the pool is short — unfilled slots are omitted) and, if anything is owned, a swap whose outgoing upgrade is picked at random. No restock.

## Movement

In the store the player stops when no direction is held: `playerInput.apply(world, true)` writes `none` on release, and `movement(..., playerStopOnRelease = true)` finishes the move to the next cell center and stops there. Maze boards are unchanged.

## Buying

`storeStep` is the prompt state machine, fed the player cell (`playerCell` system) plus Y/N `JustDown` each frame:

- Stepping onto any cell of an unsold slot opens its prompt in the right-hand panel (`storeOverlay.ts`): name, description, `COST n / SURE? Y/N`.
- `N` dismisses; stepping off and back on re-opens it.
- `Y` with enough Quarters buys. Too few → `NEED n QUARTERS` and `Y` does nothing.
- Life: +1 life, prompt stays open so `Y` can repeat.
- Upgrade: granted (same side effects as a level-clear pick), tile disappears, panel shows `GOT IT!` for 2s.
- Swap: incoming upgrade is drawn at purchase from upgrades that are unowned and not still on the shelf; the outgoing one is revoked (an Extra Life's life is kept) and the incoming one granted and revealed. Empty pool → `NOTHING TO SWAP`.
- Hovering a tile with the mouse shows the same info (without Y/N) when no prompt or toast is showing.

## Leaving

Reaching any border cell (a tunnel mouth) leaves immediately — no confirm, no time limit. After levels 3 and 5/6 this advances to the next level (`LEVEL N` banner); after level 8 it shows `RUN COMPLETE`.

## Debug

`?store=1` starts the run in a store for the current level (level 3 when `?level` is omitted), skips the level-1 starting upgrade, and disables high-score saving. Combine with `?quarters=` and `?enableUpgrade=`.
