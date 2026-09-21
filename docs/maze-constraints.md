# Maze layout constraints

Rectangular ASCII mazes of variable size. Levels ≥ 2 can use the procedural tiling generator (`src/domain/mazeTiling.ts` + `mazeGenerate.ts`); hand-authored fixtures and generated boards must satisfy these rules so placement, tunnels, and the fixed 800×600 canvas stay correct.

## Size band and fit gate

Nominal band: **20–32 cols × 21–36 rows**.

Playfield stays **800×600** (`PLAYFIELD_*`). Geometry is keep-fit under `MAZE_TOP_MARGIN_PX` (28):

```text
TILE = floor(min(800 / cols, 572 / rows))
offsetX = (800 - cols * TILE) / 2
```

Hard rejects after fit:

- `TILE < 12`
- `offsetX < 80` (left HUD gutter — upgrades/lives stay at playfield `x ≈ 12`)

Not every pair in the nominal rectangle is legal. Short + wide boards (e.g. 32×21) fail the gutter gate. From roughly **rows ≥ 28**, the full 20–32 col range clears 80px. Classic **28×31** → tile 18, gutter 148.

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

- Tiling solver on a 9×10 mirrored polyomino grid with a fixed center house, rasterized to **28×31** ASCII (2×2 wall cells, 1-cell corridors, outer border).
- Horizontal tunnels only; **1 or 2** non-adjacent tunnel rows; corridor pellets (no house-adjacent dots, no 2×2 pellet blocks, no dead-end pellet cells); interior wall runs prefer thickness ≥ 2; spawn marked `P`.
- Deterministic from `boardMazeSeed(runSeed, levelIndex)` with up to 32 attempt suffixes; on total failure fall back to `maze2` and `console.warn`.
- Level 1 stays `mazeSmall` (or `?maze=` override). `?maze=` still forces the first board of a Start at any level.

## Layout ids

| Id                  | Role                                                                    |
| ------------------- | ----------------------------------------------------------------------- |
| `maze1` / `maze2`   | Static fixtures; `maze2` generate fallback                              |
| `mazeSmall` (22×21) | Level 1 default; also `?maze=`                                          |
| `generated`         | Runtime id for activated procedural ASCII (not in `?maze=` / pick pool) |

## Out of scope

Vertical tunnels, non-rectangular grids, multi-house, canvas resize / camera scroll, `?mazeSeed=` URL, per-board random dimensions.
