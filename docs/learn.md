# Learn mode

`MenuScene` → **LEARN** opens `LearnScene`: a no-stakes sandbox on the level-1 `mazeSmall` board
where the player drives Maze-Man around while one chosen ghost chases them, with its targeting drawn
live.

## Seen record

Only ghosts and upgrades this machine has met in real play are selectable.

- [`src/domain/seenRecord.ts`](../src/domain/seenRecord.ts): `SeenRecord` (`ghosts`,
  `upgrades`), parse/serialize, `withSeenGhosts` / `withSeenUpgrade` merges
  (return the same object when nothing is new), `allSeenRecord`, `parseLearnAllMode`.
- [`src/game/storage/seenRecordStorage.ts`](../src/game/storage/seenRecordStorage.ts): localStorage
  key `pac-rogue.seen.v1`. Missing, unreadable, or malformed data → empty record; a record saved
  before `upgrades` existed parses with `upgrades: []`, and a legacy `corruptions` field is ignored and
  dropped on the next write.
- `PlaySim.startBoard` records every ghost kind it spawns. `PlayScene` also records every
  currently-owned upgrade id whenever `runUpgrades.owned` can grow: the initial `?enableUpgrade=`
  set, the level-1 starting-upgrade grant, and a level-clear modal confirm — an upgrade only ever
  seen via `?enableUpgrade=` still counts as seen.
- `?learnAll=1|0` (without `?play=1`) boots straight into LEARN instead of the menu; `play=1` wins.
- `?learnAll=1` treats every ghost and upgrade as seen without touching storage.
  `?learnAll=0` treats **nothing** as seen — overriding real localStorage — useful for exercising the
  empty `PLAY TO MEET GHOSTS` state on demand. Either way the seen record is read-only in Learn; only
  `PlayScene` ever writes it.

## Screen

- Title, then four ghost slots (Blinky, Pinky, Inky, Clyde). Unseen slots show a black silhouette
  and cannot be picked. The selected slot has a yellow frame.
- Seen upgrades are listed beside the maze, grouped under a colored school header
  (`groupUpgradesBySchool`, `UPGRADE_SCHOOL_ORDER`; empty schools are skipped). `splitSchoolColumns`
  ([`src/domain/learnUpgradeColumns.ts`](../src/domain/learnUpgradeColumns.ts)) fills the left column
  with the first 3 seen schools and the right column with the rest, in order (4 seen schools → 3 left,
  1 right). Each school has one row per seen
  `UpgradeDef` in canonical `UPGRADE_DEFS` order within each group: a checkbox + label, filled in yellow while selected. Multiple upgrades can be
  selected at once (a local `RunUpgrades` bag, not tied to any real run) and stay selected across a
  ghost switch — only the transient power-pellet timers (freeze/wall-pass/invuln/speed-burst), any
  ghost corner glide/hold and any in-flight recall hold reset when the ghost changes.
- Hovering an upgrade row for `HOVER_PREVIEW_DELAY_MS` (500ms) shows a preview card near the pointer
  on the same side of the screen as the row (fixed x from `hoverPreviewX(column)`, y follows the pointer clamped to stay
  on-screen) — never over the play area — using `buildUpgradeCardVisual` from
  [`src/game/scenes/upgradeChoiceModal.ts`](../src/game/scenes/upgradeChoiceModal.ts), the same
  function the level-clear upgrade picker's buttons use, so the card matches exactly (bg, border,
  school tag, label, description). Moving off the row before the delay elapses cancels it; moving to a new row
  restarts the delay (and re-anchors to that row's pointer position).
- Selecting an upgrade with no observable effect on this board (`LEARN_NO_EFFECT_UPGRADE_IDS`, currently Martyr and Interest) shows a
  small two-line banner positioned between the ghost slots and the maze (`NO_EFFECT_BANNER_Y`),
  capped to the maze's own pixel width (`wrapText` wraps the names line if it would overflow): the
  selected upgrade name(s) on the first line, `NO VISIBLE EFFECT HERE` always on its own line below.
- Every selected upgrade row also shows a small `+` box at the right end of the row (`UPGRADE_PLUS_INSET` from the row edge, in either column),
  hidden while the row is unselected (`learnEnhanceToggleState`). Clicking it flips that upgrade to its
  enhanced `<id>Plus` form and back (`LearnSim.toggleEnhanced`): the box fills yellow and the label
  gains a `+` while enhanced. The preview card and the "no visible effect" banner use the owned form.
  Toggling the row off removes whichever form is owned; Pellet Surge's enhance converts one more
  pellet at once.
- Nothing seen yet → `PLAY TO MEET GHOSTS` over the maze; only Maze-Man spawns.

## Controls

Arrows / WASD move, `1`–`4` or click select a ghost slot, click toggles an upgrade,
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

- Chase mode only, level-1 speeds, no Cruise Elroy.
- Contact never kills. The exception is the **demo catch**: while Death's Harvest, Death's Bounty, Defy
  Death, Extra Life, Myogenesis, Money Talks, Shield Pellets or Haunting is selected, a ghost touch runs the same helpers a real catch does
  (pellet harvest, defy save, lives, BONUS payout) without resetting Maze-Man or ending the run: a
  1.5s grace blink follows, a floating popup reports the outcome, and a status line under the maze shows
  lives and BONUS/Quarters. At 0 lives the demo just resets them.
- The chosen ghost spawns already `active` at the ghost-house exit; switching ghosts respawns it
  there. Maze-Man keeps his position.
- Picking Inky also spawns a faded, harmless Blinky so Inky's real targeting shows. It
  spawns beside Inky facing the other way so it takes its own chase route toward Maze-Man instead
  of trailing Inky out of the house.
- The board spawns real pellets and power pellets from `pelletCellCenters()` — the same helper
  `PlaySim.spawnPellets` uses on the same `mazeSmall` layout. Eating the last one respawns the
  **whole board** immediately (checked once per frame: `query(world, [Pellet]).length === 0` →
  `spawnPellets()`) — no per-pellet timer, no score, no board-clear progress. Separately, once every power pellet is gone (and no Second Chomp
  respawn is pending) the layout's power pellets regenerate at once, so the effects stay demoable
  while regular pellets remain.
- One fruit spawns at the derived fruit cell below the ghost house (`fruitSpawnCenter()`, the same
  helper `PlayScene` uses). Eating it removes it via `collectFruit`; it reappears at the same cell
  after `FRUIT_RESPAWN_MS` (1000ms). No Quarters HUD, no munch SFX.
- No sound, HUD, timer, lives, or history writes.

## Upgrade fidelity

`LearnScene` owns a local `RunUpgrades` bag (`createRunUpgrades()`) fed straight into the same
domain/system functions `PlayScene` uses (`applyPowerPelletEffects`, `freezeClosestGhost`,
`recallClosestGhostToHouse`... see per-row notes below) — not a reimplementation. Toggling a row
calls `grantUpgrade` / `revokeUpgrade` and clears only the timer(s) tied to effect fields no longer
owned by anything still selected.

Enhanced (`Plus`) forms reuse the same row's fidelity: they read the same helpers with the enhanced
numbers (speeds, durations, Extra Hungry's 5 pellets, Overcharge ×3, Ghost Recall's two ghosts, Wall
Pass+ looping through every edge via `wallPassSolids`).
The new enhanced-only behavior that needs fruit timers, house release or lives (Fecundity+/Feast+ stacking, Quarter Bounty, Extra Life+, Myogenesis+) has none in LEARN.

The School Specialists (`passive<School>Specialist`) are not listed in LEARN at all (`learnUpgradeDefs`).

| Upgrade                                                                                   | Learn fidelity                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Freeze, Scatter Burst, Wall Pass, Speed Burst, Ghost Proof, Ghost Harvester, Extra Hungry | Full — same `onPowerPellet` resolution, same render tint options as `PlayScene`. Scatter Burst warps the active ghost(s) to their corners with the same `teleportGhostsToCorners` + glide/hold as play. Wall Pass reuses `snapPlayerToNearestWalkable` on expiry — the player is never left stranded on a solid tile (e.g. inside the ghost house) once the timer runs out.                                                       |
| Afterburner, Ghost Slow, Pickup Range                                                     | Full — same speed multiplier / pellet-radius helpers `PlayScene` uses.                                                                                                                                                                                                                                                                                                                                                            |
| Ghost Recall                                                                              | Simplified — snaps the closest eligible ghost straight to the house-exit tile, holds it there (`LEARN_RECALL_HOLD_MS` = 1500ms), then releases it back to `active` at that tile. Learn has no house-release clock to seat it through, so this skips the real seat/gate dance.                                                                                                                                                     |
| Warp Farthest                                                                             | Full — `warpPlayerFarthestFromGhosts` reused as-is.                                                                                                                                                                                                                                                                                                                                                                               |
| Pellet Surge                                                                              | Partial — converts one regular pellet to power immediately on toggle-on (the "when first granted" half of the real effect). There is no per-board-spawn cycle in Learn to hook the ongoing conversion into.                                                                                                                                                                                                                       |
| Overcharge                                                                                | Full — `applyPowerPelletEffects` doubles the same durations regardless of caller.                                                                                                                                                                                                                                                                                                                                                 |
| Tunnel Dash                                                                               | Full — `mazeSmall` has one tunnel row (row 7); `applyTunnelDash` / `tickTunnelDashAnimation` are reused as-is.                                                                                                                                                                                                                                                                                                                    |
| Remote Transference                                                                       | Full — same counter, `pickFurthestPelletEids` and `applyRemoteTransference` as `PlaySim`; the counter resets on pellet reset.                                                                                                                                                                                                                                                                                                     |
| Fruit Power                                                                               | Full — eating the always-present fruit resolves every owned `onPowerPellet` effect via the same `resolveLearnPowerPelletTrigger(1)` path a power pellet uses, matching `PlayScene`'s fruit-collect handling.                                                                                                                                                                                                                      |
| Second Chomp                                                                              | Full — `queuePowerPelletRespawns` / `tickPowerPelletRespawns` reused: an eaten power pellet reappears at its cell after `secondChompMs` (10s base). The queue clears on pellet reset and board refill.                                                                                                                                                                                                                            |
| Defy Death                                                                                | Armed state only — a power pellet arms the window (ticked by `tickDefyDeath`) and Maze-Man wears the Ghost Proof tint. A ghost touch then runs the demo catch (below) and consumes it.                                                                                                                                                                                                                                            |
| Extra Life, Myogenesis, Death's Harvest, Death's Bounty, Money Talks                      | Demo catch — see below. Extra Life adds its lives to `LearnRunState`; Myogenesis regains lives on a board refill (`livesAfterLevelRegen`, status line only, no popup); Death's Harvest runs `harvestNearbyPellets`; Death's Bounty pays `deathsBountyCharge` into a local BONUS bar; Money Talks spends Quarters (earned from fruit) through `lastLifeSaveCost` to save the last life, with a `-N Q` popup and no coin animation. |
| Shield Pellets                                                                            | Full — power pellets (and Fruit Power) bank shields instead of firing, shown as `SHIELDS n/cap` in the status line. A ghost touch breaks one (`SHIELD BROKEN`), fires the power-pellet effects and grants the 1s immunity before any demo catch runs.                                                                                                                                                                             |
| Haunting                                                                                  | Demo catch — the catcher is seated at the ghost-house exit, caged (`hauntedGhost` draw option) for 10s, then let out; the popup adds `HAUNTED`. Haunting+ also cages for 10s, since LEARN has no level end.                                                                                                                                                                                                                       |
| Quarter Bounty                                                                            | Full — eating the fruit pays Quarters (or BONUS charge without it) through `LearnRunState`, shown as a floating popup and in the status line.                                                                                                                                                                                                                                                                                     |
| Fruit Fecundity, Fruit Feast                                                              | Scheduled fruit — while either is owned, the always-present fruit is replaced by the real `tickFruitPresence` schedule (pellets eaten since the board refilled; Fecundity doubles the lifetime, Feast uses its thresholds). The status line counts down the fruit's time or the pellets until the next one. Fruit stacking and persistence-until-level-end from the enhanced forms are not modelled.                              |
| Ghost House Delay                                                                         | Held ghost — the chosen ghost is held at the house exit and released by the real release rules (`shouldReleaseKind`, idle push-out) with the delay added. The clock starts on your first key press; the status line counts it down. Turning the upgrade off releases it.                                                                                                                                                          |
| Turn Tuning                                                                               | Full — same `TurnTuningState` (`src/game/systems/turnTuningState.ts`) and `applyHeldKeys` early-turn filter as `PlaySim`: early taps, perfect-tap speed boost, turn flash, the perfect shockwave ring and the close-tap sparks (`turnSparks` event → `playTurnSparks`). Turns off with the toggle.                                                                                                                                |
| Lazy Looper                                                                               | Partial — toggling it (or its enhanced form) greys the pellets a clear would not need, using the same `tagOptionalPellets` as `PlaySim`. Learn still refills the board only once every pellet is eaten.                                                                                                                                                                                                                           |
| Martyr                                                                                    | None — the demo catch never moves Maze-Man, so the respawn has nothing to show; selecting it shows the "no visible effect" banner.                                                                                                                                                                                                                                                                                                |
| Interest                                                                                  | None — LEARN has no store, so there is no payout to show; selecting it shows the "no visible effect" banner.                                                                                                                                                                                                                                                                                                                      |
| Near Miss                                                                                 | Full — same `stepNearMissPasses` passes as play; each pass adds to LEARN's BONUS bar and pops `+15 BONUS` (`+30` enhanced). Contact never kills without a catch-demo upgrade, so a ghost passing through Maze-Man also pays.                                                                                                                                                                                                      |
