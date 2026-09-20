# Run upgrades

Fruit opens a **pick-one** modal for **run-long** upgrades for the current `PlayScene` session (including across level advances). There is no plugin registry — upgrades are a domain def table plus a scene-owned bag.

## Model

- [`src/domain/upgrades.ts`](../src/domain/upgrades.ts): `UpgradeDef` rows in `UPGRADE_DEFS` (id, label, description, effects), pure helpers, `RunUpgrades` state.
- `PlayScene` owns one `RunUpgrades` per run (`owned` ids, freeze/scatter/wall-pass/invuln/speed-burst timers, `forceNextId`, `lastDeclinedUpgradeId`). **Owned upgrades survive level advances**; freeze/scatter/wall-pass/invuln/speed-burst timers clear on advance. Cleared when the scene is recreated (menu return / new Start).
- Choice UI: [`src/game/scenes/upgradeChoiceModal.ts`](../src/game/scenes/upgradeChoiceModal.ts) (Phaser overlay). Pair math stays in domain (`pickUpgradeChoiceOffer` / `confirmUpgradeChoice`).
- No ECS upgrade components in v1.
- Dev URL flags (`forceUpgrade`, repeatable `enableUpgrade`): see [README Flags](../README.md#flags).

### Current defs

| Id                  | Label         | Effect                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `powerPelletFreeze` | Power Freeze  | Power pellet freezes leaving/active ghosts for `FREEZE_MS` (3000); cyan tint on those sprites                                                                                                                                                                                                                                                                                  |
| `playerSpeedUp`     | Speed Up      | Player speed × `PLAYER_SPEED_UP_MUL` (1.25)                                                                                                                                                                                                                                                                                                                                    |
| `ghostSlow`         | Ghost Slow    | Ghost resolved speed × `GHOST_SLOW_MUL` (0.75)                                                                                                                                                                                                                                                                                                                                 |
| `scatterBurst`      | Scatter Burst | Power pellet forces scatter for `SCATTER_BURST_MS` (3000); wave clock pauses while active                                                                                                                                                                                                                                                                                      |
| `ghostRecall`       | Ghost Recall  | Power pellet teleports the closest leaving/active ghost into an `inHouse` seat by predicted order                                                                                                                                                                                                                                                                              |
| `warpTop`           | Warp Top      | Power pellet warps the player to the dynamically nearest top-middle walkable cell                                                                                                                                                                                                                                                                                              |
| `pickupRange`       | Pickup Range  | Always-on: regular pellets within `playerR+pelletR+TILE_SIZE` collect with open LOS through `playerSolids` (power pellets keep base reach only)                                                                                                                                                                                                                                |
| `ghostHouseDelay`   | House Delay   | +`GHOST_HOUSE_RELEASE_DELAY_ADD_MS` (2000) on Blinky/Pinky/Inky-post-life/Clyde-post-life time gates; +`GHOST_HOUSE_CLYDE_PELLET_ADD` (15) on Clyde first-life pellet threshold; Inky first-life pellets unchanged; mid-board grant only affects ghosts still `inHouse`                                                                                                        |
| `extraLife`         | Extra Life    | On first own: +1 life immediately (can exceed start lives); `?enableUpgrade=extraLife` applies at create                                                                                                                                                                                                                                                                       |
| `pelletToPower`     | Pellet Surge  | While owned: convert exactly one random regular pellet → power pellet after each board spawn (`startBoard`); also convert one on the current board when first granted from fruit. Silent transform + one-shot 1.5× size bounce on the sprite; no SFX; empty pool → no-op. Not per-pellet-collect.                                                                              |
| `powerCollectThree` | Triple Chomp  | Power pellet also removes up to `POWER_COLLECT_THREE_COUNT` (3) remaining **regular** pellets (uniform random; fewer than 3 → collect all remaining; 0 → no-op). Bonus removals count toward board/lifetime/Clyde/fruit/clear. One both-munch for the whole bonus set. One pass per frame even if multiple energizers were touched. Does not auto-collect other energizers.    |
| `powerWallPass`     | Wall Pass     | Power pellet: pass through interior walls, exterior hollows, and the ghost house for `WALL_PASS_MS` (3000); non-tunnel perimeter `#` stay solid (tunnels still wrap); timer-end snap to nearest `playerSolids` walkable center; mild blueward player tint (`PLAYER_WALL_PASS_TINT`) while active. Catch still skips only `inHouse` ghosts (`leaving` on house tiles can kill). |
| `powerSpeedBurst`   | Speed Burst   | Power pellet grants temporary player speed × `PLAYER_SPEED_BURST_MUL` (1.25) for `SPEED_BURST_MS` (3000); stacks with Speed Up (`playerSpeedMultiplier(owned) × 1.25` while active); refreshes to full on re-chomp; clears on level advance / life loss; no player tint                                                                                                        |
| `powerInvuln`       | Ghost Proof   | Power pellet grants pass-through for `INVULN_MS` (3000): skip catch kill only (ghosts keep moving). Player tint `0xc48a00` (darker gold) stays solid, then blinks every 100ms in the last 1000ms                                                                                                                                                                               |

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
- After confirm: **confirm outro** while sim stays frozen — chosen option double-pulses (scale bounce + stroke thicken, ~400ms); the other option fades out during that pulse; then the whole modal (dim + chrome + chosen) fades out over **1s**. Then play resumes; movement keys held from the modal are ignored until released.
- `enableUpgrade` (repeatable) → each valid id granted into `owned` at create (order preserved; duplicates ignored by `grantUpgrade`). Combines with `forceUpgrade`.

## Power pellets

Energizers stay inert unless an owned upgrade reacts. After `collectPellets`, `applyPowerPelletEffects` walks **all** owned defs when `powerRemoved > 0` and applies every matching `onPowerPellet` field in one shot:

- `freezeGhostsMs` → refresh `freezeRemainingMs` (max if multiple)
- `scatterBurstMs` → refresh `scatterBurstRemainingMs`
- `wallPassMs` → refresh `wallPassRemainingMs`
- `playerInvulnMs` → refresh `invulnRemainingMs` (max if multiple)
- `playerSpeedBurstMs` → refresh `speedBurstRemainingMs`
- `recallClosestGhost` → flag for `recallClosestGhostToHouse`
- `warpPlayerTopCenter` → flag for `warpPlayerToTopCenter`
- `collectExtraPellets` → count for one Triple Chomp pass (max among owned; not multiplied by `powerRemoved`)

### Triple Chomp

When `collectExtraPellets > 0`, `PlayScene` calls `collectExtraPellets` on remaining regular pellets only (`Pellet` without `PowerPellet`), picks up to that count uniformly at random (injectable rng), removes them, releases drawables, and folds the count into `applyPelletCollect` / `lifetimeCollected` before recall/warp/fruit/clear. If any bonus pellets were removed, plays one both-munch (`pelletMunch` + `pelletMunch2`) for the set — not per-pellet regular munches. Empty candidate pool → silent no-op.

### Scatter burst

While `scatterBurstRemainingMs > 0` **and** the wave clock is active, `resolveGhostModeStep` pauses the level-1 wave clock and sets effective AI mode to scatter. If the clock is still inactive (no ghost has exited yet), burst does not change effective mode. When the burst ends, the wave clock resumes from where it paused. If effective mode changes at burst start/end (vs the previous frame’s effective mode), `PlayScene` calls `forceGhostReverse` (same helper as wave scatter↔chase; skips `inHouse` / `leaving`). While burst is active, Blinky ignores Cruise Elroy and uses the scatter corner (normal wave scatter still lets Elroy chase).

### Ghost recall

Among ghosts in `leaving` or `active` (skip `inHouse`), pick closest to the player by Euclidean `Position` (tie: lowest eid). Set phase `inHouse`, place that ghost (and re-snap other in-house ghosts) into predicted L→R seats via `assignHouseSeats` / `ghostHouseSeatCenters`, zero Speed/Velocity. Existing release gates then re-admit them (often immediately if the gate already passed) with the normal door-approach leave path. No eligible ghost → no-op.

### Warp top

`playerTopCenterCell` scans player-walkable solids for the cell closest to ideal top-middle `((MAZE_COLS-1)/2, 0)` (tie: lower row, then lower col). Sets player `Position` there and zeros `Velocity`; keeps `Facing` / `Input`.

### Wall pass

While `wallPassRemainingMs > 0`, `PlayScene` passes `getActiveLayout().wallPassPlayerSolids` into `movement` as the player solids override. That grid opens interior walls, exterior hollows, and the ghost house; it keeps **non-tunnel perimeter `#`** solid so wrap stays tunnel-only (maze1: row 14). Ghosts keep their normal solids. Catch is unchanged: skips `inHouse` ghosts only — a `leaving` ghost still on house tiles can kill. When the timer ticks from active → expired, if the player cell is solid under normal `playerSolids`, `snapPlayerToNearestWalkable` moves them to the nearest walkable cell center (Euclidean tile distance; tie lower row then lower col; empty scan → `playerSpawnCenter`) and zeros `Velocity`. `render(..., { wallPassActive })` applies `PLAYER_WALL_PASS_TINT` on the player (and tunnel twin) while active (takes precedence over invuln gold tint).

## Freeze / catch / tint

- While `freezeRemainingMs > 0`, `applyGhostSpeed(..., { frozen: true })` sets leaving/active ghost `Speed.px = 0` (`inHouse` speed is owned by `ghostHouseSeating`). Mode/release/run clocks keep ticking (except scatter-burst pause of the mode wave clock).
- Freeze + scatter together: freeze still zeros speed; scatter targeting only matters after thaw.
- `catchPlayer({ ghostsFrozen: true })` skips kill (walk-through). When freeze expires while overlapping, the same update’s catch after `tickFreeze` can kill.
- One-frame lag after a power pellet starts freeze is accepted: Speed may clear on the next frame while catch already skips.
- `render(world, { ghostsFrozen })` tints leaving/active ghost sprites cyan while frozen; clears tint otherwise (in-house ghosts stay untinted).

## Invuln / catch / tint

- While `invulnRemainingMs > 0`, ghosts keep moving (no speed zero). `catchPlayer({ playerInvulnerable: true })` skips kill (true pass-through). Expiry while overlapping can kill on the same update after `tickInvuln`.
- Freeze + invuln are independent timers: both may be active; catch skips when `ghostsFrozen || playerInvulnerable`. Freeze still zeros speed + cyan ghost tint; invuln does not reuse freeze cyan.
- `render(world, { playerInvulnRemainingMs })` tints the player (and tunnel twin) darker gold `0xc48a00` solid while remaining > 1000ms, then blinks on a 100ms period in the last second; clears tint when off or on the blink-off half.
- Invuln timer clears on level advance and life-loss actor reset (same as freeze/scatter/wall-pass/speed-burst). Owned `powerInvuln` persists across levels.
- While wall-pass is also active, player tint uses wall-pass blueward tint instead of invuln gold.

## Speed muls

Written every frame: `applyPlayerSpeed` from `playerSpeedMultiplier(owned) × (speedBurstActive ? PLAYER_SPEED_BURST_MUL : 1)`; `applyGhostSpeed` multiplies after Elroy + tunnel resolve by `ghostSpeedLevelMul(levelIndex) × ghostSpeedMultiplier(owned)`.

## HUD

Left mid-height BitmapText (`x ≈ 12`, `y ≈ PLAYFIELD_HEIGHT / 2`, 8px so labels stay left of `MAZE_OFFSET_X`), depth 10. Layouts must keep left gutter `≥ 80` after fit (see [maze-constraints.md](./maze-constraints.md)). Hidden until at least one upgrade is owned; then shows `UpgradeDef.label` lines joined by `\n`. Text now; icons later.

## Adding an upgrade

1. Add an `UpgradeId` and a row on `UPGRADE_DEFS` (label, description, + passives / `onPowerPellet` as needed).
2. If the effect is already covered (speed mul or existing `onPowerPellet` fields), stop there.
3. If it is a **new kind** of effect, extend the def shape and add one resolve site (domain helper + PlayScene/system call). Do not add a plugin bus.
4. Document the new id in [README Flags](../README.md#flags) and the defs table above.
