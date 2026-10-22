# Fixed level plan

The run is a fixed 9-level plan (`MAX_LEVEL` in `src/domain/levelRules.ts`; `levelRules.ts` is the source for speeds, schedules, thresholds and rosters). Level 1 is the hand-made `mazeSmall`; levels 2-8 replay one map from the committed pool (`mazePool.ts` / `mazePool.json`; rules in [maze-constraints.md](./maze-constraints.md); level 9 is a boss on its own generated board ([bosses.md](./bosses.md)).

## Flow

- Levels 1-8 clear: level-end [time pennies](./pennies.md#time-pennies) drain, then the pick-one [upgrade](./upgrades.md) modal, then the next board. Level 1 also grants a starting upgrade at board start. Store floors ([store.md](./store.md)) sit between certain levels (`storeAfterLevel` in `store.ts`) and are where Quarters are spent.
- Level 9 clear needs both boss stages, then RUN COMPLETE. No upgrade offer, no time bonus, no high-score write (only last-life Game Over writes history).
- `?level=` clamps to `MAX_LEVEL`, so `level=9` jumps into the boss.

## Intermission

After level 2 and again after level 4 clear (and the upgrade choice resolves), the transition freeze is followed by a short cutscene with the board hidden, then the next level. Which cutscene plays is drawn from the `intermission` `RunRandom` stream over the registry in `src/domain/intermission.ts`, never repeating the run's previous cutscene (`?intermission=<id>` forces one and opens the run in it; see the README Flags).

- Each cutscene is one pure script file (`intermission<Name>.ts`, type `IntermissionScript` in `intermissionScript.ts`): a duration plus `beatAt(elapsedMs)`, which returns a named beat (for probes and tests) and the actors on screen (Dot-Man, ghosts, props), each with a stable key. Most act out an upgrade: a ghost chases Dot-Man to a power pellet, then the upgrade plays out. The shared chase, pellet, bounce and exit-timing helpers live in `intermissionScript.ts`. `beatAt` also receives the cast (`IntermissionCast`: the ghost kinds on the cleared board, read by `PlaySim` when the cutscene starts), so a script can show the run's own ghosts, as Scatter Burst does.
- Adding a cutscene is a new script plus one registry entry. `PlaySim` owns the timer and emits `intermission` frames; `PlayScene` (`intermissionActors.ts`) creates, moves and removes one view per actor key and needs no change unless a script uses a new actor kind. The cutscene loops `interstitialMusic` (same volume as gameplay music; the pause-menu Settings controls it via `PlayScene.currentMusicId()`). LEARN has no level progression, so it has no counterpart.

## Speed

Maze-Man's base is `PLAYER_SPEED` (`playfield.ts`). Ghost, tunnel, Elroy, house-exit and boss speeds are ratios of it, so they hold at any base. Both sides gain a per-level multiplier (`speedLevelMultiplier`); ghosts also start slower and catch up (`ghostBaseSpeedRatio`) so level 1 is forgiving. On level 1 only, Blinky's Cruise Elroy ratios are soft-capped below the full tuning values (`ghostSpeed.ts`) so the end-board sprint is milder. If Blinky takes a life while Elroy is active, Elroy stays off for the rest of that board (`PlaySim`); saves that do not spend a life leave it on. Timers (durations, waves, idle release, fruit) are wall-clock, independent of speed.

## Board variants

- **Timed tunnel** levels (`isTimedTunnelLevel`): one seeded tunnel row cycles open / warn / closed.
- **Lava** level (`isLavaZoneLevel`, `src/domain/lavaZone.ts`): one seeded lava patch, centred on a straight hallway with no intersection or speed lane cell anywhere in its reach, cycles dormant (a cooled bed, which glows with embers before it opens) → creeping out from the centre, sweeping around a corner cell → full → retracting. The cycle waits for Dot-Man's first direction input (same as the run clock / ghost release), so the waiting period has no flow; a life loss restarts it dormant until he moves again. Touching it kills Dot-Man like a ghost catch, unless he has Floating; ghosts cross it freely.
- **Speed lane** levels (`speedZoneCountForLevel`, `src/domain/speedZones.ts`): seeded straight lanes speed Dot-Man up when he moves in the lane's fast direction and slow him moving the other way; ghosts ignore them. Faint dust drifts toward the fast end, its speed rising evenly from a slow entry to a fast exit (Visuals → Speed lanes knobs under `?knobs=1`). Lanes persist: each keeps its spot and direction while its ends drift (leaning longer), new ones join later, and board start leaks them tile by tile from last level's shape. `speedZonesByLevel` replays them from the seed.

- **Collapsed tunnels** (`src/domain/collapse.ts`, `COLLAPSE_LEVELS`): one collapse arrives on each listed level and stays for the rest of the pool levels. `pickCollapsePlan` runs once per run on the pool base map and only takes whole corridor runs between junctions, so nothing dead-ends or gets cut off. `PlaySim` writes the collapsed lanes into the board ASCII as walls (solids, pellets and pellet-scaled thresholds follow), and replays speed lanes on the board with every collapse applied so a lane never sits where a collapse will land. The rubble is drawn over the merged wall (`src/domain/collapseRubble.ts`, look in `RUBBLE_STYLE`); dust motes fly off a collapse and settle beside it the first time it appears (`introMs`), then stay put on later levels.
- **Sinkhole** (`SINKHOLE_LEVEL` in `src/domain/collapse.ts`, art in `src/domain/sinkholeArt.ts`, look in `SINKHOLE_STYLE`): one corridor blocker that arrives on that level and stays for the rest of the pool levels. It is the extra run `pickCollapsePlan` finds after the rubble chains, so it follows the same rules (whole corridor run, nothing cut off or dead-ended) and the rubble chains stay where they were. Unlike rubble it is a hole, not a wall: `withSinkholes` blocks only Dot-Man (`playerSolids`, wall pass included), while ghosts keep `ghostActiveSolids` and walk over it. Its pellets are removed from the board, and speed lanes treat it as taken. The first time it appears it cracks open: a crack runs out from the middle along the whole run, then the hole widens from that line (`sinkholeOpening`, `SINKHOLE_INTRO_MS`); the cells already block Dot-Man while it opens, and later levels show it open. Art is 16 art pixels per tile (the ghost sprite density), unlike the 2px rubble grid.
- **Tunnel Boring openings** (`src/domain/tunnelBoring.ts`, upgrade `passiveTunnelBoring`): a bore punches consecutive wall cells until a corridor (or, at the exterior, opens the opposite edge into a wrap tunnel). Bored cells rewrite the board ASCII to empty corridor and stay open for later boards that reuse the same base map (pool levels 2–8), the same way collapses persist. Level 1 and boss boards keep holes only for that board. Ghosts walk bored cells; ghost-house walls cannot be bored.

Speed lane, lava, collapse and sinkhole levels are **level modifiers**: `?levelModifiers=0` turns them off (see README Flags). Add new modifiers behind `PlayOptions.levelModifiers` too.

## Scatter and chase

`ghostModeWavesForLevel` builds each level's waves. Level 1 and the boss are chase-only; scatter windows shrink with level so scatter is not a late escape hatch, and the last chase lasts forever. Scatter never runs below a pellet-count floor (`effectiveGhostMode`): ghosts reverse and chase for the rest of the board while the wave clock keeps running underneath.

## Ghost roster

Blinky is always present. The other three come from one of six curated rosters (`pickRosterId`, the `roster` seed stream; `?roster=0..5` forces one): a front arm (Pinky or Wardy) in slot 1, a flank in slot 2 (Inky, or the other front arm) and a relief ghost in slot 3 (Clyde or Spunky). `ghostKindsForLevel` introduces slots in order: level 1 slots 0-1, level 2 slots 0-2, level 3+ all four through level 8, then the board's `houseSeatCount` trims the list so a narrow house never stacks sprites. Targeting per ghost: `ghostTarget.ts`.

## Ghost house release

Release is keyed to the roster **slot**, never the ghost's name. Nothing leaves before the first player input. Slots 0 and 1 leave on short timers, slots 2 and 3 on layout-scaled dot counts that relax with level, and after a life loss a shared dots-eaten counter releases slots 1-3. An idle push-out releases the lowest waiting slot when no dot is eaten for a while. All numbers: `ghostRelease.ts`, `ghostHouseLeave.ts`, `ghostHouseOrder.ts`. In-house ghosts sit in derived L-to-R seats ordered by predicted release.

## Lives

Runs start at `START_LIVES`. Natural regen is the free life in the centre of each store ([store.md](./store.md#layout-and-tiles)), offered only while the player is below a floor of HUD icons (`livesAfterLevelRegen`, `lives.ts`), so a run that fell below it trickles back across store visits. Extra Life and Myogenesis modify the floor and level-clear regen.

## Fruit

Spawns at layout-scaled board-pellet thresholds under the ghost house (`fruit.ts`), lasts a fixed real-time window, and adds half a Quarter of pennies rather than giving an upgrade. The pool is every 16×16 PNG in [`src/art/fruit/`](../src/art/fruit); drop a file in and it joins the seeded per-level order ([`src/game/fruitArt.ts`](../src/game/fruitArt.ts) globs the folder, same pattern as [upgrade art](./upgrades.md#upgrade-art)). Concurrent fruit prefer distinct kinds and a level keeps its spawn order across retries.
