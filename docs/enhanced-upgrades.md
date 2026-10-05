# Enhanced upgrades (design reference)

**Status: implemented.** The mechanism and the shipped behavior are in [upgrades.md](./upgrades.md#enhanced-upgrades) and [store.md](./store.md). This file keeps the design table and the decisions behind it. Every new upgrade needs its row here.

The Enhanced column below was written by the designer and drove the one-shot plan.

## Store offers

| #   | Offer                | Today's equivalent                       | Gap                                               |
| --- | -------------------- | ---------------------------------------- | ------------------------------------------------- |
| 1   | Extra life           | `L` slot (unlimited, `STORE_LIFE_PRICE`) | none                                              |
| 2   | Extra life (limit 2) | none                                     | stock limit of 2                                  |
| 3   | Ability enhancement  | none                                     | upgrades an owned ability to its enhanced version |
| 4   | New ability          | `U` slot (3 per store)                   | cut to 2                                          |
| 5   | New ability          | `U` slot                                 | see above                                         |
| 6   | Ability trade        | `S` swap slot                            | rename only                                       | Warps farthest from ghosts **and** grants 2s invulnerability with the Ghost Proof tint (own timer) |

The first store ([`STORE_FIRST_LEVEL`](../src/domain/store.ts)) offers only the 2 lives and 2 new abilities. Later stores offer all six.

## Upgrades and their enhanced versions

| #   | Id                            | Label                 | Now                                                                                                              | Enhanced                                                                                                                                     |
| --- | ----------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `powerPelletFreeze`           | Freeze                | Power pellet freezes the nearest ghost for 3s                                                                    | Freeze 5s                                                                                                                                    |
| 2   | `passiveAfterburner`          | Afterburner           | Speed ×1.3 on empty cells                                                                                        | Speed ×1.5 on empty cells                                                                                                                    |
| 3   | `passiveGhostSlow`            | Ghost Slow            | Ghost speed ×0.75                                                                                                | Ghost speed ×0.65. **Base also changes:** 0.75 → 0.8                                                                                         |
| 4   | `powerPelletScatterBurst`     | Scatter Burst         | Power pellet warps every active ghost to its corner                                                              | Ghosts also hold still for 2s after landing                                                                                                  |
| 5   | `powerPelletGhostRecall`      | Ghost Recall          | Power pellet sends the nearest ghost back to the house                                                           | Sends the nearest 2 ghosts home                                                                                                              |
| 6   | `powerPelletWarpFarthest`     | Warp Farthest         | Power pellet warps you away from ghosts                                                                          | Warps farthest from ghosts **and** grants 2s invulnerability with the Ghost Proof tint (own timer)                                           |
| 7   | `passivePickupRange`          | Pickup Range          | Regular pellets within 1 tile are auto-collected (with line of sight)                                            | Pickup range 2 tiles                                                                                                                         |
| 8   | `passiveGhostHouseDelay`      | House Delay           | +2s on Blinky/Pinky release, +15 dots on Clyde                                                                   | +3s on Blinky/Pinky release, +25 dots on Clyde                                                                                               |
| 9   | `passiveExtraLife`            | Extra Life            | +1 life now; regen floor 3 → 4                                                                                   | +1 more life (2 total) and regen floor 5                                                                                                     |
| 10  | `passivePelletToPower`        | Pellet Surge          | One regular pellet becomes a power pellet per board, and one on grant                                            | 2 pellets converted per board in total (base 1)                                                                                              |
| 11  | `powerPelletExtraHungry`      | Extra Hungry          | Power pellet also eats the 5 farthest pellets                                                                    | Eats the 10 farthest pellets                                                                                                                 |
| 12  | `powerPelletWallPass`         | Wall Pass             | Power pellet: walk through walls (diagonals too) for `WALL_PASS_MS`                                              | Loop through the outer edges as if tunnels were there (no real tunnels or holes carved; vertical and horizontal wrap, player only); still 6s |
| 13  | `powerPelletSpeedBurst`       | Speed Burst           | Power pellet gives ×1.25 speed for 3s                                                                            | Speed ×1.5                                                                                                                                   |
| 14  | `powerPelletInvuln`           | Ghost Proof           | Power pellet: pass through ghosts for 3s                                                                         | Invulnerable 5s                                                                                                                              |
| 15  | `powerPelletGhostHarvester`   | Ghost Harvester       | Power pellet: ghosts eat pellets for you for 5s                                                                  | Ghosts harvest for 8s                                                                                                                        |
| 16  | `fruitPowerPellet`            | Fruit Power           | Fruit triggers every owned power-pellet effect                                                                   | Fruit also turns a random regular pellet into a power pellet                                                                                 |
| 17  | `fruitQuarterBounty`          | Quarter Bounty        | Fruit pays 2 Quarters instead of 1                                                                               | **Base changes:** a fruit gives 1 Quarter _instead of_ the bonus-bar charge. Enhanced: 2 Quarters instead of the bar charge                  |
| 18  | `fruitFecundity`              | Fruit Fecundity       | Fruit lasts 2× as long                                                                                           | Fruit lasts until the level ends; uncollected fruit sit side by side in the same row. Base keeps today's 2×                                  |
| 19  | `fruitFeast`                  | Fruit Feast           | 3 fruit per level (60/130/200 pellets) instead of 2                                                              | 4 fruit per level at 45/100/150/200 pellets (scaled by maze size); still one at a time, so an uncollected fruit can block later ones         |
| 20  | `passiveDeathsHarvest`        | Death's Harvest       | Getting caught harvests pellets within 6 tiles; an emptied board counts as a level clear                         | Harvest radius 10 tiles                                                                                                                      |
| 21  | `passiveOvercharge`           | Overcharge            | Doubles every other power-pellet timer                                                                           | Triples every other timer, enhanced ones included. Does not touch Warp Farthest's invulnerability                                            |
| 22  | `passiveTunnelDash`           | Tunnel Dash           | Entering a tunnel band sweeps pellets and teleports you to the opposite mouth                                    | **Base changes:** ghost tunnel speed 0.5× → 0.6× player speed (applies to every run). Enhanced: 0.3×                                         |
| 23  | `passivePowerPelletRecharge`  | Second Chomp          | Eaten power pellets respawn after 10s                                                                            | Respawn after 7s                                                                                                                             |
| 24  | `passiveRemoteTransference`   | Remote Transference   | Every 5th pellet also eats the farthest one                                                                      | Every 3rd pellet                                                                                                                             |
| 25  | `passiveMyogenesis`           | Myogenesis            | Level-clear regen gives up to 2 lives instead of 1                                                               | Level-clear regen fills every available life slot                                                                                            |
| 26  | `passiveDefyDeath`            | Defy Death            | Power pellet arms 5s where a catch costs no life                                                                 | One-save window lengthened from 5s to 8s                                                                                                     |
| 27  | `passiveTurnTuning`           | Turn Tuning           | Turns can be tapped 2 tiles early; a perfect tap gives a 0.5s speed boost                                        | Perfect-tap boost lasts 0.75s; perfect-tap range 8px → 12px                                                                                  |
| 28  | `passiveDeathsBounty`         | Death's Bounty        | Each death pays a full BONUS bar (one Quarter); each later death on the same level pays 20% less, compounding    | 10% less per later death instead of 20%                                                                                                      |
| 29  | `passiveMoneyTalks`           | Money Talks           | A catch on the last life spends 3 Quarters to keep it                                                            | A save costs 1 Quarter instead of 3                                                                                                          |
| 30  | `passiveLazyLooper`           | Lazy Looper           | Only the outer pellet ring and the pellets beside the ghost house must be eaten; the rest turn grey              | Only the outer ring is required                                                                                                              |
| 31  | `passiveShieldPellets`        | Shield Pellets        | Power pellets bank 1 shield instead of firing; a ghost catch breaks it, fires the effects and grants 1s immunity | Bank up to 3 shields                                                                                                                         |
| 32  | `passiveDeathSpecialist`      | Death Specialist      | With 3+ other Death upgrades owned, every Death upgrade is enhanced                                              | Every Death upgrade is enhanced, no threshold                                                                                                |
| 33  | `passiveHarvestSpecialist`    | Harvest Specialist    | With 3+ other Harvest upgrades owned, every Harvest upgrade is enhanced                                          | Every Harvest upgrade is enhanced, no threshold                                                                                              |
| 34  | `passiveSpeedSpecialist`      | Speed Specialist      | With 3+ other Speed upgrades owned, every Speed upgrade is enhanced                                              | Every Speed upgrade is enhanced, no threshold                                                                                                |
| 35  | `passiveProtectionSpecialist` | Protection Specialist | With 3+ other Protection upgrades owned, every Protection upgrade is enhanced                                    | Every Protection upgrade is enhanced, no threshold                                                                                           |
| 36  | `passiveDisruptionSpecialist` | Disruption Specialist | With 3+ other Disruption upgrades owned, every Disruption upgrade is enhanced                                    | Every Disruption upgrade is enhanced, no threshold                                                                                           |
| 37  | `passiveMartyr`               | Martyr                | Dying sends the ghosts to their corners and respawns you where you fell                                          | Ghosts go back into the ghost house instead                                                                                                  |
| 38  | `passiveInterest`             | Interest              | Each store pays 1 Quarter for every 3 you hold                                                                   | Pays 1 Quarter for every 2 held instead                                                                                                      |
| 39  | `passiveNearMiss`             | Near Miss             | A ghost passing within 1 tile without catching you bumps the BONUS bar                                           | Bigger bump: 30 per pass instead of 15                                                                                                       |
| 40  | `passiveHaunting`             | Haunting              | The ghost that last caught you stays caged in the house for 10 seconds                                           | Caged for the rest of the level                                                                                                              |
| 41  | `passiveStreakEngine`         | Streak Engine         | Every 40-pellet streak fires your power-pellet effects                                                           | Each fire also grants 3 seconds of Ghost Proof                                                                                               |

## Decisions

- **Enhanced is one-time.** An upgrade is never offered an enhancement that it already has.
- **Swap carries enhancement.** Swapping away an enhanced upgrade gives an enhanced one back.
- **Enhanced replaces base.** The enhanced numbers above are the effect, not an add-on.
- **Fruit Power and Overcharge scale with enhanced upgrades.** Both read the owned effects, so enhanced timers flow through (Overcharge tripling included).
- **Not tripled by Overcharge:** Warp Farthest's 2s invulnerability.
- **Wall Pass** stays 6s (code value); [upgrades.md](./upgrades.md) saying 3s was a doc bug, now fixed.
- **Speed stacking is intended:** Afterburner × Speed Burst × the turn boost can reach about 2.8×. No cap.
- **Pickup Range** (2 tiles) still needs line of sight.
- **Base values that change for every run:** Ghost Slow ×0.8 (from ×0.75), Quarter Bounty (a Quarter replaces the bar charge), ghost tunnel speed 0.6× (from 0.5×).

## Store decisions

- **Tunnel Dash:** ghost tunnel speed 0.6× is global; enhanced Tunnel Dash makes it 0.3×.
- **Limited lives:** two separate life tiles, each sold once per visit (a bought tile disappears). Today's unlimited `L` slot becomes these two.
- **Enhancement tile:** picks one owned, unenhanced upgrade at random and swaps it for its enhanced version. No eligible upgrade means no tile. Only the first store omits it.
- **Visuals:** an enhanced upgrade's name gets a `+`; its store tile glows and has a different border color.

## Prices

Life 1 Quarter, new ability 3, trade 1, enhancement 2.
