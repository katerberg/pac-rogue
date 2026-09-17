# Run upgrades

Fruit grants **run-long** upgrades for the current `PlayScene` only. There is no plugin registry — upgrades are a domain def table plus a scene-owned bag.

## Model

- [`src/domain/upgrades.ts`](../src/domain/upgrades.ts): `UpgradeDef` rows in `UPGRADE_DEFS`, pure helpers, `RunUpgrades` state.
- `PlayScene` owns one `RunUpgrades` per run (`owned` ids, `freezeRemainingMs`, `scatterBurstRemainingMs`, `forceNextId`). Cleared when the scene is recreated.
- No ECS upgrade components in v1.
- Dev URL flags: `?forceUpgrade=` (next fruit) and repeated `?enableUpgrade=` (grant on create).

### Current defs

| Id                  | Label         | Effect                                                                                        |
| ------------------- | ------------- | --------------------------------------------------------------------------------------------- |
| `powerPelletFreeze` | Power Freeze  | Power pellet freezes leaving/active ghosts for `FREEZE_MS` (3000); cyan tint on those sprites |
| `playerSpeedUp`     | Speed Up      | Player speed × `PLAYER_SPEED_UP_MUL` (1.25)                                                   |
| `ghostSlow`         | Ghost Slow    | Ghost resolved speed × `GHOST_SLOW_MUL` (0.75)                                                |
| `scatterBurst`      | Scatter Burst | Power pellet forces scatter for `SCATTER_BURST_MS` (3000); wave clock pauses while active     |
| `ghostRecall`       | Ghost Recall  | Power pellet teleports the closest leaving/active ghost to the house as `leaving`             |
| `warpTop`           | Warp Top      | Power pellet warps the player to the dynamically nearest top-middle walkable cell             |

## Grant rules

- Collecting bonus fruit still plays both munches and despawns fruit (no fruit points).
- Grant one **random distinct** upgrade among ids not already owned (`grantRandomUpgrade`).
- Empty eligible pool: fruit still collected; no grant; no crash.
- `?forceUpgrade=<id>` (any port): parsed at `PlayScene` create into `forceNextId`. On the next fruit collect, if that id is not owned it is granted; otherwise pick among remaining eligible. **`forceNextId` is always cleared on fruit collect**, even when nothing is granted.
- `?enableUpgrade=<id>` (repeatable, any port): each valid id is granted into `owned` at `PlayScene` create (order preserved; duplicates ignored by `grantUpgrade`). Invalid values ignored. Combines with `forceUpgrade` (fruit force still applies among remaining eligible).

## Power pellets

Energizers stay inert unless an owned upgrade reacts. After `collectPellets`, `applyPowerPelletEffects` walks **all** owned defs when `powerRemoved > 0` and applies every matching `onPowerPellet` field in one shot:

- `freezeGhostsMs` → refresh `freezeRemainingMs` (max if multiple)
- `scatterBurstMs` → refresh `scatterBurstRemainingMs`
- `recallClosestGhost` → flag for `recallClosestGhostToHouse`
- `warpPlayerTopCenter` → flag for `warpPlayerToTopCenter`

### Scatter burst

While `scatterBurstRemainingMs > 0`, `resolveGhostModeStep` pauses the level-1 wave clock and sets effective AI mode to scatter. When the burst ends, the wave clock resumes from where it paused. If effective mode changes at burst start/end (vs the previous frame’s effective mode), `PlayScene` calls `forceGhostReverse` (same helper as wave scatter↔chase).

### Ghost recall

Among ghosts in `leaving` or `active` (skip `inHouse`), pick closest to the player by Euclidean `Position` (tie: lowest eid). Teleport to `ghostHouseSpawnCenter()`, set phase `leaving`, Input/Facing up, `Speed = GHOST_SPEED`. No eligible ghost → no-op.

### Warp top

`playerTopCenterCell` scans player-walkable solids for the cell closest to ideal top-middle `((MAZE_COLS-1)/2, 0)` (tie: lower row, then lower col). Sets player `Position` there and zeros `Velocity`; keeps `Facing` / `Input`.

## Freeze / catch / tint

- While `freezeRemainingMs > 0`, `applyGhostSpeed(..., { frozen: true })` sets leaving/active ghost `Speed.px = 0` (house stays 0). Mode/release/run clocks keep ticking (except scatter-burst pause of the mode wave clock).
- Freeze + scatter together: freeze still zeros speed; scatter targeting only matters after thaw.
- `catchPlayer({ ghostsFrozen: true })` skips kill (walk-through). When freeze expires while overlapping, the same update’s catch after `tickFreeze` can kill.
- One-frame lag after a power pellet starts freeze is accepted: Speed may clear on the next frame while catch already skips.
- `render(world, { ghostsFrozen })` tints leaving/active ghost sprites cyan while frozen; clears tint otherwise (in-house ghosts stay untinted).

## Speed muls

Written every frame: `applyPlayerSpeed` from `playerSpeedMultiplier(owned)`; `applyGhostSpeed` multiplies after Elroy + tunnel resolve.

## HUD

Left mid-height BitmapText (`x ≈ 12`, `y ≈ PLAYFIELD_HEIGHT / 2`, 8px so labels stay left of `MAZE_OFFSET_X`), depth 10. Hidden until at least one upgrade is owned; then shows `UpgradeDef.label` lines joined by `\n`. Text now; icons later.

## Adding an upgrade

1. Add an `UpgradeId` and a row on `UPGRADE_DEFS` (label + passives / `onPowerPellet` as needed).
2. If the effect is already covered (speed mul or existing `onPowerPellet` fields), stop there.
3. If it is a **new kind** of effect, extend the def shape and add one resolve site (domain helper + PlayScene/system call). Do not add a plugin bus.

## Force / enable URL

```text
http://127.0.0.1:5174/?forceUpgrade=ghostSlow
http://127.0.0.1:5173/?forceUpgrade=powerPelletFreeze
http://127.0.0.1:5174/?enableUpgrade=scatterBurst
http://127.0.0.1:5174/?enableUpgrade=ghostRecall&enableUpgrade=warpTop
http://127.0.0.1:5174/?enableUpgrade=playerSpeedUp&enableUpgrade=ghostSlow
http://127.0.0.1:5173/?enableUpgrade=powerPelletFreeze&forceUpgrade=ghostSlow
```

Valid ids: `powerPelletFreeze`, `playerSpeedUp`, `ghostSlow`, `scatterBurst`, `ghostRecall`, `warpTop`. Invalid `forceUpgrade` → normal random. Invalid `enableUpgrade` values are skipped.
