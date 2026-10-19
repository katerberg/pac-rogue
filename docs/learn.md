# Learn mode

`MenuScene` -> LEARN opens `LearnScene`: a no-stakes sandbox on the level-1 `mazeSmall` board where the player drives Maze-Man while one chosen ghost chases, with its targeting drawn live. `LearnSim` (`src/game/sim/learnSim.ts`) is a reduced chase-only pipeline; the scene is an adapter like `PlayScene`.

## Seen record

All six ghosts are always selectable; only upgrades met in real play are listed. The record (`src/domain/seenRecord.ts`, stored by `seenRecordStorage.ts`) is written **only** by `PlayScene` / `PlaySim` (every spawned ghost kind, and every owned upgrade id whenever `owned` can grow, `?enableUpgrade` included). Learn reads it. A malformed or missing record is empty.

`?learnAll=1|0` (without `?play=1`) boots straight into LEARN. `1` lists every upgrade without touching storage; `0` lists none, overriding real storage.

## Screen and overlay

- Ghost slots on top, seen upgrades grouped by school beside the maze. Multiple upgrades can be selected at once (a local `RunUpgrades` bag, not a real run) and persist across ghost switches; only transient power-pellet timers, corner glides and recall holds reset.
- Hovering a label shows the level-clear picker card. A `+` mark on a selected row toggles its enhanced form (`LearnSim.toggleEnhanced`).
- Selecting an upgrade with no observable effect here (`LEARN_NO_EFFECT_UPGRADE_IDS` in `src/domain/upgrades.ts`) shows a "no visible effect" banner.
- The overlay is drawn each frame from `resolveGhostTarget` (the same function `ghostAi` uses) and the pure helpers in `src/domain/learnOverlay.ts`: a target reticle, the ghost's predicted greedy path, and gray derivation lines per ghost (Pinky look-ahead, Inky pivot, Clyde shy circle, Spunky aggro circle, Wardy rim line). Targeting math stays tile-based.
- Controls: arrows/WASD, `1`-`6` or click to pick a ghost, click to toggle an upgrade, Esc or BACK to leave.

## Differences from play

- Chase mode only, level-1 speeds, no Cruise Elroy. Pellet and fruit sounds play; no HUD timer, lives or history writes.
- Contact never kills, except the **demo catch**: while any upgrade that reacts to a catch is selected, a touch runs the same helpers a real catch does without resetting Maze-Man; a popup and status line report it.
- The chosen ghost spawns `active` at the house exit. Picking Inky also spawns a faded, harmless Blinky.
- The board uses `pelletCellCenters()` (shared with `PlaySim`) and refills when empty. Power pellets regenerate when all are gone so effects stay demoable. One always-present fruit respawns after a short delay.
- Spunky and Wardy keep their real release slot and targeting (`ghostTarget.ts`) but have no speed rules of their own.

## Parity

LEARN stays at parity with play unless the omission is deliberate. `LearnSim` must pass the same `SimRenderOptions` as `PlaySim.renderOptions()`, or list the gap in `LEARN_OMITS_RENDER_OPTIONS` (bosses, lava, collapsed tunnels, store). Live checks probe LEARN; missing counterparts are Major in `pr-review`. Deliberate omission: the [run-end replay](./replay.md), since LEARN has no run end.

## Upgrade fidelity

LEARN feeds its `RunUpgrades` into the same domain/system helpers as `PlaySim`. Toggling a row calls `grantUpgrade` / `revokeUpgrade` and `clearStaleUpgradeTimers`. Every upgrade works in LEARN in the same PR via shared helpers / `src/game/systems` (see the [`new-upgrade` skill](../.agents/skills/new-upgrade/SKILL.md)); `LEARN_NO_EFFECT_UPGRADE_IDS` only for state LEARN lacks (store, lives, respawn). School Specialists are not listed.

Known simplifications (everything else is a reuse of play code):

- **Ghost Recall (+):** the real recall seats the ghost in the house; the real release rules free it once Maze-Man moves (`learnRecall.ts`).
- **Pellet Surge, Lazy Looper:** on-toggle half only.
- **Life, death and Quarter upgrades:** shown through the demo catch.
- **Fruit Fecundity / Feast (+):** replace the always-present fruit with the real `tickFruitPresence` schedule.
- **Ghost House Delay:** holds the chosen ghost at the exit using the real release rules.
- **Martyr, Interest:** no visible effect (no respawn move, no store).
- **BONUS slot machine:** deliberate omission; LEARN bar fills still pay a Quarter directly ([bonus.md](./bonus.md#slot-machine)).

## Coverage gate

Every listed upgrade needs a named test in `learnSim.test.ts` or a place in `LEARN_NO_EFFECT_UPGRADE_IDS` (`registrySync.test.ts`). Both sims call the shared slices (`runHyperspeedSubsteps`, `recallClosestGhostToHouse`) rather than copy them. Level modifiers, bosses, the store, specialists and multi-ghost play are deliberate omissions.
