# Run log

Every `PlayScene` run is recorded to `localStorage`, always, with no flag. The log feeds balance analysis (death rate by level, how runs go with each upgrade). A `?data=1` viewer and stats come later. This phase only records.

Code: `src/domain/runLog.ts` (schema + pure helpers), `src/game/sim/runRecorder.ts` (the draft `PlaySim` fills in), `src/game/storage/runLogStorage.ts` (persistence), `src/game/scenes/RunLogOverrunScene.ts` (RUN LOG FULL).

## Storage

| Key                               | Holds                                     |
| --------------------------------- | ----------------------------------------- |
| `pac-rogue.run-log.v1.index`      | JSON array of run ids, oldest first       |
| `pac-rogue.run-log.v1.run.<id>`   | one `RunLogRecord` as JSON                |
| `pac-rogue.run-log.v1.install-id` | random id for this browser (later upload) |

Each save writes only its own run key (plus the index when the id is new). Storage is per origin, so agent ports (5174/4174) keep their own log.

## When a run is saved

`PlaySim` emits a `runLog` `SimEvent` and `PlayScene` saves it:

- at run start;
- at every level end (after the lives regen);
- when the player leaves a store;
- at game over (`death`) and on RUN COMPLETE (`complete`);
- when `PlayScene` shuts down with the run still in progress (`quit`: pause → Quit, knobs restart);
- on `pagehide` (tab closed or navigated away), still `inProgress`.

## Outcomes

| Outcome      | Meaning                                                                         |
| ------------ | ------------------------------------------------------------------------------- |
| `inProgress` | the run has not ended                                                           |
| `death`      | game over                                                                       |
| `complete`   | level 9 cleared                                                                 |
| `quit`       | `PlayScene` shut down mid-run                                                   |
| `abandoned`  | an `inProgress` run found at the next page load (the tab died before finishing) |

`endedAt` is stamped by storage when the outcome first leaves `inProgress`; abandoned runs keep `endedAt: null`.

## Debug runs

`debug` is `true` exactly when the run had a high-score-disabling flag (`highScoresDisabled`). They are recorded like any run, with the raw URL params in `params`. Later viewers and stats leave them out.

## Record

The full types live in `src/domain/runLog.ts`. Top level:

- `id`, `installId`, `gameVersion` (git short SHA baked in by Vite, `unknown` outside a build), `startedAt`, `endedAt`, `params`, `seed`, `debug`, `outcome`, `version` (1).
- `finalLevel`, `pelletsCollected` (lifetime), `quartersUnspent`, `livesMax`.
- `loadout`: `{ id, source, level, removedLevel? }` per upgrade gained. `source` is `start`, `offer`, `store`, `enhance` (the `Plus` id; the base entry gets `removedLevel`) or `flag` (`?enableUpgrade`). A store swap sets `removedLevel` on the outgoing upgrade.
- `levels`: one `LevelLog` per board played.
- `storeVisits`: `{ afterLevel, quartersIn, quartersOut, stock, purchases, simMs }`. `quartersIn` counts any Interest payout.

## Level fields

Times are sim ms since the level started (pauses and the store do not count).

| Field                                | Definition                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layout`, `inverted`, `boss`         | static layout id, or `gen:<boardSeed>` for a generated board                                                                                                                                                                                                                                                                                                   |
| `countdownStart`, `countdownEnd`     | the in-game timer at board start and at the clear (before the time-bonus drain)                                                                                                                                                                                                                                                                                |
| `timeBonusPoints`                    | BONUS charge the drain pays (0 on the boss level)                                                                                                                                                                                                                                                                                                              |
| `cleared`, `simMs`                   | whether the board was cleared; time played on it                                                                                                                                                                                                                                                                                                               |
| `firstMoveMs`                        | first frame with direction input                                                                                                                                                                                                                                                                                                                               |
| `pelletsCollected`                   | pellets eaten on this board                                                                                                                                                                                                                                                                                                                                    |
| `pace.p25…p100`                      | `{ simMs, countdown }` when 25/50/75/100% of the board's pellets were gone; `p100` is also set at the clear, which can leave power pellets behind                                                                                                                                                                                                              |
| `lastPelletsMs`                      | time from ≤10 pellets left to the clear                                                                                                                                                                                                                                                                                                                        |
| `livesStart`, `livesEnd`, `livesMax` | lives at board start, after the level-end regen, and the most held                                                                                                                                                                                                                                                                                             |
| `livesRegenerated`                   | lives the level-end regen added                                                                                                                                                                                                                                                                                                                                |
| `deaths[]`                           | see below                                                                                                                                                                                                                                                                                                                                                      |
| `tunnelWraps`                        | frames where the player's position jumped more than half the board (a tunnel wrap)                                                                                                                                                                                                                                                                             |
| `tunnelDashes`                       | Tunnel Dash triggers                                                                                                                                                                                                                                                                                                                                           |
| `nearMisses`                         | a non-house ghost within 1 tile of the player's centre without a catch, at most once per ghost per second                                                                                                                                                                                                                                                      |
| `tilesTraveled`                      | player movement in tiles, excluding wraps and warp glides                                                                                                                                                                                                                                                                                                      |
| `idleMs`                             | after the first move, time the player did not move (against a wall, or no input)                                                                                                                                                                                                                                                                               |
| `pausedMs`, `pauseCount`, `hiddenMs` | pause-menu time and tab-hidden time, measured by `PlayScene`                                                                                                                                                                                                                                                                                                   |
| `maxFrameMs`, `hitchFrames`          | the largest frame time, and frames over 50 ms                                                                                                                                                                                                                                                                                                                  |
| `powerPellets`                       | eaten by `player`, swept by `tunnelDash`, eaten by ghosts under `ghostHarvest`, granted by `fruit` (Fruit Power)                                                                                                                                                                                                                                               |
| `activations`                        | per power pellet trigger: `freeze`, `recall` (per ghost), `scatterBurst`, `warp`, `collectExtra`; `wallPass`/`invuln`/`speedBurst`/`ghostHarvest`/`defyDeath` when the timer goes up; `pelletSurge` per pellet converted; `shieldBreak` per Shield Pellets shield spent on a catch (not a death); `streakEngine` per Streak Engine fire; `echo` per Echo fired |
| `activeMs`                           | time `freeze`, `invuln`, `wallPass`, `speedBurst`, `ghostHarvest` were active                                                                                                                                                                                                                                                                                  |
| `targets`                            | frozen and recalled ghost names, warp distances in tiles, ghosts moved per Scatter Burst                                                                                                                                                                                                                                                                       |
| `fruit[]`                            | `{ kind, spawnedMs, eatenMs }`; `eatenMs: null` means it timed out                                                                                                                                                                                                                                                                                             |
| `quartersEarned`                     | by source: `fruit` (Quarter Bounty), `bonusBar`, `deathsBounty`, `nearMiss`, `offer`, `interest` (Interest, credited to the level just cleared)                                                                                                                                                                                                                |
| `bonusMaxTier`, `bonusFills`         | highest BONUS streak tier and bar fills                                                                                                                                                                                                                                                                                                                        |
| `turnTuning`                         | perfect and close turn sparks                                                                                                                                                                                                                                                                                                                                  |
| `offer`                              | `{ upgrades, quarters, picked, choiceMs }` for the level-clear offer                                                                                                                                                                                                                                                                                           |

There is no frightened mode or ghost eating in this game, so nothing records ghosts eaten.

## Deaths

Each catch, including ones Defy Death or Money Talks save:

`simMs`, `col`, `row`, `ghost` (kind name), `bossGhost`, `countdown`, `pelletsLeft`, `ghostMode` (`scatter`/`chase`), `elroyTier`, `ghostsOut` (ghosts not in the house), `livesAfter`, `defied`, `moneyTalks`, `bountyPaid` (Death's Bounty charged the bar), `harvested` (Death's Harvest pellets), `maxFrameMsLastSecond` (largest frame time in the second before the catch).

## RUN LOG FULL

At 500 stored runs, or after any save throws (quota), `MenuScene` hands off to `RunLogOverrunScene` before showing the menu. It shows the count and one action, PURGE OLDEST 10, which deletes the 10 oldest runs outright (no export). It returns to the menu once below the cap. Runs keep saving past 500; nothing is dropped automatically.

Unparseable records and records with an unknown `version` stay in storage, count toward the cap and are skipped when relabelling. A corrupt index reads as empty and the next save rewrites it, orphaning the old run keys.

`?runLogFill=N` (agent ports only) writes N synthetic `debug: true` runs at boot to reach this screen in a live check.
