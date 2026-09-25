# Learn mode

`MenuScene` → **LEARN** opens `LearnScene`: a no-stakes sandbox on the level-1 `mazeSmall` board
where the player drives Maze-Man around while one chosen ghost chases them, with its targeting drawn
live.

## Seen record

Only ghosts, corruptions, and upgrades this machine has met in real play are selectable.

- [`src/domain/seenRecord.ts`](../src/domain/seenRecord.ts): `SeenRecord` (`ghosts`, `corruptions`,
  `upgrades`), parse/serialize, `withSeenGhosts` / `withSeenCorruption` / `withSeenUpgrade` merges
  (return the same object when nothing is new), `allSeenRecord`, `parseLearnAllMode`.
- [`src/game/storage/seenRecordStorage.ts`](../src/game/storage/seenRecordStorage.ts): localStorage
  key `pac-rogue.seen.v1`. Missing, unreadable, or malformed data → empty record; a record saved
  before `upgrades` existed parses with `upgrades: []`.
- `PlayScene.startBoard` records every ghost kind it spawns and the run's corruption once
  `maybeAssignCorruption` assigns it (including `?forceCorruption=`). `PlayScene` also records every
  currently-owned upgrade id whenever `runUpgrades.owned` can grow: the initial `?enableUpgrade=`
  set, the level-1 starting-upgrade grant, and a level-clear modal confirm — an upgrade only ever
  seen via `?enableUpgrade=` still counts as seen, the same treatment `?forceCorruption=` already
  gets for corruptions.
- `?learnAll=1` treats every ghost, corruption, and upgrade as seen without touching storage.
  `?learnAll=0` treats **nothing** as seen — overriding real localStorage — useful for exercising the
  empty `PLAY TO MEET GHOSTS` state on demand. Either way the seen record is read-only in Learn; only
  `PlayScene` ever writes it.

## Screen

- Title, then four ghost slots (Blinky, Pinky, Inky, Clyde). Unseen slots show a black silhouette
  and cannot be picked. The selected slot has a yellow frame.
- Seen upgrades are listed to the left of the maze, one row per seen `UpgradeDef` in canonical
  `UPGRADE_DEFS` order: a checkbox + label, filled in yellow while selected. Multiple upgrades can be
  selected at once (a local `RunUpgrades` bag, not tied to any real run) and stay selected across a
  ghost switch — only the five transient power-pellet timers (freeze/scatter/wall-pass/invuln/speed
  -burst) and any in-flight recall hold reset when the ghost changes.
- Hovering an upgrade row for `HOVER_PREVIEW_DELAY_MS` (500ms) shows a preview card near the pointer
  on the left side of the screen (fixed `HOVER_PREVIEW_X`, y follows the pointer clamped to stay
  on-screen) — never over the play area — using `buildUpgradeCardVisual` from
  [`src/game/scenes/upgradeChoiceModal.ts`](../src/game/scenes/upgradeChoiceModal.ts), the same
  function the level-clear upgrade picker's buttons use, so the card matches exactly (bg, border,
  label, description). Moving off the row before the delay elapses cancels it; moving to a new row
  restarts the delay (and re-anchors to that row's pointer position).
- Selecting an upgrade with no observable effect on this board (see "Upgrade fidelity" below) shows a
  small two-line banner positioned between the ghost slots and the maze (`NO_EFFECT_BANNER_Y`),
  capped to the maze's own pixel width (`wrapText` wraps the names line if it would overflow): the
  selected upgrade name(s) on the first line, `NO VISIBLE EFFECT HERE` always on its own line below.
- Seen corruptions are listed to the right of the maze (color swatch + label). Clicking one applies
  it to the selected ghost; clicking it again removes it. Only one corruption at a time. Blinky can
  be corrupted here even though real runs never corrupt him.
- Nothing seen yet → `PLAY TO MEET GHOSTS` over the maze; only Maze-Man spawns.

## Controls

Arrows / WASD move, `1`–`4` or click select a ghost slot, click toggles a corruption or upgrade,
hover an upgrade row to preview it, Esc or **BACK** returns to the menu. The first seen ghost is
selected on entry.

## Overlay

Drawn every frame from ECS state via `resolveGhostTarget` (the same target resolution `ghostAi` uses)
and the pure helpers in [`src/domain/learnOverlay.ts`](../src/domain/learnOverlay.ts):

- **Reticle**: a square in the ghost's color that glides toward its target tile center
  (`easeToward`, time constant `RETICLE_EASE_MS`) instead of snapping each tile, clamped onto the
  board when the target is off-board (e.g. Clyde's scatter corner).
- **Path**: the ghost's predicted greedy route toward the target (same direction rule as
  `pickGhostDirection`, no reverse), up to `LEARN_PATH_MAX_STEPS` tiles, stopping before it would
  revisit a tile. It is drawn from the ghost's exact position and ends on the gliding reticle.
- **Derivation** (gray): Pinky — Maze-Man → 4-tile look-ahead; Inky — Blinky → 2-tile pivot →
  doubled target (plus a pivot dot); Clyde — the `CLYDE_SHY_TILES` circle around Maze-Man. Lines
  are clipped to the maze rectangle. Points tied to Maze-Man or the helper Blinky follow their exact
  positions so the lines move smoothly; the targeting math itself stays tile-based.

## Differences from play

- Chase mode only unless Scatter Burst is selected and active (see below), level-1 speeds, no
  Cruise Elroy.
- Contact never kills (no `catchPlayer`, no slime-trail kill).
- The chosen ghost spawns already `active` at the ghost-house exit; switching ghosts respawns it
  there and resets corruption timers. Maze-Man keeps his position.
- Picking Inky also spawns a faded, harmless, uncorrupted Blinky so Inky's real targeting shows. It
  spawns beside Inky facing the other way so it takes its own chase route toward Maze-Man instead
  of trailing Inky out of the house.
- The board spawns real pellets and power pellets from `pelletCellCenters()` — the same helper
  `PlayScene.spawnPellets` uses on the same `mazeSmall` layout. Eating the last one respawns the
  **whole board** immediately (checked once per frame: `query(world, [Pellet]).length === 0` →
  `spawnPellets()`) — no per-pellet timer, no score, no board-clear progress.
- One fruit spawns at the derived fruit cell below the ghost house (`fruitSpawnCenter()`, the same
  helper `PlayScene` uses). Eating it removes it via `collectFruit`; it reappears at the same cell
  after `FRUIT_RESPAWN_MS` (1000ms). No Quarters HUD, no munch SFX.
- No sound, HUD, timer, lives, or history writes.
- Corruption systems run through the same `stepCorruption` as `PlayScene`.

## Upgrade fidelity

`LearnScene` owns a local `RunUpgrades` bag (`createRunUpgrades()`) fed straight into the same
domain/system functions `PlayScene` uses (`applyPowerPelletEffects`, `freezeClosestGhost`,
`recallClosestGhostToHouse`... see per-row notes below) — not a reimplementation. Toggling a row
calls `grantUpgrade` / `revokeUpgrade` and clears only the timer(s) tied to effect fields no longer
owned by anything still selected.

| Upgrade                                                                        | Learn fidelity                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Power Freeze, Scatter Burst, Wall Pass, Speed Burst, Ghost Proof, Triple Chomp | Full — same `onPowerPellet` resolution, same render tint options as `PlayScene`. Scatter Burst switches `ghostAi`'s mode between chase/scatter directly (no wave clock exists to pause) and reverses the ghost on the mode transition via `forceGhostReverse`, same as a real wave boundary. Wall Pass reuses `snapPlayerToNearestWalkable` on expiry — the player is never left stranded on a solid tile (e.g. inside the ghost house) once the timer runs out. |
| Speed Up, Ghost Slow, Pickup Range                                             | Full — same speed multiplier / pellet-radius helpers `PlayScene` uses.                                                                                                                                                                                                                                                                                                                                                                                           |
| Ghost Recall                                                                   | Simplified — snaps the closest eligible ghost straight to the house-exit tile, holds it there (`LEARN_RECALL_HOLD_MS` = 1500ms), then releases it back to `active` at that tile. Learn has no house-release clock to seat it through, so this skips the real seat/gate dance.                                                                                                                                                                                    |
| Warp Top                                                                       | Full — `warpPlayerToTopCenter` reused as-is.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Pellet Surge                                                                   | Partial — converts one regular pellet to power immediately on toggle-on (the "when first granted" half of the real effect). There is no per-board-spawn cycle in Learn to hook the ongoing conversion into.                                                                                                                                                                                                                                                      |
| Overcharge                                                                     | Full — `applyPowerPelletEffects` doubles the same five durations regardless of caller.                                                                                                                                                                                                                                                                                                                                                                           |
| Tunnel Dash                                                                    | Full — `mazeSmall` has one tunnel row (row 7); `applyTunnelDash` / `tickTunnelDashAnimation` are reused as-is.                                                                                                                                                                                                                                                                                                                                                   |
| Fruit Power                                                                    | Full — eating the always-present fruit resolves every owned `onPowerPellet` effect via the same `resolveLearnPowerPelletTrigger(1)` path a power pellet uses, matching `PlayScene`'s fruit-collect handling.                                                                                                                                                                                                                                                     |
| Ghost House Delay, Extra Life, Quarter Bounty, Death's Harvest, Second Chomp   | No visible effect — Learn has no house-release clock, lives, Quarters HUD, catch-kill, or per-board pellet count to attach these to. Selecting one shows the "no visible effect" banner instead of silently doing nothing. Second Chomp specifically is superseded by the whole-board refill above, which already respawns eaten power pellets.                                                                                                                  |
