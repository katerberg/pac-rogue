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

| #   | Id                           | Label               | Now                                                                                      | Enhanced                                                                                                    |
| --- | ---------------------------- | ------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | `powerPelletFreeze`          | Power Freeze        | Power pellet freezes the nearest ghost for 3s                                            | Freeze 5s                                                                                                   |
| 2   | `passivePlayerSpeedUp`       | Speed Up            | Player speed ×1.25                                                                       | Speed ×1.5                                                                                                  |
| 3   | `passiveGhostSlow`           | Ghost Slow          | Ghost speed ×0.75                                                                        | Ghost speed ×0.65. **Base also changes:** 0.75 → 0.8                                                        |
| 4   | `powerPelletScatterBurst`    | Scatter Burst       | Power pellet forces scatter for 3s                                                       | Scatter 5s                                                                                                  |
| 5   | `powerPelletGhostRecall`     | Ghost Recall        | Power pellet sends the nearest ghost back to the house                                   | Sends the nearest 2 ghosts home                                                                             |
| 6   | `powerPelletWarpTop`         | Warp Top            | Power pellet warps you to the top-middle                                                 | Warps to top-middle **and** grants 2s invulnerability                                                       |
| 7   | `passivePickupRange`         | Pickup Range        | Regular pellets within 1 tile are auto-collected (with line of sight)                    | Pickup range 2 tiles                                                                                        |
| 8   | `passiveGhostHouseDelay`     | House Delay         | +2s on Blinky/Pinky release, +15 dots on Clyde                                           | +3s on Blinky/Pinky release, +25 dots on Clyde                                                              |
| 9   | `passiveExtraLife`           | Extra Life          | +1 life now; regen floor 3 → 4                                                           | +1 more life (2 total) and regen floor 5                                                                    |
| 10  | `passivePelletToPower`       | Pellet Surge        | One regular pellet becomes a power pellet per board, and one on grant                    | 2 extra pellets per level                                                                                   |
| 11  | `powerPelletCollectThree`    | Triple Chomp        | Power pellet also eats 3 nearby pellets, not ahead of you                                | Eats 5 nearby pellets                                                                                       |
| 12  | `powerPelletWallPass`        | Wall Pass           | Power pellet: walk through walls (diagonals too) for `WALL_PASS_MS`                      | Walk through exterior walls too (carve your own tunnels), looping vertically and horizontally               |
| 13  | `powerPelletSpeedBurst`      | Speed Burst         | Power pellet gives ×1.25 speed for 3s                                                    | Speed ×1.5                                                                                                  |
| 14  | `powerPelletInvuln`          | Ghost Proof         | Power pellet: pass through ghosts for 3s                                                 | Invulnerable 5s                                                                                             |
| 15  | `powerPelletGhostHarvester`  | Ghost Harvester     | Power pellet: ghosts eat pellets for you for 5s                                          | Ghosts harvest for 8s                                                                                       |
| 16  | `fruitPowerPellet`           | Fruit Power         | Fruit triggers every owned power-pellet effect                                           | Fruit also turns a random regular pellet into a power pellet                                                |
| 17  | `fruitQuarterBounty`         | Quarter Bounty      | Fruit pays 2 Quarters instead of 1                                                       | **Base changes:** fruit pays +1 Quarter on top of the bonus-bar charge. Enhanced: +2 Quarters               |
| 18  | `fruitFecundity`             | Fruit Fecundity     | Fruit lasts 2× as long                                                                   | Fruit lasts until the level ends; uncollected fruit can sit side by side                                    |
| 19  | `fruitFeast`                 | Fruit Feast         | 3 fruit per level (60/130/200 pellets) instead of 2                                      | 4 fruit per level on a reasonable spread; still one at a time, so an uncollected fruit can block later ones |
| 20  | `passiveDeathsHarvest`       | Death's Harvest     | Getting caught harvests pellets within 6 tiles; an emptied board counts as a level clear | Harvest radius 10 tiles                                                                                     |
| 21  | `passiveOvercharge`          | Overcharge          | Doubles every other power-pellet timer                                                   | Triples every other timer                                                                                   |
| 22  | `passiveTunnelDash`          | Tunnel Dash         | Entering a tunnel band sweeps pellets and teleports you to the opposite mouth            | Ghost tunnel slowdown becomes even stronger than today's                                                    |
| 23  | `passivePowerPelletRecharge` | Second Chomp        | Eaten power pellets respawn after 10s                                                    | Respawn after 7s                                                                                            |
| 24  | `passiveRemoteTransference`  | Remote Transference | Every 5th pellet also eats the farthest one                                              | Every 3rd pellet                                                                                            |
| 25  | `passiveMyogenesis`          | Myogenesis          | Level-clear regen gives up to 2 lives instead of 1                                       | Level-clear regen refills to full lives                                                                     |
| 26  | `passiveDefyDeath`           | Defy Death          | Power pellet arms 5s where a catch costs no life                                         | Power pellet arms a defy that lasts 8s                                                                      |
| 27  | `passiveTurnTuning`          | Turn Tuning         | Turns can be tapped 2 tiles early; a perfect tap gives a 0.5s speed boost                | Perfect-tap boost lasts 0.75s; widened perfect-tap range                                                    |

## Clarifications needed

Grouped by what blocks the plan. A recommended answer is given where one is obvious.

**Numbers I could not infer**

- #3 Ghost Slow: "bump default one to 0.8s" reads as base ×0.75 → ×0.8 (a nerf to the base). Correct?
- #22 Tunnel Dash: ghost tunnel speed is a flat 0.5× player speed today. What value for enhanced (0.35×?), and is the dash itself unchanged?
- #27 Turn Tuning: perfect-tap range is 8px today. Widen to what (12px?). Is the ×1.25 boost multiplier unchanged?
- #19 Fruit Feast: spawn thresholds for 4 fruit. Today 60/130/200 for 3; suggest 45/100/150/200.

**Ambiguous wording**

- #10 Pellet Surge: "2 extra pellets per level" means 2 converted per board in total (base 1 → 2), or 1 + 2 = 3?
- #9 Extra Life: confirm the total is +2 lives and the regen floor 5, with the HUD showing 5 life icons.
- #26 Defy Death: "adds a defy that lasts 8s" is the same one-save window lengthened from 5s to 8s, or can several power pellets stack multiple saves?
- #25 Myogenesis: "full lives" is the regen floor (3, 4 with Extra Life, 5 enhanced) or the starting life count?
- #6 Warp Top: is the 2s invulnerability its own timer (separate from Ghost Proof) and does it show the Ghost Proof tint?
- #7 Pickup Range: does the 2-tile reach still need line of sight through walls?
- #16 Fruit Power: the extra power pellet converts once per fruit, on top of triggering owned power-pellet effects. Empty regular pool is a no-op?

**Feature size and interactions**

- #12 Wall Pass: carving "your own tunnels" through exterior walls needs vertical wrap and tunnel twin sprites on the top/bottom edges. Do ghosts ever use those holes, and does a tunnel stay open after the timer ends or snap you back in?
- #17 Quarter Bounty: fruit now charges the bonus bar (150, or a whole bar with Quarter Bounty, per [bonus.md](./bonus.md)). Does the new base (+1 Quarter) replace the whole-bar charge, or stack with it?
- #18 Fruit Fecundity: where do side-by-side fruit spawn (nearby free cells?), and does the base version keep today's 2× lifetime?
- #21 Overcharge: should it triple #6's new 2s invulnerability and #26's 8s defy window (today it never touches Defy Death)?
- #2 / #13 / #27: Speed Up 1.5 × Speed Burst 1.5 × turn boost 1.25 is about 2.8× player speed. Cap it, or intended?

**Still open from before**

- #16 Fruit Power / #21 Overcharge amplify other upgrades: should they scale with enhanced ones?
- Wall Pass: `WALL_PASS_MS` is 6000 in code but [upgrades.md](./upgrades.md) says 3000. Is enhanced duration unchanged?
- Can an upgrade be enhanced only once? Does enhanced replace the base effect or add to it?
- Does a swap keep or reset the enhanced state of the lost upgrade?
- Several base values change (#3, #17); these apply to unenhanced runs too.

## Follow-ups when implemented

- `UpgradeDef` gains an enhanced variant; the "Adding an upgrade" checklist in [upgrades.md](./upgrades.md#adding-an-upgrade) requires one for every new upgrade.
- LEARN page gets an enhanced on/off toggle for upgrades that have one ([learn.md](./learn.md)), done last.
