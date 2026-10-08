# Maze layout constraints

Rectangular ASCII mazes of variable size. Levels ≥ 2 can use the procedural tiling generator (`src/domain/mazeTiling.ts` + `mazeGenerate.ts`); hand-authored fixtures and generated boards must satisfy these rules so placement, tunnels, and the fixed 800×600 canvas stay correct.

## Size band and fixed tile size

Nominal band: **20–32 cols × 21–36 rows**.

Playfield stays **800×600** (`PLAYFIELD_*`). Every layout uses the same fixed tile size, `TILE_SIZE_PX` (20px, `src/domain/maze.ts`) — Pac-Man, ghosts, and wall strokes render at the same pixel size on every level. 20px is large enough that level-2+ **28×34** generated boards fill the view after the thick outer wall ring is cropped off-screen; it is **not** refit per layout.

```text
pixelWidth = cols * TILE_SIZE_PX
pixelHeight = rows * TILE_SIZE_PX
offsetX = (800 - pixelWidth) / 2
# short boards: center between HUD_TOP_MARGIN_PX (32 — clears BONUS) and
#   HUD_BOTTOM_MARGIN_PX (8 — lives inset)
# tall boards: playfield-centered crop, then shift down by HUD_TOP_MARGIN_PX so
#   the gaps below BONUS and at the bottom edge match
```

Hard rejects:

- `pixelWidth > 800`
- `offsetX < 80` (left HUD gutter — upgrades/lives stay at playfield `x ≈ 12`)

Generated **28×34** → tile **20** (560×680, side gutter 120; outer wall ring cropped, then shifted so the gaps below BONUS and under the maze match). Classic **28×31** is the same tile. Level-1 **22×21** `mazeSmall` uses the **same** 20px tile — smaller centered footprint. Life / shield HUD icons that would extend past `offsetX` are omitted.

## ASCII legend

| Char | Meaning                                              |
| ---- | ---------------------------------------------------- |
| `#`  | wall                                                 |
| `.`  | regular pellet (walkable)                            |
| `@`  | power pellet (walkable)                              |
| `-`  | walkable corridor, **no** pellet (preferred)         |
| ` `  | alias for `-` (back-compat / exterior pockets)       |
| `=`  | house door (exactly **2** contiguous on one row)     |
| `H`  | house floor                                          |
| `P`  | optional explicit player spawn (walkable, no pellet) |

Pellets are **only** `.` and `@`. Empty corridors are explicit; the runtime never auto-fills walkables with dots.

Player spawn: single `P` if present; otherwise lowest empty-corridor cell in the center col(s) (`floor/ceil((cols-1)/2)`). Odd or even col counts are allowed.

## Ghost house

Required on every layout except the store floor (`activateAsciiLayout(ascii, "store")`), which has no house — see [docs/store.md](./store.md).

- Door: width **2**, on the top of the house block.
- Floors: `H` bbox at least **6×3**; soft max width **10** (authoring guidance only).
- Spawn-row non-door `H` count **≥ 4** (four ghost seats).
- Exit: first player-walkable cell above door mid-col.
- Fruit: first player-walkable cell below the house on house center col.

## Tunnels

- Horizontal only for generation / ghost tunnel slowdown.
- At least one tunnel row (both edge cells walkable); **no adjacent** tunnel rows (each tunnel is 1 row high).
- Opposite-edge safety still closes one-sided openings.
- Tunnel slow band: `col ≤ floor(cols*5/28)` or `col ≥ cols - floor(cols*6/28)` (classic 5 / 6 on 28-col).

## Scatter targets

Derived from active layout bounds (classic-equivalent margins):

- Blinky `(cols-3, -3)`, Pinky `(2, -3)`, Inky `(cols-1, rows+2)`, Clyde `(0, rows+2)`

## Thresholds

Fruit / Inky / Clyde / Elroy pellet thresholds scale vs maze1 pellet count (unchanged formula).

## Procedural (levels ≥ 2)

- Tiling solver on a 9×11 mirrored polyomino grid with a fixed center house, rasterized to **28×34** ASCII (2×2 wall cells, 1-cell corridors, outer border) → tile 20, gutter 120 (border ring crops off-screen).
- **Density:** aim for `GENERATED_PELLET_TARGET` (240, near classic maze1's 244). Corridor comes from piece boundaries, so the shape draw leans on small pieces; the attempt loop returns the first board at or above the target and otherwise the densest board it saw. Delivered boards run ~226–252 pellets, mean ~240.
- Horizontal tunnels only; **1 or 2** tunnel rows, and only on the tiling's corridor rows (`1 + sy*3 + 2`), which keeps them ≥ 3 apart and stops a tunnel from running alongside the corridor row next to it.
- **No parallel corridors:** no 2×2 block of player-open cells anywhere. Two side-by-side lanes read as a double line rather than a maze; a 2×2 open block is exactly that case, and plus/T intersections never form one. Checked on `playerSolids` (so it covers what the player can actually reach) and rejected, not patched. This subsumes the older “no 2×2 pellet blocks” rule.
- The house stamp fills the solver's center piece exactly (rows 16–20, cols 10–17), so the corridor rows above and below it are the door approach and the fruit row — no carving, which is what used to produce parallel corridors under the house.
- Corridor pellets: no house-adjacent dots, none orthogonally touching the spawn; interior wall runs prefer thickness ≥ 2; spawn marked `P`.
- **No dead ends:** after tunnels, iteratively wall-fill every player-corridor cell with orthogonal degree &lt; 2 (and its mirror) until none remain; reject the candidate if ASCII or `playerSolids` still has a tip.
- Deterministic from `boardMazeSeed(runSeed, levelIndex)` with up to 32 attempt suffixes (~110ms per board); fall back to `maze2` and `console.warn` only when no attempt produces a valid board.
- Level 1 stays `mazeSmall` (or `?maze=` override). `?maze=` still forces the first board of a Start at any level.

## Layout ids

| Id                  | Role                                                                    |
| ------------------- | ----------------------------------------------------------------------- |
| `maze1` / `maze2`   | Static fixtures; `maze2` generate fallback                              |
| `mazeSmall` (22×21) | Level 1 default; also `?maze=`                                          |
| `generated`         | Runtime id for activated procedural ASCII (not in `?maze=` / pick pool) |

## Out of scope

Vertical tunnels, non-rectangular grids, multi-house, canvas resize / camera scroll, `?mazeSeed=` URL, per-board random dimensions.
