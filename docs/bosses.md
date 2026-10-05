# Boss levels

A boss level replaces a regular board with a scripted fight. Level 9 (`isBossLevel` in
[`src/domain/bossRules.ts`](../src/domain/bossRules.ts)) is the only boss level. Its boss is
rolled once per run from the seeded `bossPick` stream (`pickBoss`): **Blinky Swarm** or
**Chained Ghosts**, 50/50.

- `?level=9` (with or without `?play=1`) jumps straight into the boss fight (random boss).
- `?boss=blinkySwarm` / `?boss=chainedGhosts` forces that boss. Without `?level=` it also starts
  the run in the boss fight. Disables high-score saving.

## Entrance

Instead of the `LEVEL N` banner, a large red `BOSS` title slams in (scale 3 → 1 over 220ms),
the camera shakes (400ms), the title holds for 1.2s and then fades. Play is not frozen and no
extra sound plays.

## Blinky Swarm

| Rule             | Behavior                                                                                                                                                                                                                                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Board            | Procedural 28×34 maze generated with exactly **3** tunnel rows (`generateMazeAscii(seed, { tunnelCount: 3 })`), never inverted. Full regular + power pellet board. If no 3-tunnel board is found, a regular board is used (warning).                                                                           |
| Win              | Clear every pellet, same as any level. Then `RUN COMPLETE` with a `NEW GAME` / `MENU` choice (no upgrade offer).                                                                                                                                                                                               |
| Boss pellets     | 8 regular pellets (`BossPellet`) picked by `pickBossPelletCells` (farthest-point spread, never within 6 tiles of the player spawn). Tinted halfway between the maze color and white and pulsing once a second between 2× dot size at full brightness and 3× at 60% alpha.                                      |
| Spawning         | Starts with 2 Blinkys in the house. Each boss pellet eaten adds one Blinky (max 10) at the next free tunnel mouth, rotating clockwise from the bottom-left (`bossTunnelMouths`). A mouth with a Blinky within 2 tiles, or on the player's current row, is skipped (the spawn waits if every mouth is skipped). |
| Blinkys as walls | When choosing a direction, a Blinky treats any corridor (up to the next junction) holding another active Blinky as closed (`corridorOccupied`), unless every direction is closed. Two Blinkys meeting head-on both turn around.                                                                                |
| Targeting        | Normal scatter/chase waves. Chase targets the player (no Cruise Elroy). Each Blinky scatters to its own randomly assigned corner (several may share one).                                                                                                                                                      |
| Speed            | Flat `BOSS_GHOST_SPEED` (= base Maze-Man speed), half in tunnels, no level multiplier, no Elroy. `passiveGhostSlow` and Freeze still apply. Maze-Man keeps the level-9 speed.                                                                                                                                  |
| House            | Up to 4 Blinkys wait in the house and leave 0.6s apart (0.1s, 0.7s, 1.3s, 1.9s after the first input).                                                                                                                                                                                                         |
| Death            | Keeps the Blinky count and eaten pellets. The first 4 Blinkys restart in the house; the rest come out of the tunnels right away.                                                                                                                                                                               |
| Other            | Fruit behaves as on a normal level. Power pellets and upgrades work as usual; boss pellets are not power pellets.                                                                                                                                                                                              |

Debug: the **Swarm start Blinkys** knob (`?knobs=1`, Boss group, 2..10) starts the swarm with that
many Blinkys.

## Chained Ghosts

| Rule      | Behavior                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Board     | Regular procedural 28×34 maze. Full regular + power pellet board, no boss pellets.                                                                                                                                                                                                                                                                                                                                             |
| Win       | Clear every pellet, same as Blinky Swarm.                                                                                                                                                                                                                                                                                                                                                                                      |
| Ghosts    | Blinky, Pinky, Inky, and Clyde, all in the house. Classic release: Blinky 0.1s after first input, then Pinky, Inky, Clyde at +1.5s each. No more ghosts ever spawn.                                                                                                                                                                                                                                                            |
| Chain     | Two lightning chains: Blinky↔Clyde and Pinky↔Inky. Each joins the pair's centers once both ends are out of the house. Chains cut straight through walls. Touching a chain catches Maze-Man like a ghost does (his center within half his radius of the line; the death is recorded against the nearer end of that chain). Linked partners do not block each other; other boss ghosts still treat each other as corridor walls. |
| Off       | A pair's chain is off while either end is in the house, frozen (Freeze) or mid Scatter Burst glide. Invulnerability and `godMode` ignore chains like any ghost.                                                                                                                                                                                                                                                                |
| Tunnels   | All four ghosts are kept out of the side-tunnel wrap so the chains never jump across the board.                                                                                                                                                                                                                                                                                                                                |
| Targeting | Normal scatter/chase waves. Each kind keeps its usual chase (Blinky, Pinky lookahead, Inky, Clyde shy). In scatter each heads for its own randomly assigned corner.                                                                                                                                                                                                                                                            |
| Speed     | Same flat boss speed as Blinky Swarm.                                                                                                                                                                                                                                                                                                                                                                                          |
| Look      | Flickering lightning bolts (blue glow, pale blue bolt, white core) redrawn every 50ms for each live pair, under the ghost sprites.                                                                                                                                                                                                                                                                                             |
| Death     | All four ghosts restart in the house; each chain comes back once both of its ends are out again.                                                                                                                                                                                                                                                                                                                               |

## Code map

- `src/domain/bossRules.ts` — `BossDef` table, `isBossLevel`, `pickBoss`, `bossStartGhosts`, `BossState`, `splitBossGhosts`, `?boss` parse.
- `src/domain/bossChain.ts` — chain hit test (`chainHitsCircle`) and the lightning polyline (`lightningPoints`).
- `src/domain/bossBoard.ts` — tunnel mouth order and boss pellet placement.
- `src/domain/bossGhostBlocking.ts` — corridor occupancy walk used by `ghostAi`.
- `src/game/components/BossGhost.ts`, `BossPellet.ts`, `ChainedGhost.ts` — markers (per-ghost scatter corner and house release delay; chain ends with `pair` id).
- `src/game/systems/bossGhosts.ts` — head-on reversal, free-mouth pick, boss pellet count (Blinky Swarm).
- `src/game/systems/bossChain.ts` — live chain segments (`bossChains`) and `chainCatch`, run after `catchPlayer`; `render.ts` draws bolts from `SimRenderOptions.bossChains`.
- `ghostAi`, `ghostRelease`, `applyGhostSpeed` switch behavior on the `BossGhost` component.
- `PlayScene` wires it: `startBoss` / `tagBossPellets` in `startBoard`, `tickBoss` each frame, `spawnBossGhostsForLife` on death reset, `showBossBanner`.

## Adding a boss

1. Add an id to `BOSS_IDS` and a `BossDef` entry in `BOSS_DEFS` (it joins the level-9 roll and the `?boss=` flag).
2. Reuse the `BossGhost` / `BossPellet` markers where the rules match, or add new fields/systems for new rules.
3. Document it in a new section above and in [docs/levels.md](./levels.md).
