# Maze layout constraints

Mazes are rectangular ASCII grids parsed and validated in `src/domain/maze.ts` (the validation code is the enforced spec; sizes, tile size and thresholds are constants there and in `playfield.ts`). Hand-authored fixtures and generated boards must pass the same checks. Generator: `mazeTiling.ts` + `mazeGenerate.ts`; layout ids: `mazeLayouts.ts`.

## Fit

The playfield is fixed; every layout uses one fixed tile size (`TILE_SIZE_PX`), so actors and strokes render the same on every board. The tile size is capped by the tallest layout in use. A layout is rejected if it overflows the playfield, or leaves the left HUD gutter (upgrades/lives) too narrow. At today's tile size only height can reject.

## ASCII legend

- `#` wall; `.` regular pellet; `@` power pellet; `-` (or space) walkable, no pellet; `=` house door (exactly 2 contiguous on one row); `H` house floor; `P` optional explicit player spawn.
- Pellets are only `.` and `@`; the runtime never auto-fills corridors.
- Spawn: the single `P`, else the lowest empty-corridor cell in the centre column(s).

## Ghost house, tunnels

- Every layout except the store has a house: 2-wide door on top, a floor big enough for four seats, an exit above the door and a fruit cell below the house, all **derived** from the ASCII.
- Tunnels are horizontal only, at least one per board, never adjacent. The slow band is a fraction of columns, so it scales with width. Scatter targets and pellet-based thresholds also scale with the layout.

## Procedural boards (levels 2+)

Solved on a mirrored polyomino tiling with a fixed centre house and rasterized to 28x34 ASCII. Invariants the generator enforces (reject, never patch): pellet count near `GENERATED_PELLET_TARGET`; 1-2 tunnel rows on corridor rows only; **no 2x2 block of player-open cells** (no parallel corridors); **no dead ends**; no house-adjacent or spawn-adjacent dots. Boards are deterministic from `boardMazeSeed(runSeed, levelIndex)`: one base map per run shared by levels 2-8 (variants like inversion are applied on top), with the boss board keyed separately, with bounded retries, falling back to `maze2` with a `console.warn`. `?maze=` forces the first board.

## Pool curation (dev)

Play still uses the live generator for levels 2+. To curate a fixed pool for a later wiring change:

1. `npm run maze:generate` (`--count N` overrides the script default) writes `artifacts/mazes/candidates.json` (gitignored).
2. Open `/mazes/` on the human or agent **dev** server (candidates middleware is also wired for preview) and Yes/No each board (keys `Y`/`→` yes, `N`/`←` no, `U` undo; Reset clears decisions). Decisions stay in `localStorage` for that candidates batch.
3. **Download pool** exports `maze-pool.json` of the Yes maps (~200 is the intended keep size; the tool does not enforce a cap).

The curator shows upright bases only. Wiring that pool into levels 2–8 (one draw per run, boss still generated, invert on 6–7 kept) is a follow-up.

Out of scope: vertical tunnels, non-rectangular grids, multi-house, canvas resize or scroll.
