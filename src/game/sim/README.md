# `src/game/sim/` — headless game simulation

Everything that decides what happens in a run lives here, with no Phaser. The scenes (`PlayScene`, `LearnScene`) are adapters: they turn Phaser input into a `SimInput`, call the sim, and apply the `SimEvent`s it returns. Vitest drives the same sims directly, so whole-game flows are tested in `npm run test`.

`check:ecs` only allows `createWorld` / `addEntity` in this folder, and ESLint bans `phaser` imports here.

**One live sim at a time.** The active maze layout is module-global (`activateLayout` in `src/domain/maze.ts`), and `start()` / level changes activate the sim's board. Finish stepping one sim before starting another; don't interleave two sims in one test.

## `PlaySim` (`playSim.ts`)

```ts
const sim = new PlaySim(options /* PlayOptions */, seed);
const startEvents = sim.start(); // board, starting upgrade, banners, music …
const events = sim.step(input /* SimInput */, deltaMs); // one frame
sim.chooseUpgrade(option); // answers a pending level-clear offer
sim.chooseRunEnd("newGame"); // answers the Run Complete menu ("newGame" / "menu")
```

- `options` come from `parsePlayOptions(new URLSearchParams(location.search))` in the game and from `{ ...defaultPlayOptions(), ...overrides }` in tests (`src/domain/playOptions.ts`).
- All randomness is drawn from `sim.random` (seeded `RunRandom`), so a seed plus the same inputs replays the run exactly.
- Read-only views for the adapter: `world`, `hud()`, `renderOptions()`, `storeState()`, `offer()`, `inStore()`, `readsStoreKeys()`, `snapshot()` (the debug snapshot's `play.*` fields, minus the scene's UI flags).
- `step` keeps `PlayScene`'s old gate order exactly: starting card → death sequence → run complete → level transition → store → level-end time drain → pending upgrade choice → pending level clear → the main pipeline (see `docs/ARCHITECTURE.md#game-loop`).

### `SimInput` (`simInput.ts`)

| Field                          | Meaning                                                                                                                                                                    |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `keys: HeldKeys`               | Press time (`timeDown`) per held direction, `null` when up. Most recent wins per axis; perpendicular pairs become diagonals when allowed (`src/game/systems/heldKeys.ts`). |
| `uiOpen`                       | The starting-upgrade card or level-clear modal is on screen (animating). The sim stays frozen while it is.                                                                 |
| `storeToggle` / `storeConfirm` | Store prompt keys pressed this frame (the scene reads them only when `readsStoreKeys()`).                                                                                  |

`IDLE_INPUT` is "nothing pressed, no UI".

### `SimEvent` (`simEvents.ts`)

Side effects the sim can't perform itself. The scene applies them in order, after `step` returns:

- Sound: `sfx`, `pelletSfx`, `loopStart`, `loopStop`, `musicAfterFanfare` (the scene holds it until the level-complete fanfare ends).
- Drawing: `draw` (with `SimRenderOptions`), `releaseDrawable`, `resetBoard`, `bouncePowerPellet`, `streakPop` (Streak Engine pop-off text).
- HUD / UI: `lives` (`pulse`), `quarters`, `bonus` (`tier` reached, Quarters `filled`; see [docs/bonus.md](../../../docs/bonus.md)), `timeBonus` (`active` while the level-end time drain runs), `upgrades`, `timer`, `timerVisible`, `banner`, `startingUpgrade`, `upgradeOffer`, `newLevelModal`, `storeOpened`, `storeSync`, `storePurchased`, `storeClosed`, `deathFade`, `endText`, `goToMenu`, `newGame` (restart `PlayScene`; from `chooseRunEnd`).
- Storage: `saveRun` (only when no debug flag is present), `seenGhosts`, `seenUpgrades`.

## `LearnSim` (`learnSim.ts`)

The LEARN sandbox: `start()`, `step(keys, deltaMs)`, `selectGhost(kind)`, `toggleUpgrade(id)`, plus getters the overlay reads (`selectedKind`, `ghostEid`, `helperBlinkyEid`, `ownedUpgrades`). The seen-record gating and all drawing stay in `LearnScene`.

## Writing a sim test

```ts
import { defaultPlayOptions } from "../../domain/playOptions";
import { PlaySim } from "./playSim";
import { held, runFrames, runUntil } from "./simTesting";

const sim = new PlaySim({ ...defaultPlayOptions(), level: 2, maze: "maze1" }, "test");
sim.start();
const events = runFrames(sim, 60, { keys: held("left") }); // fixed 1000/60 ms frames
expect(sim.snapshot().boardCollected).toBeGreaterThan(0);
expect(events.some((e) => e.type === "pelletSfx")).toBe(true);
runUntil(sim, () => !sim.snapshot().dying, 240);
```

Reach awkward states by editing components directly (teleport the player via `Position`, set a ghost's `GhostPhase`). Examples of every flow are in `playSim.test.ts` and `learnSim.test.ts`. Every gameplay feature or fix adds or extends one (see `docs/VERIFICATION.md#sim-integration-tests`).
