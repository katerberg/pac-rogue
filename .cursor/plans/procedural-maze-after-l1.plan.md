# Procedural mazes after level 1 (tiling solver → ASCII)

## Goal

Ship a domain tiling-solver maze generator (same pattern as the Ms. Pac-Man tile study: mirrored polyomino islands + fixed center house + corridor pellets) that emits human-readable ASCII. **Level 1** keeps today’s static `maze1`/`maze2` pool. **Levels ≥ 2** activate a generated board (deterministic from a run seed + level). Keep existing pipe-wall rendering; satisfy `docs/maze-constraints.md` plus the locked playability rules below.

## Locked decisions

| ID  | Decision                                                                                                                                                                                                                                                                                                            | Source                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| 1   | Port the **tiling-solver pattern** (shapes, orientations, mirror, center house, weighted search, rectangle bans). Emit **ASCII strings** like `mazeLayouts.ts`, not pixels/SVG.                                                                                                                                     | user                                 |
| 2   | Size must pass `computeMazeGeometry` / band **20–32 × 21–36**. **Default generated size: 28×31** via scale map below. Change to another _single_ fixed size in-band only if 28×31 mapping fails fit or house rules. No per-board random dimensions in v1.                                                           | user + default                       |
| 3   | **Interior** wall runs ≥ **2 tiles thick** (pipe strokes read as channels). Outer border may stay 1-tile.                                                                                                                                                                                                           | user                                 |
| 4   | No pellets on **spawn cell(s) only** (use `P`; do not clear a larger ledge).                                                                                                                                                                                                                                        | user                                 |
| 5   | **Horizontal** tunnels only.                                                                                                                                                                                                                                                                                        | user                                 |
| 6   | Tunnel count **1 or 2** per board; never adjacent tunnel rows (`docs/maze-constraints.md`).                                                                                                                                                                                                                         | user (revised from 1–3)              |
| 7   | On generate failure after retries: **rare fallback** to `maze2` + `console.warn`.                                                                                                                                                                                                                                   | user                                 |
| 8   | **Static pool only when `levelIndex === 1`**. `?level=2+` without `?maze=` → first board is generated.                                                                                                                                                                                                              | user                                 |
| 9   | Exactly **4** power pellets in **classic corner** positions (near four playable corners).                                                                                                                                                                                                                           | user                                 |
| 10  | **Deterministic** from seed: `ascii = generateMazeAscii(seed)`. Run picks one `runMazeSeed` at `PlayScene` create; board seed = `boardMazeSeed(runMazeSeed, levelIndex)`. **No `?mazeSeed=` URL** in v1 (skip bloat).                                                                                               | user                                 |
| 11  | **Do not** change wall rendering / colors / island skin.                                                                                                                                                                                                                                                            | user                                 |
| 12  | If `?maze=` is present, **force that static layout for the first board of the Start** even when `level ≥ 2`. Later level-ups in the same run still generate (override is first-board only, same as today).                                                                                                          | user                                 |
| A   | Level 1 (no maze override): unchanged `pickLayoutId` over `maze1`/`maze2`.                                                                                                                                                                                                                                          | approve-default                      |
| B   | Hard constraints on every accepted generate: house-perimeter has no `.`/`@`; no 2×2+ pellet blocks; no dead-end walkable cells in the player graph (tunnels count as edges); spawn cell(s) are `P` not pellets; interior walls thickness rule; tunnels ∈ {1,2}, non-adjacent; constraints doc house/door/fit rules. | approve-default + Decide             |
| C   | Pure domain modules; PlayScene only selects/activates.                                                                                                                                                                                                                                                              | approve-default                      |
| D   | Generated ASCII goes through the same `buildLayout` / activate / spawn / threshold-scaling path as fixtures.                                                                                                                                                                                                        | approve-default                      |
| E   | Fixed center ghost house stamped to satisfy door width 2, `H` bbox ≥ 6×3, spawn-row floors ≥ 4 (`docs/maze-constraints.md`). Derive spawn/exit/fruit via existing `maze.ts` helpers.                                                                                                                                | approve-default + constraints doc    |
| F   | Left–right mirror symmetry (solver + ASCII).                                                                                                                                                                                                                                                                        | approve-default                      |
| G   | Pellets only on validated corridor cells (`.`, `@`); empty walkables are `-` (or `P`). Never flood-fill every empty cell.                                                                                                                                                                                           | approve-default + constraints legend |
| H   | Retry up to **32** seeds derived from the board seed; then fallback `maze2`.                                                                                                                                                                                                                                        | approve-default                      |
| I   | Generation target typically **&lt; 50ms**; no loading UI.                                                                                                                                                                                                                                                           | approve-default                      |
| J   | Docs: update `docs/maze-constraints.md`, `docs/ARCHITECTURE.md`, README Flags/overview.                                                                                                                                                                                                                             | approve-default                      |
| K   | Unit tests for generator invariants + PlayScene selection behavior; keep maze1/maze2/mazeSmall fixtures green.                                                                                                                                                                                                      | approve-default                      |
| L   | Verification: `npm run verify` + live visual on **5174** (`?play=1&level=2`).                                                                                                                                                                                                                                       | approve-default                      |
| M   | Out of scope listed below.                                                                                                                                                                                                                                                                                          | approve-default + Decide 10/11       |
| N   | Late PR steps: `/simplify-pr` then `/no-comments`.                                                                                                                                                                                                                                                                  | project rule                         |
| O   | No new npm dependencies.                                                                                                                                                                                                                                                                                            | approve-default                      |

## Today’s world (brief)

- Variable-size ASCII mazes already work (`MAZE_COLS` synced on `activateLayout`; fit gates in `computeMazeGeometry`). Legend and house/tunnel rules live in `docs/maze-constraints.md`.
- Play pool is still static: `pickLayoutId` → `maze1`/`maze2`; `mazeSmall` is `?maze=` fixture only. Level advance always re-picks static layouts.
- Uploaded HTML solver: 9×10 tiling, shapes `{domino,straight,t,c,l}`, fixed 3×2 center, mirror placements, `formsRectangle` bans, weighted backtracking, corridor pellet graph (strip house perimeter, prune degree &lt; 2), single tunnel row, pixel paint — **reference algorithm only**, not a runtime dependency.

## Approach

### 1. Port solver → `src/domain/mazeTiling.ts`

- Translate the HTML `solver.js` core to TypeScript: `WIDTH=9`, `HEIGHT=10`, `SHAPES`, `CENTER`, `SHAPE_WEIGHTS`, orientations, mirror, option build, conflict bitsets (`bigint`), weighted search, `solve(seed) → { pieces, stats }`.
- Seeded RNG: FNV-ish / mulberry32 equivalent of the HTML `randomFromSeed` (same idea: string seed → `() => number`).
- Keep required L/T quotas from the reference (at least one `l`, two `t`) unless a unit test proves they make ASCII mapping fail often — then drop quotas only with a code comment citing the failure mode (prefer keep).

### 2. Rasterize pieces → ASCII → `src/domain/mazeGenerate.ts`

**Scale map (locked default → 28×31):**

- Each solver cell occupies a **2×2** wall block.
- Between consecutive solver rows/cols, a **1-cell** gap: fill with `#` if both adjacent cells belong to the **same** piece; else corridor (`-` candidate).
- Outer **1-cell** `#` border.
- Dims: `cols = 9*2 + 8*1 + 2 = 28`, `rows = 10*2 + 9*1 + 2 = 31`.

**House stamp:** Overwrite the center 3×2 solver region with a constraints-legal house block matching classic topology (door `==` width 2 on house top, three `H` rows with ≥6 floors, walls around). Clear pellets on house perimeter cells (corridors touching house walls stay `-`, never `.`/`@`).

**Tunnels:** From board seed, choose **1 or 2** distinct non-adjacent rows from the allowed interior set (not border, not power-corner rows if that would break corner `@`, not house rows). Open both edge cells on those rows to walkable (`-` or tunnel mouth). Enforce opposite-edge safety via existing parse path.

**Corridors / pellets:**

- Build the dual corridor graph from piece boundaries (port `corridorPellets` idea onto the ASCII grid: walkable cells that are not house/door/spawn).
- Prune dead ends until every remaining pellet-eligible cell has degree ≥ 2 (counting horizontal tunnel wraps).
- Reject 2×2 blocks of pellet chars.
- Place `.` on surviving corridor cells; leave other walkables as `-`.
- Place four `@` at classic corners: near `(1,1)`, `(cols-2,1)`, `(1,rows-2)`, `(cols-2,rows-2)` — snap each to nearest surviving corridor cell in that quadrant if the exact cell is wall; if impossible, reject board and retry.
- Set player spawn: single `P` at lowest center-col empty corridor (or explicit shelf under house like maze1 row), **no** pellet on that cell.

**Validate** before accept (throw/reject → retry):

- `computeMazeGeometry(cols, rows)` succeeds.
- Existing layout build would succeed (house/door/exit/fruit/pelletCount &gt; 0).
- Constraints: door width 2, house floors, tunnels 1–2 non-adjacent, symmetry, thickness (no interior 1-wide wall run that is a lone `#` separator between two corridors — detect with a local pattern check), no house-adjacent pellets, no pellet blocks, no dead ends, spawn is `P`.

**Public API:**

```ts
export function boardMazeSeed(runSeed: string, levelIndex: number): string;
export function generateMazeAscii(seed: string): string; // throws if one attempt fails
export function generateMazeAsciiWithRetries(
  seed: string,
  maxAttempts?: number,
): { ascii: string; seedUsed: string } | null;
```

`maxAttempts` default **32**. Attempts use `seed`, `seed#1`, `seed#2`, …

### 3. Activate generated layouts → `maze.ts` / `mazeLayouts.ts`

- Add layout id `"generated"` **or** `activateAsciiLayout(ascii: string, id?: string)` that builds via shared `buildLayoutFromAscii` without requiring a static table entry. Prefer: extract `buildLayoutFromAscii(id, ascii)` used by `buildLayout(id)` and by generate activation; cache static ids only; generated boards always rebuild (or cache by seed string keyed as `gen:${seed}` if cheap).
- Do **not** add `"generated"` to `pickLayoutId` pool.
- `parseMazeParam` unchanged (`maze1`/`maze2`/`mazeSmall` only).

### 4. Wire `PlayScene`

- At create: `this.runMazeSeed = String(Math.floor(Math.random() * 2**32))` (or two uints joined); keep `mazeOverride` from URL.
- Replace `startBoard` selection:

```text
if (layoutOverride != null) → activateLayout(layoutOverride)
else if (levelIndex === 1) → activateLayout(pickLayoutId(Math.random, null))
else → generateMazeAsciiWithRetries(boardMazeSeed(runMazeSeed, levelIndex))
         on success → activateAsciiLayout(ascii)
         on null → console.warn(...); activateLayout("maze2")
```

- `advanceToNextLevel` keeps calling `startBoard(null)` (generates).
- Initial `create` still passes URL maze override into first `startBoard` only.

### 5. Docs

- `docs/maze-constraints.md`: remove “procedural generator” from out-of-scope; add short “Procedural (levels ≥ 2)” section pointing at tiling module, 28×31 default, tunnels 1–2, seed rule, fallback.
- `docs/ARCHITECTURE.md`: list `mazeTiling.ts` / `mazeGenerate.ts` under domain.
- `README.md`: Flags — later levels use generator; `?maze=` still forces first board; `?level=2+` starts generated unless maze override; link constraints doc.

## Data / contracts

| Symbol                                                             | Shape                                                      |
| ------------------------------------------------------------------ | ---------------------------------------------------------- |
| `generateMazeAscii(seed: string): string`                          | Multiline ASCII; rows equal length; legend per constraints |
| `generateMazeAsciiWithRetries(seed: string, maxAttempts?: number)` | `{ ascii, seedUsed } \| null`                              |
| `boardMazeSeed(runSeed: string, levelIndex: number): string`       | Stable string                                              |
| `activateAsciiLayout(ascii: string): MazeLayout`                   | Sets active geometry like `activateLayout`                 |
| ASCII chars                                                        | `# . @ - = H P` only for generated output                  |

Thresholds: scale vs `maze1` pellet count (same as other non-maze1 layouts).

## Failure behavior

| Case                                     | Behavior                                   |
| ---------------------------------------- | ------------------------------------------ |
| Single seed attempt invalid              | Retry next attempt suffix                  |
| All 32 fail                              | `console.warn` with seed; activate `maze2` |
| `?maze=bogus`                            | Existing warn; ignore override             |
| Generator throw in tests without retries | Fail the test                              |

No user-facing error modal.

## Docs

- Update `docs/maze-constraints.md`, `docs/ARCHITECTURE.md`, `README.md` (Flags + overview sentence).
- Same PR as code.

## Acceptance tests

**Automated**

1. `generateMazeAsciiWithRetries` for ≥20 distinct seeds returns non-null ASCII; each: dims 28×31 (or locked alternate), symmetric, tunnels 1–2 non-adjacent, 4 `@`, has `P`, no `.`/`@` on house-neighbor cells, no 2×2 pellet block, no dead-end walkables, `activateAsciiLayout` succeeds, `pelletCount > 0`.
2. Same seed → identical ASCII.
3. `boardMazeSeed` stable; different levels differ.
4. Interior wall-thickness helper rejects a known 1-wide interior separator fixture; accepts generated samples.
5. Selection helper (extract pure function if needed): level 1 → static id; level ≥2 → generate path; override wins at any level for first board.
6. Existing `mazeLayouts` / `maze` tests stay green.
7. `npm run verify` green.

**Manual / visual (agent port 5174)**

1. `?play=1&level=2` — board is not identical to maze1/maze2 ASCII; playable; house/door/pellets/tunnels look correct; pipe walls unchanged style.
2. `?play=1` — level 1 still maze1 or maze2.
3. `?play=1&level=3&maze=maze1` — first board is maze1; after clearing (or force advance if test harness exists), next board generated.
4. Screenshot under artifacts; record what was verified.

## Out of scope

- `?mazeSeed=` / shareable seed URL
- Vertical tunnels
- Changing wall art (pink islands, HTML palette)
- Replacing level-1 static pool
- Per-level difficulty curves for the generator
- Shipping/bundling the HTML file as runtime code
- UI maze editor; high-score seed field
- Randomizing cols/rows per board

## Implementation order

1. Add `mazeTiling.ts` (solver port) + unit smoke (`solve` finds a tiling for fixed seeds).
2. Add `mazeGenerate.ts` (rasterize, house, tunnels, pellets, validate) + invariant tests.
3. Extract/share `buildLayoutFromAscii` / `activateAsciiLayout` in `maze.ts`; wire exports.
4. Wire `PlayScene` selection + `runMazeSeed`.
5. Update docs (`maze-constraints`, `ARCHITECTURE`, README).
6. Run `npm run verify`; fix until green.
7. Live visual on `5174` per Acceptance; keep evidence.
8. **`/simplify-pr`** on the scoped diff (apply in-scope cuts).
9. **`/no-comments`** on the scoped diff (required last).
