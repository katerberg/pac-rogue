# Run log

Every `PlayScene` run is recorded to `localStorage`, always, with no flag, to feed balance analysis. Code: `src/domain/runLog.ts` (schema, `RunLogRecord` / `LevelLog` types and pure recorders), `src/game/sim/runRecorder.ts` (draft `PlaySim` fills), `src/game/storage/runLogStorage.ts` (keys, persistence). Storage is per origin, so agent ports keep their own log. Field names and shapes are the types; this file defines only what they don't say.

## When a run is saved

`PlaySim` emits a `runLog` `SimEvent` and `PlayScene` saves it at run start, every level end (after life regen), store exit, game over (`death`), RUN COMPLETE (`complete`), `PlayScene` shutdown mid-run (`quit`) and `pagehide` (still `inProgress`). An `inProgress` run found at the next load becomes `abandoned` (`endedAt` stays null). `endedAt` is stamped the first time the outcome leaves `inProgress`.

`debug` is `true` exactly when the run had a high-score-disabling flag (`highScoresDisabled`); such runs are recorded normally and left out of stats.

## Field definitions

Level times are sim ms since the level started (pauses and the store do not count).

- `loadout[].source`: `start`, `offer`, `store`, `enhance` (the Plus id; the base entry gets `removedLevel`) or `flag` (`?enableUpgrade`). A store swap sets `removedLevel` on the outgoing upgrade.
- `pace.p25..p100`: sim time and countdown when that share of the board's pellets was gone; `p100` is also set at the clear, which can leave power pellets behind.
- `countdownEnd`: the timer at the clear, before the time-bonus drain.
- `nearMisses`: a non-house ghost within 1 tile of the player's centre without a catch, at most once per ghost per second.
- `idleMs`: after the first move, time the player did not move. `tilesTraveled` excludes wraps and warp glides.
- `activations`: per power-pellet trigger and per timer start; `shieldBreak` counts a spent shield on a catch (not a death).
- `quartersEarned` is split by source; Interest credits the level just cleared.
- `deaths[]` records every catch, including ones Defy Death or Money Talks save.

## Pruning

There is no prompt. Saving a new run within 5 of the 500-run cap, or any save that throws (quota), silently deletes the oldest 20 runs (and their upload marks), retrying a failed save once. Unparseable or unknown-`version` records stay, count toward the cap and are skipped when relabelling; a corrupt index reads as empty and the next save rewrites it. `?runLogFill=N` (agent ports only) writes N varied synthetic `debug` runs to reach the prune threshold and fill `/data`.

## Uploads

Finished, non-`debug` runs that started at or after `since` (the time this browser first ran an upload-capable build) go to the `dot-man-api` Worker ([worker/README.md](../worker/README.md), privacy: [PRIVACY.md](./PRIVACY.md)). `drainRunUploads()` (`src/game/net/apiClient.ts`) runs at boot and after each final save; 2xx or 400 marks done, 429/5xx/network stops the drain for retry. Opt-out is Settings SHARE RUN STATS. Nothing is sent unless the build has `VITE_API_URL`, and dev servers or `localhost` pages only ever talk to a local API (`resolveApiUrl`), so a leaked production URL cannot write to the real database.

## Viewing: `/data`

Open `/data` on the origin you play on. The source switch picks THIS BROWSER or GLOBAL (PULLED): every uploaded run from the file `npm run data:pull` writes to `data-exports/latest.json` (served at `/data/export.json` by the dev server only), or LOAD FILE.

- Counted runs are `death` and `complete`, never `debug` (agent ports can include debug for live checks). Reach is the last level played, or WIN (level 10 for medians).
- The upgrades table has one row per base upgrade (Plus counts toward its base); a run counts if it owned the upgrade at any point. **Median level taken** exists because late-only upgrades look strong when those runs already got far. Pick % is picks over level-clear offers (store purchases are not offers).
- Rows with fewer than 5 runs sink below the rest and are tagged "low sample".
