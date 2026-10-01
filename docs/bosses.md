# Boss levels

A boss level replaces a regular board with a scripted fight. `bossForLevel(levelIndex)` in
[`src/domain/bossRules.ts`](../src/domain/bossRules.ts) maps a level to a `BossDef`; every other
level returns `null` and plays normally. Today only level 9 has a boss.

`?level=9` (with or without `?play=1`) jumps straight into the boss fight.

## Entrance

Instead of the `LEVEL N` banner, a large red `BOSS` title slams in (scale 3 → 1 over 220ms),
the camera shakes (400ms), the title holds for 1.2s and then fades. Play is not frozen and no
extra sound plays.

## Double Blinky (level 9)

| Rule             | Behavior                                                                                                                                                                                                                                                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Board            | Procedural 28×34 maze generated with exactly **3** tunnel rows (`generateMazeAscii(seed, { tunnelCount: 3 })`), never inverted. Full regular + power pellet board. If no 3-tunnel board is found, a regular board is used (warning).                                                                           |
| Win              | Clear every pellet, same as any level. Then `RUN COMPLETE` → menu (no upgrade offer).                                                                                                                                                                                                                          |
| Boss pellets     | 8 regular pellets (`BossPellet`) picked by `pickBossPelletCells` (farthest-point spread, never within 6 tiles of the player spawn). Tinted halfway between the maze color and white and pulsing once a second between 2× dot size at full brightness and 3× at 60% alpha.                                      |
| Spawning         | Starts with 2 Blinkys in the house. Each boss pellet eaten adds one Blinky (max 10) at the next free tunnel mouth, rotating clockwise from the bottom-left (`bossTunnelMouths`). A mouth with a Blinky within 2 tiles, or on the player's current row, is skipped (the spawn waits if every mouth is skipped). |
| Blinkys as walls | When choosing a direction, a Blinky treats any corridor (up to the next junction) holding another active Blinky as closed (`corridorOccupied`), unless every direction is closed. Two Blinkys meeting head-on both turn around.                                                                                |
| Targeting        | Normal scatter/chase waves. Chase targets the player (no Cruise Elroy). Each Blinky scatters to its own randomly assigned corner (several may share one).                                                                                                                                                      |
| Speed            | Flat `BOSS_GHOST_SPEED` (= base Maze-Man speed), half in tunnels, no level multiplier, no Elroy. `passiveGhostSlow` and Freeze still apply. Maze-Man keeps the level-9 speed.                                                                                                                                  |
| House            | Up to 4 Blinkys wait in the house and leave 0.6s apart (0.1s, 0.7s, 1.3s, 1.9s after the first input).                                                                                                                                                                                                         |
| Death            | Keeps the Blinky count and eaten pellets. The first 4 Blinkys restart in the house; the rest come out of the tunnels right away.                                                                                                                                                                               |
| Other            | Fruit behaves as on a normal level. Power pellets and upgrades work as usual; boss pellets are not power pellets.                                                                                                                                                                                              |

Debug: `?bossGhosts=N` (2..10) starts the boss with N Blinkys (disables high-score saving).

## Code map

- `src/domain/bossRules.ts` — `BossDef` table, `bossForLevel`, `BossState`, `splitBossGhosts`, `?bossGhosts` parse.
- `src/domain/bossBoard.ts` — tunnel mouth order and boss pellet placement.
- `src/domain/bossGhostBlocking.ts` — corridor occupancy walk used by `ghostAi`.
- `src/game/components/BossGhost.ts`, `BossPellet.ts` — markers (per-ghost scatter corner and house release delay).
- `src/game/systems/bossGhosts.ts` — head-on reversal, free-mouth pick, boss pellet count.
- `ghostAi`, `ghostRelease`, `applyGhostSpeed` switch behavior on the `BossGhost` component.
- `PlayScene` wires it: `startBoss` / `tagBossPellets` in `startBoard`, `tickBoss` each frame, `spawnBossGhostsForLife` on death reset, `showBossBanner`.

## Adding a boss

1. Add an id to `BossId` and a `BossDef` entry in `BOSS_DEFS`; map its level in `BOSS_BY_LEVEL` (raise `MAX_LEVEL` if it is a new level).
2. Reuse the `BossGhost` / `BossPellet` markers where the rules match, or add new fields/systems for new rules.
3. Document it in a new section above and in [docs/levels.md](./levels.md).
