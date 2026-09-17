# Run upgrades

Fruit opens a **pick-one** modal for **run-long** upgrades for the current `PlayScene` only. There is no plugin registry — upgrades are a domain def table plus a scene-owned bag.

## Model

- [`src/domain/upgrades.ts`](../src/domain/upgrades.ts): `UpgradeDef` rows in `UPGRADE_DEFS` (id, label, description, effects), pure helpers, `RunUpgrades` state.
- `PlayScene` owns one `RunUpgrades` per run (`owned` ids, freeze/scatter timers, `forceNextId`, `lastDeclinedUpgradeId`). Cleared when the scene is recreated.
- Choice UI: [`src/game/scenes/upgradeChoiceModal.ts`](../src/game/scenes/upgradeChoiceModal.ts) (Phaser overlay). Pair math stays in domain (`pickUpgradeChoiceOffer` / `confirmUpgradeChoice`).
- No ECS upgrade components in v1.
- Dev URL flags (`forceUpgrade`, repeatable `enableUpgrade`): see [README Flags](../README.md#flags).

### Current defs

| Id                  | Label         | Effect                                                                                        |
| ------------------- | ------------- | --------------------------------------------------------------------------------------------- |
| `powerPelletFreeze` | Power Freeze  | Power pellet freezes leaving/active ghosts for `FREEZE_MS` (3000); cyan tint on those sprites |
| `playerSpeedUp`     | Speed Up      | Player speed × `PLAYER_SPEED_UP_MUL` (1.25)                                                   |
| `ghostSlow`         | Ghost Slow    | Ghost resolved speed × `GHOST_SLOW_MUL` (0.75)                                                |
| `scatterBurst`      | Scatter Burst | Power pellet forces scatter for `SCATTER_BURST_MS` (3000); wave clock pauses while active     |
| `ghostRecall`       | Ghost Recall  | Power pellet teleports the closest leaving/active ghost to the house as `leaving`             |
| `warpTop`           | Warp Top      | Power pellet warps the player to the dynamically nearest top-middle walkable cell             |

Modal copy uses each def’s punchy `description` string (iterate freely).

## Grant rules

- Collecting bonus fruit still plays both munches and despawns fruit (no fruit points).
- Eligible pool = upgrade ids not already owned.
- **0 eligible:** fruit collected; no modal; clear `forceNextId` if set; no grant.
- **1 eligible:** one-button modal (must pick; no auto-grant).
- **2+ eligible:** two-button modal. Options from `pickUpgradeChoiceOffer`:
  - Never the same id on both sides.
  - Prefer excluding `lastDeclinedUpgradeId` (the option **not** chosen on the previous two-option confirm).
  - If excluding decline would leave fewer than two candidates, re-include last-declined only as needed.
  - `forceUpgrade` / `forceNextId`: when still eligible, that id is guaranteed as one of the two sides; modal still opens.
- While the modal is open, the play sim is fully frozen (death-style early-return).
- **0.5s lockout** after open: fuzz-in (alpha ramp + light jitter + BitmapText scramble). Keyboard and click disabled.
- After lockout: already in selection mode (highlight + LEFT/RIGHT hints). **Click** a button to grant, or **Left/A** / **Right/D** after any held Left/Right/A/D keys have been released (keys held through open/lockout are ignored). One-button: either direction confirms. No Esc / dismiss — must pick.
- On confirm: `grantUpgrade` chosen id; clear `forceNextId`; if two options were shown, set `lastDeclinedUpgradeId` to the other; one-button leaves prior decline unchanged. HUD refreshes.
- After confirm: **3s resume countdown** (sim stays frozen; big 3→2→1). Then play resumes; movement keys held from the modal are ignored until released.
- `enableUpgrade` (repeatable) → each valid id granted into `owned` at create (order preserved; duplicates ignored by `grantUpgrade`). Combines with `forceUpgrade`.

## Power pellets

Energizers stay inert unless an owned upgrade reacts. After `collectPellets`, `applyPowerPelletEffects` walks **all** owned defs when `powerRemoved > 0` and applies every matching `onPowerPellet` field in one shot:

- `freezeGhostsMs` → refresh `freezeRemainingMs` (max if multiple)
- `scatterBurstMs` → refresh `scatterBurstRemainingMs`
- `recallClosestGhost` → flag for `recallClosestGhostToHouse`
- `warpPlayerTopCenter` → flag for `warpPlayerToTopCenter`

### Scatter burst

While `scatterBurstRemainingMs > 0` **and** the wave clock is active, `resolveGhostModeStep` pauses the level-1 wave clock and sets effective AI mode to scatter. If the clock is still inactive (no ghost has exited yet), burst does not change effective mode. When the burst ends, the wave clock resumes from where it paused. If effective mode changes at burst start/end (vs the previous frame’s effective mode), `PlayScene` calls `forceGhostReverse` (same helper as wave scatter↔chase; skips `inHouse` / `leaving`). While burst is active, Blinky ignores Cruise Elroy and uses the scatter corner (normal wave scatter still lets Elroy chase).

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

1. Add an `UpgradeId` and a row on `UPGRADE_DEFS` (label, description, + passives / `onPowerPellet` as needed).
2. If the effect is already covered (speed mul or existing `onPowerPellet` fields), stop there.
3. If it is a **new kind** of effect, extend the def shape and add one resolve site (domain helper + PlayScene/system call). Do not add a plugin bus.
4. Document the new id in [README Flags](../README.md#flags) and the defs table above.
