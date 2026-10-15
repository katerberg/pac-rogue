# Learn mode

`MenuScene` -> LEARN opens `LearnScene`: a no-stakes sandbox on the level-1 `mazeSmall` board where the player drives Maze-Man while one chosen ghost chases, with its targeting drawn live. `LearnSim` (`src/game/sim/learnSim.ts`) is a reduced chase-only pipeline; the scene is an adapter like `PlayScene`.

## Seen record

All six ghosts are always selectable; only upgrades met in real play are listed. The record (`src/domain/seenRecord.ts`, stored by `seenRecordStorage.ts`) is written **only** by `PlayScene` / `PlaySim` (every spawned ghost kind, and every owned upgrade id whenever `owned` can grow, `?enableUpgrade` included). Learn reads it. A malformed or missing record is empty.

`?learnAll=1|0` (without `?play=1`) boots straight into LEARN. `1` lists every upgrade without touching storage; `0` lists none, overriding real storage.

## Screen and overlay

- Ghost slots on top, seen upgrades grouped by school beside the maze. Multiple upgrades can be selected at once (a local `RunUpgrades` bag, not a real run) and persist across ghost switches; only transient power-pellet timers, corner glides and recall holds reset.
- Hovering an upgrade label shows the same card the level-clear picker uses (`buildUpgradeCardVisual`). A `+` mark on a selected row toggles its enhanced form (`LearnSim.toggleEnhanced`).
- Selecting an upgrade with no observable effect here (`LEARN_NO_EFFECT_UPGRADE_IDS`) shows a "no visible effect" banner.
- The overlay is drawn each frame from `resolveGhostTarget` (the same function `ghostAi` uses) and the pure helpers in `src/domain/learnOverlay.ts`: a target reticle, the ghost's predicted greedy path, and gray derivation lines per ghost (Pinky look-ahead, Inky pivot, Clyde shy circle, Spunky aggro circle, Wardy rim line). Targeting math stays tile-based.
- Controls: arrows/WASD, `1`-`6` or click to pick a ghost, click to toggle an upgrade, Esc or BACK to leave.

## Differences from play

- Chase mode only, level-1 speeds, no Cruise Elroy. No sound, HUD timer, lives or history writes.
- Contact never kills, except the **demo catch**: while any upgrade that reacts to a catch (Death's Harvest, Bounty, Defy Death, Extra Life, Myogenesis, Money Talks, Shield, Starting Shield, Haunting) is selected, a touch runs the same helpers a real catch does without resetting Maze-Man; a grace blink, a popup and a status line report the outcome.
- The chosen ghost spawns `active` at the house exit. Picking Inky also spawns a faded, harmless Blinky.
- The board uses `pelletCellCenters()` (shared with `PlaySim`) and refills when empty. Power pellets regenerate when all are gone so effects stay demoable. One always-present fruit respawns after a short delay.
- Spunky and Wardy keep their real release slot and targeting (`ghostTarget.ts`) but have no speed rules of their own.

## Upgrade fidelity

LEARN feeds its `RunUpgrades` straight into the same domain and system functions as `PlaySim` (`applyPowerPelletEffects`, `freezeClosestGhost`, ...), not a reimplementation. Toggling a row calls `grantUpgrade` / `revokeUpgrade` and clears only timers whose effect fields nothing selected still owns (`clearStaleUpgradeTimers`).

Rules for new upgrades: reuse the shared helper so LEARN gets it for free; if a new effect needs state LEARN lacks (store, lives, house release), say so in code and add the id to `LEARN_NO_EFFECT_UPGRADE_IDS` if nothing is visible. School Specialists are not listed in LEARN.

Known simplifications (everything else is a reuse of play code):

- **Ghost Recall:** snaps the ghost to the exit, holds it briefly, then releases it.
- **Pellet Surge, Lazy Looper:** only the on-toggle half; Learn still refills the whole board.
- **Defy Death, Extra Life, Myogenesis, Death's Harvest/Bounty, Money Talks, Haunting:** shown through the demo catch.
- **Fruit Fecundity / Feast:** replace the always-present fruit with the real `tickFruitPresence` schedule.
- **Ghost House Delay:** holds the chosen ghost at the exit using the real release rules.
- **Martyr, Interest, Wall Drop:** no visible effect (no respawn move, no store; the reduced chase pipeline does not thread dropped walls).
- **Enhanced-only effects** needing fruit timers, house release or lives (Fecundity+/Feast+ stacking, Quarter Bounty, Extra Life+, Myogenesis+) have no LEARN form.
