# Ghost corruption (level 4+)

Starting at level 4, one randomly chosen non-Blinky ghost (Pinky, Inky, or Clyde) gets a random
**corruption** — a permanent behavior mutation — for the rest of the run. Assignment happens once
and survives every later level advance and life loss; it is never reassigned or removed.

## Model

- [`src/domain/corruption.ts`](../src/domain/corruption.ts): `CorruptionId` union, `CORRUPTION_DEFS`
  (id/label/description, unused in the HUD today but kept for docs/maintainability and future UI),
  `OUTLINE_TINT_BY_CORRUPTION` (placeholder per-type tint constants), tuning constants, and
  `RunCorruption` state (`ghostKind`, `type`, per-corruption cycle/flash timers, the Slime Trail
  `trail` tile FIFO, and Pellet Dropper's drops-left count and last tile).
- `PlayScene` owns one `RunCorruption` per run, ticked every frame like `RunUpgrades`. `ghostKind` /
  `type` survive level advances and life loss; the per-corruption timers and trails reset on both
  (`resetCorruptionTransient`), matching how upgrade effect timers reset today.
- Assignment (`maybeAssignCorruption`) fires the first time `startBoard()` runs with
  `levelIndex >= 4` (covers both natural advancement to level 4 and a direct `?level=4+` start) and
  is a no-op afterward.
- Because ghosts are destroyed and respawned every level, the corrupted ghost is identified by
  **kind**, not entity id — `findGhostEidByKind` (`src/game/systems/corruptionGhost.ts`) looks it up
  fresh each frame.

## Telegraphing

Every corrupted ghost carries a persistent outline tint (`OUTLINE_TINT_BY_CORRUPTION[type]`, one
color per corruption id — placeholders, easy to retune). Any corruption with a discrete activation
moment also gets a ~400ms (`TELEGRAPH_FLASH_MS`) bright white pre-fire flash immediately before it
triggers: Speed Surge's burst, Wall-Phase Dash's lunge, Invisibility's hidden transition, and Pellet
Dropper's drop. Tint precedence in `render.ts` is frozen (existing upgrade effect) > flash >
corruption outline > none; a hidden ghost is rendered at alpha 0 (no gameplay effect — catch and
slime-trail checks are unaffected by alpha).

Corruption is never announced in-game — the outline is the only signal, and triggering is silent.

## The 7 corruptions

| Id                    | Behavior                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `slimeTrail`          | Lays a lethal 4-tile FIFO trail (`SLIME_TRAIL_MAX_LEN`) behind itself as it moves; the trail is drawn directly (no ECS entities) and checked by `slimeTrailKill`, which mirrors `catchPlayer`'s circle-overlap shape and also skips a `playerInvulnerable` player.                                                                                                                                                                                                                   |
| `invisibility`        | Cycles every 10s (`INVISIBILITY_CYCLE_MS`): a 400ms flash, then hidden for 3000ms (`INVISIBILITY_HIDDEN_MS`), then visible for the rest. Reveals early (stays visible) whenever the player is within 2 tiles (`INVISIBILITY_REVEAL_RADIUS_TILES`), without resetting the cycle.                                                                                                                                                                                                      |
| `freeRetargetReverse` | Bypasses the normal "only re-target once per tile" cache and the "never reverse" exclusion inside `ghostAi`/`pickGhostDirection` (`allowReverse`) — it can pick any open direction, including back the way it came, at every aligned tile.                                                                                                                                                                                                                                           |
| `speedSurge`          | ×1.6 (`SPEED_SURGE_MUL`) speed for 1500ms (`SPEED_SURGE_ACTIVE_MS`) after a 400ms flash, repeating every 8000ms (`SPEED_SURGE_CYCLE_MS`).                                                                                                                                                                                                                                                                                                                                            |
| `wallPhaseDash`       | Every 9000ms (`WALL_PHASE_CYCLE_MS`), checks all 4 orthogonal directions for a wall exactly 2 tiles thick (`WALL_PHASE_WALL_THICKNESS`) with a walkable landing tile just past it; if one exists (preferring the landing closest to the player), flashes for 400ms then relocates there directly. A 3+-thick wall is never crossable. No valid direction this cycle → silently retries next cycle.                                                                                   |
| `pelletDropper`       | Every 10000ms (`PELLET_DROPPER_INTERVAL_MS`) while `pelletsRemaining > 0`, flashes for 400ms, then drops 3 pellets (`PELLET_DROPPER_COUNT`) one at a time as it moves: each time it leaves a tile, a real `Pellet` entity spawns on that tile behind it (skipped if the tile is not walkable or already has a pellet). These count toward the level's win condition (`addPelletsToProgress` bumps `pelletsRemaining` only, not `boardCollected`), so the player must clear them too. |
| `falseScatter`        | Always resolves its target as chase, regardless of the wave clock's mode, and is excluded from `forceGhostReverse`'s mode-change reversal.                                                                                                                                                                                                                                                                                                                                           |

All 7 apply continuously through frightened/eaten/recall/scatter states — nothing suppresses them.
No escalation or stacking in v1 (one ghost, one corruption, for the whole run); further corruption
levels are a possible future decorator layer, not built here.

## Testing flags

- `?forceCorruption=<id>` assigns that corruption immediately (bypassing the level-4 gate) instead
  of a random type at level 4.
- `?forceCorruptionGhost=pinky|inky|clyde` forces the ghost kind too (`blinky` and unknown values
  are rejected). Combine with `forceCorruption` for a fully deterministic setup, e.g.
  `?play=1&level=4&forceCorruption=wallPhaseDash&forceCorruptionGhost=pinky`.

There is no flag to disable corruption — only to force it on early for testing.
