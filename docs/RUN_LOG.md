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

| Field                                | Definition                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layout`, `inverted`, `boss`         | static layout id, or `gen:<boardSeed>` for a generated board                                                                                                                                                                                                                                                                                                                                                                          |
| `countdownStart`, `countdownEnd`     | the in-game timer at board start and at the clear (before the time-bonus drain)                                                                                                                                                                                                                                                                                                                                                       |
| `timeBonusPoints`                    | BONUS charge the drain pays (0 on the boss level)                                                                                                                                                                                                                                                                                                                                                                                     |
| `cleared`, `simMs`                   | whether the board was cleared; time played on it                                                                                                                                                                                                                                                                                                                                                                                      |
| `firstMoveMs`                        | first frame with direction input                                                                                                                                                                                                                                                                                                                                                                                                      |
| `pelletsCollected`                   | pellets eaten on this board                                                                                                                                                                                                                                                                                                                                                                                                           |
| `pace.p25…p100`                      | `{ simMs, countdown }` when 25/50/75/100% of the board's pellets were gone; `p100` is also set at the clear, which can leave power pellets behind                                                                                                                                                                                                                                                                                     |
| `lastPelletsMs`                      | time from ≤10 pellets left to the clear                                                                                                                                                                                                                                                                                                                                                                                               |
| `livesStart`, `livesEnd`, `livesMax` | lives at board start, after the level-end regen, and the most held                                                                                                                                                                                                                                                                                                                                                                    |
| `livesRegenerated`                   | lives regen added on this level (Myogenesis level-clear + store-entry, accumulated)                                                                                                                                                                                                                                                                                                                                                   |
| `deaths[]`                           | see below                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `tunnelWraps`                        | frames where the player's position jumped more than half the board (a tunnel wrap)                                                                                                                                                                                                                                                                                                                                                    |
| `tunnelDashes`                       | Tunnel Dash triggers                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `nearMisses`                         | a non-house ghost within 1 tile of the player's centre without a catch, at most once per ghost per second                                                                                                                                                                                                                                                                                                                             |
| `tilesTraveled`                      | player movement in tiles, excluding wraps and warp glides                                                                                                                                                                                                                                                                                                                                                                             |
| `idleMs`                             | after the first move, time the player did not move (against a wall, or no input)                                                                                                                                                                                                                                                                                                                                                      |
| `pausedMs`, `pauseCount`, `hiddenMs` | pause-menu time and tab-hidden time, measured by `PlayScene`                                                                                                                                                                                                                                                                                                                                                                          |
| `maxFrameMs`, `hitchFrames`          | the largest frame time, and frames over 50 ms                                                                                                                                                                                                                                                                                                                                                                                         |
| `powerPellets`                       | eaten by `player`, swept by `tunnelDash`, eaten by ghosts under `ghostHarvest`, granted by `fruit` (Fruit Power)                                                                                                                                                                                                                                                                                                                      |
| `activations`                        | per power pellet trigger: `freeze`, `recall` (per ghost), `scatterBurst`, `warp`, `collectExtra`; `wallPass`/`invuln`/`speedBurst`/`ghostHarvest`/`defyDeath` when the timer goes up; `pelletSurge` per pellet converted; `shieldBreak` per Shield Pellets shield spent on a catch (not a death); `streakEngine` per Streak Engine fire; `echo` per Echo fired; `frighten` per Hunter fright; `ghostEaten` per frightened ghost eaten |
| `activeMs`                           | time `freeze`, `invuln`, `wallPass`, `speedBurst`, `ghostHarvest` were active                                                                                                                                                                                                                                                                                                                                                         |
| `targets`                            | frozen and recalled ghost names, warp distances in tiles, ghosts moved per Scatter Burst                                                                                                                                                                                                                                                                                                                                              |
| `fruit[]`                            | `{ kind, spawnedMs, eatenMs }`; `eatenMs: null` means it timed out                                                                                                                                                                                                                                                                                                                                                                    |
| `quartersEarned`                     | by source: `fruit` (Quarter Bounty), `bonusBar`, `deathsBounty`, `nearMiss`, `offer`, `interest` (Interest, credited to the level just cleared), `hunter` (Hunter ghost eats filling the bar)                                                                                                                                                                                                                                         |
| `bonusMaxTier`, `bonusFills`         | highest BONUS streak tier and bar fills                                                                                                                                                                                                                                                                                                                                                                                               |
| `turnTuning`                         | perfect and close turn sparks                                                                                                                                                                                                                                                                                                                                                                                                         |
| `offer`                              | `{ upgrades, quarters, picked, choiceMs }` for the level-clear offer                                                                                                                                                                                                                                                                                                                                                                  |

There is no frightened mode or ghost eating in this game, so nothing records ghosts eaten.

## Deaths

Each catch, including ones Defy Death or Money Talks save:

`simMs`, `col`, `row`, `ghost` (kind name), `bossGhost`, `countdown`, `pelletsLeft`, `ghostMode` (`scatter`/`chase`), `elroyTier`, `ghostsOut` (ghosts not in the house), `livesAfter`, `defied`, `moneyTalks`, `bountyPaid` (Death's Bounty charged the bar), `harvested` (Death's Harvest pellets), `maxFrameMsLastSecond` (largest frame time in the second before the catch).

## RUN LOG FULL

At 500 stored runs, or after any save throws (quota), `MenuScene` hands off to `RunLogOverrunScene` before showing the menu. It shows the count and one action, PURGE OLDEST 10, which deletes the 10 oldest runs outright (no export). It returns to the menu once below the cap. Runs keep saving past 500; nothing is dropped automatically.

Unparseable records and records with an unknown `version` stay in storage, count toward the cap and are skipped when relabelling. A corrupt index reads as empty and the next save rewrites it, orphaning the old run keys.

`?runLogFill=N` (agent ports only) writes N synthetic `debug: true` runs at boot to reach this screen in a live check. The synthetic runs vary their last level, outcome, loadout and offers so the `/data` charts have something to draw.

## Viewing: `/data`

Open `/data` on the same origin you play on (`http://localhost:5173/data` for `npm run dev`). It is a separate page (`data/index.html`, code in `src/data/`), not linked from the game, and it reads the same localStorage. The dev and preview servers redirect `/data` to `/data/`. The counting is in `src/domain/runAnalytics.ts`; the page only draws.

- **Which runs count:** `death` and `complete` runs, never `debug` ones. **Include quit / abandoned** adds those. On agent ports only, **Include debug runs** adds the debug runs too (for live checks with `?runLogFill`). `inProgress` runs never count.
- **Reach:** a run's last level played, or **WIN** for a complete run. Medians count WIN as level 10.
- **Summary:** runs, win rate, median reach, and a chart of where all counted runs ended.
- **Upgrades table:** one row per base upgrade (a Plus form counts toward its base row; the **Plus** column counts runs that owned the Plus form). A run counts for an upgrade if it owned it at any point. Columns:
  - **Where runs ended:** bars for L1–L9 then WIN, each the share of this upgrade's runs ending there, drawn over grey bars for all counted runs. Hover a bar for the counts.
  - **Median reach**, **Win %**.
  - **Median level taken:** the median level the upgrade was first taken. Upgrades only available late look strong because those runs already got far; compare against this column.
  - **Pick %:** times picked out of times offered at a level clear (store purchases are not offers).
- **Sorting:** click Runs, Median reach, Win % or Pick %. Rows with fewer than 5 runs sink below the rest, greyed and tagged "low sample"; upgrades no counted run owned sit at the bottom.
- Not yet: a runs list or per-run detail, a game-version filter, death maps.
