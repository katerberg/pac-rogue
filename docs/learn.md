# Learn mode

`MenuScene` → **LEARN** opens `LearnScene`: a no-stakes sandbox on the level-1 `mazeSmall` board
where the player drives Maze-Man around while one chosen ghost chases them, with its targeting drawn
live.

## Seen record

Only ghosts and corruptions this machine has met in real play are selectable.

- [`src/domain/seenRecord.ts`](../src/domain/seenRecord.ts): `SeenRecord` (`ghosts`, `corruptions`),
  parse/serialize, `withSeenGhosts` / `withSeenCorruption` merges (return the same object when
  nothing is new), `allSeenRecord`, `parseLearnAllFlag`.
- [`src/game/storage/seenRecordStorage.ts`](../src/game/storage/seenRecordStorage.ts): localStorage
  key `pac-rogue.seen.v1`. Missing, unreadable, or malformed data → empty record.
- `PlayScene.startBoard` records every ghost kind it spawns and the run's corruption once
  `maybeAssignCorruption` assigns it (including `?forceCorruption=`).
- `?learnAll=1` treats everything as seen without touching storage.

## Screen

- Title, then four ghost slots (Blinky, Pinky, Inky, Clyde). Unseen slots show a black silhouette
  and cannot be picked. The selected slot has a yellow frame.
- Seen corruptions are listed to the right of the maze (color swatch + label). Clicking one applies
  it to the selected ghost; clicking it again removes it. Only one corruption at a time. Blinky can
  be corrupted here even though real runs never corrupt him.
- Nothing seen yet → `PLAY TO MEET GHOSTS` over the maze; only Maze-Man spawns.

## Controls

Arrows / WASD move, `1`–`4` or click select a ghost slot, click toggles a corruption, Esc or
**BACK** returns to the menu. The first seen ghost is selected on entry.

## Overlay

Drawn every frame from ECS state via `resolveGhostTarget` (the same target resolution `ghostAi` uses)
and the pure helpers in [`src/domain/learnOverlay.ts`](../src/domain/learnOverlay.ts):

- **Reticle**: a square in the ghost's color at its target tile, clamped onto the board when the
  target is off-board (e.g. Clyde's scatter corner).
- **Path**: the ghost's predicted greedy route toward the target (same direction rule as
  `pickGhostDirection`, no reverse), up to `LEARN_PATH_MAX_STEPS` tiles, stopping before it would
  revisit a tile.
- **Derivation** (gray): Pinky — Maze-Man → 4-tile look-ahead; Inky — Blinky → 2-tile pivot →
  doubled target (plus a pivot dot); Clyde — the `CLYDE_SHY_TILES` circle around Maze-Man. Lines
  are clipped to the maze rectangle.

## Differences from play

- Chase mode only, level-1 speeds, no Cruise Elroy.
- Contact never kills (no `catchPlayer`, no slime-trail kill).
- The chosen ghost spawns already `active` at the ghost-house exit; switching ghosts respawns it
  there and resets corruption timers. Maze-Man keeps his position.
- Picking Inky also spawns a faded, harmless, uncorrupted Blinky so Inky's real targeting shows.
- No pellets except those Pellet Dropper drops (eatable; no score, no progress).
- No sound, HUD, timer, lives, upgrades, fruit, or history writes.
- Corruption systems run through the same `stepCorruption` as `PlayScene`.
