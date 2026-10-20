# New player experience

Stub for future tutorial / onboarding documentation. Rules that shape a first session on a new device live here; deeper tutorial flows are not written yet.

## First play on a new device

A browser with an empty run log (`storedRunCount() === 0`) is treated as a new device. The first level-1 run that would grant a starting upgrade always prefers **Freeze** (`powerPelletFreeze`) when that id is still eligible; otherwise the usual random draw from `STARTING_UPGRADE_POOL` runs. See `preferredStartingUpgrade` in [`src/domain/newPlayer.ts`](../src/domain/newPlayer.ts) and `pickStartingUpgrade` in [`src/domain/upgrades.ts`](../src/domain/upgrades.ts).

After that first run starts, the run log is non-empty, so later New Game starts use the normal random starting upgrade. Clearing site data makes the device “new” again.

Same gates as any starting upgrade: skipped for `level>=2`, store starts, `jumpToUpgrade`, `disableLevelUpgrades`, or a failed custom maze ([upgrades.md](./upgrades.md#grant-rules)).

## Tutorial

Not written yet. Placeholder for coach marks, forced first power-pellet chomp, and other first-session teaching.

## LEARN

Deliberate omission: LEARN has no starting-upgrade card or run log, so this first-play Freeze rule does not apply there ([parity](./learn.md#parity)).
