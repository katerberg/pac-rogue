# Run-end replay

When a run ends (GAME OVER or RUN COMPLETE) the same end screen shows NEW GAME / MENU over a looping replay of the whole run. The replay lives in memory for the session only: nothing is saved, uploaded or exported.

## How it works

- `PlaySim` owns a `ReplayRecorder` (`src/game/sim/replayRecorder.ts`) that samples play frames at a fixed rate. Pauses, store floors, upgrade offers and death sequences record no frames, so they are skipped in playback by construction.
- Each `startBoard` begins a segment: the board's layout (activated again for that segment on playback so walls, offsets and sprite sizes match the level), then item add/remove events found by diffing entities between samples (pellets, power pellets, fruit, boss and optional pellets, plus Gleaning crumb dots), player and ghost frames, and deaths. Boss stage 2 stays in the stage-1 segment because the world is refilled in place.
- `src/domain/replay.ts` holds the types and the pure playback rules: the cursor (label, then play, then the next segment, looping forever), interpolation, and the snap rule for warps and respawns. Constants live there.
- `src/game/scenes/replayPlayer.ts` draws it: a backdrop that hides the frozen board, walls drawn with the live wall renderer (same style, inverted colour on boss stage 2), item sprites, Dot Man (fixed body, heading-rotated visor bobbing with distance travelled, as in play; with its invulnerable / wall-pass / programming tint), ghosts (frightened and frozen looks), a death ring and the `LEVEL N` label. It reads data only and never touches the world. The end screen's existing overlay dims it.
- `PlayScene` starts it on `endText`, fades the death overlay out, and exposes `play.replay` in the debug snapshot. An empty replay or a start error leaves the plain menu.

## Rules

- The death sequence no longer returns to the menu on its own: GAME OVER holds on the end screen like RUN COMPLETE, and `PlaySim.runEndMenuArmed` arms both.
- Recording stops after a fixed cap of sim time so memory stays bounded.
- Playback speed is derived per run: the loop lasts at least a minimum length, so short runs play in slow motion, and never faster than a maximum speed (constants in `src/domain/replay.ts`).
- No randomness and no sound in the replay.
- Known omissions: dropped walls, speed trails, charm tail, lava, speed zones, timed tunnels, boss chains, the sinkhole and other upgrade effects; pulsing and expiry blinks; store floors.
- LEARN has no run end, so it has no replay ([parity](./learn.md#parity)).
