# Maze layout constraints

Mazes are rectangular ASCII grids parsed and validated in `src/domain/maze.ts` (the validation code is the enforced spec; sizes, tile size and thresholds are constants there and in `playfield.ts`). Hand-authored fixtures and generated boards must pass the same checks. Generator: `mazeTiling.ts` + `mazeGenerate.ts`; layout ids: `mazeLayouts.ts`.

## Fit

The playfield is fixed; every layout uses one fixed tile size (`TILE_SIZE_PX`), so actors and strokes render the same on every board. The tile size is capped by the tallest layout in use. A layout is rejected if it overflows the playfield, or leaves the left HUD gutter (upgrades/lives) too narrow. At today's tile size only height can reject.

## ASCII legend

- `#` wall; `.` regular pellet; `@` power pellet; `-` (or space) walkable, no pellet; `=` house door (exactly 2 contiguous on one row); `H` house floor; `P` optional explicit player spawn.
- Pellets are only `.` and `@`; the runtime never auto-fills corridors.
- Spawn: the single `P`, else the lowest empty-corridor cell in the centre column(s).

## Ghost house, tunnels

- Every layout except the store has a house: 2-wide door on top, a floor meeting `HOUSE_FLOOR_MIN_*` / `HOUSE_SPAWN_ROW_MIN_FLOORS` in `maze.ts` (seats interpolate across the spawn-row width), an exit above the door and a fruit cell below the house, all **derived** from the ASCII.
- Tunnels are horizontal only, at least one per board, never adjacent. The slow band is a fraction of columns, so it scales with width. Scatter targets and pellet-based thresholds also scale with the layout.

## Play boards

- Level 1: curated `mazeSmall`.
- Levels 2–8: one map drawn from the committed pool (`src/domain/mazePool.json`, `pickPoolIndex(runSeed)`); the same base is reused for the run. Inversion (6–7) and timed tunnels (7–8) still apply on top. Layout label: `pool-<index>`.
- Level 9 (boss): still live-generated from `boardMazeSeed` (tunnel count can be forced); fallback `maze2` with a `console.warn` on failure.
- `?maze=maze1|maze2|mazeSmall` forces that fixture for the first board; `?maze=<n>` forces pool index `n` (dense `0..count-1`).

## Generator (offline / boss)

Solved on a mirrored polyomino tiling with a fixed centre house and rasterized to 28x34 ASCII. Invariants (reject, never patch): pellet count near `GENERATED_PELLET_TARGET`; 1-2 tunnel rows on corridor rows only; **no 2x2 block of player-open cells** (no parallel corridors); **no dead ends**; no house-adjacent or spawn-adjacent dots. Code: `mazeTiling.ts` + `mazeGenerate.ts`.

To expand the pool later: `npm run maze:generate` writes `artifacts/mazes/candidates.json` (gitignored). Curate offline (the old `/mazes/` Yes/No page remains in git history), renumber kept maps to dense ids, and replace `src/domain/mazePool.json`.

Out of scope: vertical tunnels, non-rectangular grids, multi-house, canvas resize or scroll.
