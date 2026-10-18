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

- `options` come from `parsePlayOptions(parseQueryParams(location.search))` in the game and from `{ ...defaultPlayOptions(), ...overrides }` in tests (`src/domain/playOptions.ts`).
- All randomness is drawn from `sim.random` (seeded `RunRandom`), so a seed plus the same inputs replays the run exactly.
- Read-only views for the adapter: `world`, `hud()`, `renderOptions()`, `storeState()`, `offer()`, `inStore()`, `readsStoreKeys()`, `snapshot()` (the debug snapshot's `play.*` fields, minus the scene's UI flags).
- `step` keeps `PlayScene`'s old gate order exactly: starting card → death sequence → run complete → level transition → store → BONUS slot spin → level-end time drain → pending upgrade choice → pending level clear → the main pipeline (see `docs/ARCHITECTURE.md#game-loop`).

### `SimInput` and `SimEvent`

`SimInput` (`simInput.ts`) carries held-key press times, whether a card or modal is animating (the sim stays frozen) and store prompt keys; `IDLE_INPUT` is nothing pressed. `SimEvent` (`simEvents.ts`) is the union of side effects the sim can't perform itself (sound, drawing, HUD/UI, storage); the scene applies them in order after `step` returns. Both files are the reference.

## `LearnSim` (`learnSim.ts`)

The LEARN sandbox: `start()`, `step(keys, deltaMs)`, `selectGhost(kind)`, `toggleUpgrade(id)`, plus getters the overlay reads (`selectedKind`, `ghostEid`, `helperBlinkyEid`, `ownedUpgrades`). The seen-record gating and all drawing stay in `LearnScene`.

## Balance bots (`bots/`)

`npm run balance` drives `PlaySim` with scripted bot profiles (persona × skill tier) to measure upgrades, builds and ghosts. Bots only produce `SimInput`s and answer offers and store prompts; they never write to the world. See [docs/BALANCE_BOTS.md](../../../docs/BALANCE_BOTS.md).

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
