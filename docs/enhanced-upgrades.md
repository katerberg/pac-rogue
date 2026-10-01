# Enhanced upgrades (planning)

Working spec for the store's **enhance** feature. Nothing here is implemented yet; the "Enhanced" column is filled in by the designer, then drives a one-shot plan (`one-shot-plan` skill).

## Store offers

| #   | Offer                | Today's equivalent                       | Gap                                               |
| --- | -------------------- | ---------------------------------------- | ------------------------------------------------- |
| 1   | Extra life           | `L` slot (unlimited, `STORE_LIFE_PRICE`) | none                                              |
| 2   | Extra life (limit 2) | none                                     | stock limit of 2                                  |
| 3   | Ability enhancement  | none                                     | upgrades an owned ability to its enhanced version |
| 4   | New ability          | `U` slot (3 per store)                   | cut to 2                                          |
| 5   | New ability          | `U` slot                                 | see above                                         |
| 6   | Ability trade        | `S` swap slot                            | rename only                                       |

The first store ([`STORE_FIRST_LEVEL`](../src/domain/store.ts)) offers only the 2 lives and 2 new abilities. Later stores offer all six.

## Upgrades and their enhanced versions

| #   | Id                           | Label               | Now                                                                                      | Enhanced |
| --- | ---------------------------- | ------------------- | ---------------------------------------------------------------------------------------- | -------- |
| 1   | `powerPelletFreeze`          | Power Freeze        | Power pellet freezes the nearest ghost for 3s                                            | _TBD_    |
| 2   | `passivePlayerSpeedUp`       | Speed Up            | Player speed ×1.25                                                                       | _TBD_    |
| 3   | `passiveGhostSlow`           | Ghost Slow          | Ghost speed ×0.75                                                                        | _TBD_    |
| 4   | `powerPelletScatterBurst`    | Scatter Burst       | Power pellet forces scatter for 3s                                                       | _TBD_    |
| 5   | `powerPelletGhostRecall`     | Ghost Recall        | Power pellet sends the nearest ghost back to the house                                   | _TBD_    |
| 6   | `powerPelletWarpTop`         | Warp Top            | Power pellet warps you to the top-middle                                                 | _TBD_    |
| 7   | `passivePickupRange`         | Pickup Range        | Regular pellets within 1 tile are auto-collected (with line of sight)                    | _TBD_    |
| 8   | `passiveGhostHouseDelay`     | House Delay         | +2s on Blinky/Pinky release, +15 dots on Clyde                                           | _TBD_    |
| 9   | `passiveExtraLife`           | Extra Life          | +1 life now; regen floor 3 → 4                                                           | _TBD_    |
| 10  | `passivePelletToPower`       | Pellet Surge        | One regular pellet becomes a power pellet per board, and one on grant                    | _TBD_    |
| 11  | `powerPelletCollectThree`    | Triple Chomp        | Power pellet also eats 3 nearby pellets, not ahead of you                                | _TBD_    |
| 12  | `powerPelletWallPass`        | Wall Pass           | Power pellet: walk through walls (diagonals too) for `WALL_PASS_MS`                      | _TBD_    |
| 13  | `powerPelletSpeedBurst`      | Speed Burst         | Power pellet gives ×1.25 speed for 3s                                                    | _TBD_    |
| 14  | `powerPelletInvuln`          | Ghost Proof         | Power pellet: pass through ghosts for 3s                                                 | _TBD_    |
| 15  | `powerPelletGhostHarvester`  | Ghost Harvester     | Power pellet: ghosts eat pellets for you for 5s                                          | _TBD_    |
| 16  | `fruitPowerPellet`           | Fruit Power         | Fruit triggers every owned power-pellet effect                                           | _TBD_    |
| 17  | `fruitQuarterBounty`         | Quarter Bounty      | Fruit pays 2 Quarters instead of 1                                                       | _TBD_    |
| 18  | `fruitFecundity`             | Fruit Fecundity     | Fruit lasts 2× as long                                                                   | _TBD_    |
| 19  | `fruitFeast`                 | Fruit Feast         | 3 fruit per level (60/130/200 pellets) instead of 2                                      | _TBD_    |
| 20  | `passiveDeathsHarvest`       | Death's Harvest     | Getting caught harvests pellets within 6 tiles; an emptied board counts as a level clear | _TBD_    |
| 21  | `passiveOvercharge`          | Overcharge          | Doubles every other power-pellet timer                                                   | _TBD_    |
| 22  | `passiveTunnelDash`          | Tunnel Dash         | Entering a tunnel band sweeps pellets and teleports you to the opposite mouth            | _TBD_    |
| 23  | `passivePowerPelletRecharge` | Second Chomp        | Eaten power pellets respawn after 10s                                                    | _TBD_    |
| 24  | `passiveRemoteTransference`  | Remote Transference | Every 5th pellet also eats the farthest one                                              | _TBD_    |
| 25  | `passiveMyogenesis`          | Myogenesis          | Level-clear regen gives up to 2 lives instead of 1                                       | _TBD_    |
| 26  | `passiveDefyDeath`           | Defy Death          | Power pellet arms 5s where a catch costs no life                                         | _TBD_    |
| 27  | `passiveTurnTuning`          | Turn Tuning         | Turns can be tapped 2 tiles early; a perfect tap gives a 0.5s speed boost                | _TBD_    |

## Open questions

- Extra Life / Myogenesis: what does enhanced mean for life-based upgrades?
- Fruit Power / Overcharge amplify other upgrades: should they scale with enhanced ones?
- Wall Pass: `WALL_PASS_MS` is 6000 in code but [upgrades.md](./upgrades.md) says 3000. Which is intended?
- Can an upgrade be enhanced only once? Does enhanced replace the base effect or add to it?
- Does a swap keep or reset the enhanced state of the lost upgrade?

## Follow-ups when implemented

- `UpgradeDef` gains an enhanced variant; the "Adding an upgrade" checklist in [upgrades.md](./upgrades.md#adding-an-upgrade) requires one for every new upgrade.
- LEARN page gets an enhanced on/off toggle for upgrades that have one ([learn.md](./learn.md)), done last.
